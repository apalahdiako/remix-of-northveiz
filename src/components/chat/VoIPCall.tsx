import { useState, useEffect, useRef, useCallback } from "react";
import { Phone, PhoneOff, Mic, MicOff, Mail } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { startRingtone, stopRingtone } from "@/lib/ringtone";

export type CallStatus = "idle" | "requesting" | "ringing" | "active" | "ended";

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

// ─── Hook ───
export function useVoIPCall(sessionId: string, role: "user" | "admin", onClose: () => void) {
  const [status, setStatus] = useState<CallStatus>("idle");
  const [duration, setDuration] = useState(0);
  const [muted, setMuted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const localStream = useRef<MediaStream | null>(null);
  const peerConnection = useRef<RTCPeerConnection | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const timerRef = useRef<number | null>(null);
  const callStartTime = useRef<number>(0);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);

  const cleanup = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    localStream.current?.getTracks().forEach((t) => t.stop());
    localStream.current = null;
    peerConnection.current?.close();
    peerConnection.current = null;
    if (channelRef.current) { supabase.removeChannel(channelRef.current); channelRef.current = null; }
  }, []);

  const logCall = useCallback(async (dur: number) => {
    await supabase.from("chat_messages").insert({
      session_id: sessionId,
      role,
      message_type: "call_log",
      content: `📞 Panggilan suara — ${formatDuration(dur)}`,
    });
  }, [sessionId, role]);

  const handleEndCall = useCallback(() => {
    const dur = Math.floor((Date.now() - callStartTime.current) / 1000);
    channelRef.current?.send({
      type: "broadcast",
      event: "call_signal",
      payload: { type: "CALL_ENDED", from: role },
    });
    cleanup();
    if (dur > 0 && callStartTime.current > 0) logCall(dur);
    setStatus("ended");
    setTimeout(onClose, 1500);
  }, [cleanup, logCall, onClose, role]);

  const createPeerConnection = useCallback(() => {
    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
      ],
    });

    pc.onicecandidate = (e) => {
      if (e.candidate) {
        channelRef.current?.send({
          type: "broadcast",
          event: "call_signal",
          payload: { type: "ICE_CANDIDATE", candidate: e.candidate.toJSON(), from: role },
        });
      }
    };

    pc.ontrack = (e) => {
      if (remoteAudioRef.current) {
        remoteAudioRef.current.srcObject = e.streams[0];
        remoteAudioRef.current.play().catch(() => {});
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "connected") {
        setStatus("active");
        callStartTime.current = Date.now();
        timerRef.current = window.setInterval(() => {
          setDuration(Math.floor((Date.now() - callStartTime.current) / 1000));
        }, 1000);
      }
      if (["disconnected", "failed", "closed"].includes(pc.connectionState)) {
        handleEndCall();
      }
    };

    localStream.current?.getTracks().forEach((track) => {
      pc.addTrack(track, localStream.current!);
    });

    peerConnection.current = pc;
    return pc;
  }, [handleEndCall, role]);

  const setupSignaling = useCallback(() => {
    if (channelRef.current) return;
    const channel = supabase.channel(`voip-${sessionId}`, {
      config: { broadcast: { self: false } },
    });

    channel.on("broadcast", { event: "call_signal" }, async ({ payload }) => {
      if (!payload || payload.from === role) return;

      switch (payload.type) {
        case "CALL_ACCEPTED": {
          if (role === "user" && localStream.current) {
            const pc = createPeerConnection();
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            channel.send({
              type: "broadcast",
              event: "call_signal",
              payload: { type: "SDP_OFFER", sdp: offer, from: "user" },
            });
          }
          break;
        }
        case "CALL_REJECTED": {
          setError("Panggilan ditolak oleh admin");
          cleanup();
          setStatus("ended");
          setTimeout(onClose, 2000);
          break;
        }
        case "CALL_ENDED": {
          cleanup();
          setStatus("ended");
          setTimeout(onClose, 1500);
          break;
        }
        case "SDP_OFFER": {
          if (role === "admin" && localStream.current) {
            const pc = createPeerConnection();
            await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            channel.send({
              type: "broadcast",
              event: "call_signal",
              payload: { type: "SDP_ANSWER", sdp: answer, from: "admin" },
            });
          }
          break;
        }
        case "SDP_ANSWER": {
          if (role === "user" && peerConnection.current) {
            await peerConnection.current.setRemoteDescription(
              new RTCSessionDescription(payload.sdp)
            );
          }
          break;
        }
        case "ICE_CANDIDATE": {
          if (peerConnection.current) {
            try {
              await peerConnection.current.addIceCandidate(new RTCIceCandidate(payload.candidate));
            } catch {}
          }
          break;
        }
      }
    });

    channel.subscribe();
    channelRef.current = channel;
  }, [sessionId, role, createPeerConnection, cleanup, onClose]);

  const initiateCall = useCallback(async () => {
    setStatus("requesting");
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      localStream.current = stream;
      setupSignaling();

      // Also notify admin on a global channel
      const notifyChannel = supabase.channel("admin-voip-listener");
      notifyChannel.subscribe((st) => {
        if (st === "SUBSCRIBED") {
          notifyChannel.send({
            type: "broadcast",
            event: "admin_call_notify",
            payload: { type: "CALL_INITIATED", sessionId },
          });
          setTimeout(() => supabase.removeChannel(notifyChannel), 2000);
        }
      });

      setStatus("ringing");
    } catch {
      setError("Izin mikrofon diperlukan. Aktifkan di pengaturan browser Anda.");
      setStatus("idle");
    }
  }, [setupSignaling, sessionId]);

  const acceptCall = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      localStream.current = stream;
      setupSignaling();

      // small delay to ensure channel is subscribed
      setTimeout(() => {
        channelRef.current?.send({
          type: "broadcast",
          event: "call_signal",
          payload: { type: "CALL_ACCEPTED", from: "admin" },
        });
      }, 500);
      setStatus("active");
    } catch {
      setError("Izin mikrofon diperlukan.");
    }
  }, [setupSignaling]);

  const rejectCall = useCallback(() => {
    setupSignaling();
    setTimeout(() => {
      channelRef.current?.send({
        type: "broadcast",
        event: "call_signal",
        payload: { type: "CALL_REJECTED", from: "admin" },
      });
      cleanup();
      onClose();
    }, 500);
  }, [setupSignaling, cleanup, onClose]);

  const toggleMute = useCallback(() => {
    if (localStream.current) {
      const t = localStream.current.getAudioTracks()[0];
      if (t) { t.enabled = !t.enabled; setMuted(!t.enabled); }
    }
  }, []);

  useEffect(() => { return cleanup; }, [cleanup]);

  return { status, duration, muted, error, initiateCall, acceptCall, rejectCall, handleEndCall, toggleMute, remoteAudioRef };
}

// ─── User Calling Overlay (Full screen, Shopee CS style) ───
export const UserCallingOverlay = ({ sessionId, onClose }: { sessionId: string; onClose: () => void }) => {
  const call = useVoIPCall(sessionId, "user", onClose);
  const started = useRef(false);

  useEffect(() => {
    if (!started.current) {
      started.current = true;
      call.initiateCall();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] bg-gradient-to-b from-gray-900 via-gray-800 to-black flex flex-col items-center justify-center"
      >
        <audio ref={call.remoteAudioRef} autoPlay className="hidden" />

        <p className="text-white/60 text-sm tracking-widest uppercase mb-6">
          {call.status === "requesting" && "Meminta izin..."}
          {call.status === "ringing" && "Menghubungi..."}
          {call.status === "active" && "Terhubung"}
          {call.status === "ended" && "Panggilan berakhir"}
        </p>

        <div className="relative mb-4">
          {(call.status === "ringing" || call.status === "active") && (
            <>
              <motion.div animate={{ scale: [1, 1.5], opacity: [0.4, 0] }} transition={{ duration: 1.5, repeat: Infinity }} className="absolute inset-0 rounded-full bg-green-500/30" />
              <motion.div animate={{ scale: [1, 1.3], opacity: [0.3, 0] }} transition={{ duration: 1.5, repeat: Infinity, delay: 0.3 }} className="absolute inset-0 rounded-full bg-green-500/20" />
            </>
          )}
          <div className="w-28 h-28 rounded-full bg-gradient-to-br from-gray-600 to-gray-700 flex items-center justify-center border-2 border-white/20">
            <span className="text-white text-3xl font-bold">CS</span>
          </div>
        </div>

        <h2 className="text-white text-xl font-semibold mb-1">NORTHVEIZ Support</h2>
        {call.status === "active" && (
          <p className="text-green-400 text-lg font-mono mb-8">{formatDuration(call.duration)}</p>
        )}
        {call.status === "ringing" && (
          <p className="text-white/40 text-sm mb-8">Menunggu admin menerima...</p>
        )}

        {call.error && (
          <div className="bg-red-500/20 border border-red-500/30 rounded-xl px-6 py-3 mb-6 max-w-[300px]">
            <p className="text-red-300 text-sm text-center">{call.error}</p>
          </div>
        )}

        <div className="flex items-center gap-6">
          {call.status === "active" && (
            <button onClick={call.toggleMute} className={`w-14 h-14 rounded-full flex items-center justify-center transition-colors ${call.muted ? "bg-red-500/30 text-red-400" : "bg-white/10 text-white"}`}>
              {call.muted ? <MicOff size={24} /> : <Mic size={24} />}
            </button>
          )}
          <button
            onClick={call.status === "idle" || call.status === "ended" ? onClose : call.handleEndCall}
            className="w-16 h-16 rounded-full bg-red-600 hover:bg-red-700 flex items-center justify-center text-white shadow-lg shadow-red-600/30 transition-colors"
          >
            <PhoneOff size={28} />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

// ─── Admin Incoming Call Notification ───
export const AdminIncomingCall = ({ sessionId, onAccept, onReject }: {
  sessionId: string; onAccept: () => void; onReject: () => void;
}) => (
  <motion.div
    initial={{ y: -100, opacity: 0 }}
    animate={{ y: 0, opacity: 1 }}
    exit={{ y: -100, opacity: 0 }}
    className="fixed top-4 right-4 z-[90] bg-gray-900/95 backdrop-blur-xl rounded-2xl p-5 shadow-2xl border border-white/10 min-w-[280px]"
  >
    <div className="flex items-center gap-3 mb-4">
      <motion.div animate={{ scale: [1, 1.1, 1] }} transition={{ duration: 1, repeat: Infinity }} className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center">
        <Phone className="text-green-400" size={22} />
      </motion.div>
      <div>
        <p className="text-white font-semibold text-sm">Panggilan Masuk</p>
        <p className="text-white/50 text-xs">User {sessionId.slice(0, 8)}</p>
      </div>
    </div>
    <div className="flex gap-3">
      <button onClick={onReject} className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-medium transition-colors">Tolak</button>
      <button onClick={onAccept} className="flex-1 py-2.5 rounded-xl bg-green-600 hover:bg-green-700 text-white text-sm font-medium transition-colors">Terima</button>
    </div>
  </motion.div>
);

// ─── Admin Active Call Mini-Bar ───
export const AdminCallBar = ({ duration, muted, onToggleMute, onEndCall }: {
  duration: number; muted: boolean; onToggleMute: () => void; onEndCall: () => void;
}) => (
  <div className="flex items-center justify-between px-4 py-2 bg-green-600 text-white text-sm">
    <div className="flex items-center gap-2">
      <Phone size={16} />
      <span className="font-mono">{formatDuration(duration)}</span>
      <span className="text-green-200">• Panggilan aktif</span>
    </div>
    <div className="flex items-center gap-2">
      <button onClick={onToggleMute} className={`p-1.5 rounded-full ${muted ? "bg-red-500/40" : "bg-white/20"} transition-colors`}>
        {muted ? <MicOff size={14} /> : <Mic size={14} />}
      </button>
      <button onClick={onEndCall} className="p-1.5 rounded-full bg-red-500/40 hover:bg-red-500/60 transition-colors">
        <PhoneOff size={14} />
      </button>
    </div>
  </div>
);

// ─── Hook for admin to listen for incoming calls ───
export function useIncomingCall() {
  const [incomingCall, setIncomingCall] = useState<{ sessionId: string } | null>(null);

  useEffect(() => {
    const channel = supabase.channel("admin-voip-listener", {
      config: { broadcast: { self: false } },
    });
    channel.on("broadcast", { event: "admin_call_notify" }, ({ payload }) => {
      if (payload?.type === "CALL_INITIATED") {
        setIncomingCall({ sessionId: payload.sessionId });
        setTimeout(() => setIncomingCall(null), 30000);
      }
    });
    channel.subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  return { incomingCall, dismiss: () => setIncomingCall(null) };
}
