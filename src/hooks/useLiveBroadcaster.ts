import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const ICE_SERVERS: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
];

type SignalPayload =
  | { type: "viewer-join"; viewerId: string }
  | { type: "answer"; viewerId: string; sdp: RTCSessionDescriptionInit }
  | { type: "ice"; viewerId: string; from: "viewer"; candidate: RTCIceCandidateInit }
  | { type: "viewer-leave"; viewerId: string };

interface Options {
  streamId: string | null;
  onEnded?: () => void;
}

/** Admin/broadcaster side: mesh-broadcasts local media to each viewer via WebRTC. */
export function useLiveBroadcaster({ streamId, onEnded }: Options) {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [viewerCount, setViewerCount] = useState(0);
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");
  const [error, setError] = useState<string | null>(null);

  const peersRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);

  // Acquire local media
  useEffect(() => {
    if (!streamId) return;
    let cancelled = false;
    (async () => {
      try {
        const media = await navigator.mediaDevices.getUserMedia({
          video: { facingMode, width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: true,
        });
        if (cancelled) {
          media.getTracks().forEach((t) => t.stop());
          return;
        }
        localStreamRef.current = media;
        setLocalStream(media);
      } catch (err: any) {
        setError(err?.message || "Tidak bisa mengakses kamera / mikrofon");
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [streamId, facingMode]);

  // Signaling channel
  useEffect(() => {
    if (!streamId || !localStream) return;
    const channel = supabase.channel(`live:${streamId}`, {
      config: { broadcast: { self: false }, presence: { key: "broadcaster" } },
    });
    channelRef.current = channel;

    const sendTo = (viewerId: string, event: string, payload: any) =>
      channel.send({ type: "broadcast", event, payload: { viewerId, ...payload } });

    const createPeerForViewer = async (viewerId: string) => {
      // Close previous if reconnecting
      const existing = peersRef.current.get(viewerId);
      if (existing) existing.close();

      const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
      peersRef.current.set(viewerId, pc);

      localStream.getTracks().forEach((t) => pc.addTrack(t, localStream));

      pc.onicecandidate = (e) => {
        if (e.candidate) {
          sendTo(viewerId, "ice", { from: "broadcaster", candidate: e.candidate.toJSON() });
        }
      };
      pc.onconnectionstatechange = () => {
        if (["failed", "closed", "disconnected"].includes(pc.connectionState)) {
          pc.close();
          peersRef.current.delete(viewerId);
          setViewerCount(peersRef.current.size);
        }
      };

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      sendTo(viewerId, "offer", { sdp: pc.localDescription });
      setViewerCount(peersRef.current.size);
    };

    channel.on("broadcast", { event: "viewer-join" }, async ({ payload }) => {
      const p = payload as SignalPayload;
      if (p.type !== "viewer-join") return;
      try {
        await createPeerForViewer(p.viewerId);
      } catch (err) {
        console.error("createPeer failed", err);
      }
    });

    channel.on("broadcast", { event: "answer" }, async ({ payload }) => {
      const p = payload as SignalPayload;
      if (p.type !== "answer") return;
      const pc = peersRef.current.get(p.viewerId);
      if (!pc) return;
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(p.sdp));
      } catch (err) {
        console.error("setRemoteDescription answer", err);
      }
    });

    channel.on("broadcast", { event: "ice" }, async ({ payload }) => {
      const p = payload as SignalPayload;
      if (p.type !== "ice" || p.from !== "viewer") return;
      const pc = peersRef.current.get(p.viewerId);
      if (!pc) return;
      try {
        await pc.addIceCandidate(new RTCIceCandidate(p.candidate));
      } catch (err) {
        console.error("addIceCandidate viewer", err);
      }
    });

    channel.on("broadcast", { event: "viewer-leave" }, ({ payload }) => {
      const p = payload as SignalPayload;
      if (p.type !== "viewer-leave") return;
      const pc = peersRef.current.get(p.viewerId);
      if (pc) {
        pc.close();
        peersRef.current.delete(p.viewerId);
        setViewerCount(peersRef.current.size);
      }
    });

    channel.subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        await channel.track({ role: "broadcaster", ts: Date.now() });
        // Announce readiness so already-waiting viewers can retry
        channel.send({ type: "broadcast", event: "broadcaster-ready", payload: {} });
      }
    });

    // Periodically sync viewer count to DB
    const interval = setInterval(() => {
      const c = peersRef.current.size;
      supabase.rpc("set_live_viewer_count", { p_stream_id: streamId, p_count: c });
    }, 5000);

    return () => {
      clearInterval(interval);
      peersRef.current.forEach((pc) => pc.close());
      peersRef.current.clear();
      supabase.removeChannel(channel);
      channelRef.current = null;
      setViewerCount(0);
    };
  }, [streamId, localStream]);

  const toggleMic = useCallback(() => {
    const s = localStreamRef.current;
    if (!s) return;
    s.getAudioTracks().forEach((t) => (t.enabled = !t.enabled));
    setMicOn((v) => !v);
  }, []);

  const toggleCam = useCallback(() => {
    const s = localStreamRef.current;
    if (!s) return;
    s.getVideoTracks().forEach((t) => (t.enabled = !t.enabled));
    setCamOn((v) => !v);
  }, []);

  const flipCamera = useCallback(() => {
    setFacingMode((f) => (f === "user" ? "environment" : "user"));
  }, []);

  const stop = useCallback(async () => {
    channelRef.current?.send({ type: "broadcast", event: "stream-ended", payload: {} });
    peersRef.current.forEach((pc) => pc.close());
    peersRef.current.clear();
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;
    setLocalStream(null);
    if (streamId) {
      await supabase
        .from("live_streams")
        .update({ status: "ended", ended_at: new Date().toISOString(), viewer_count: 0 })
        .eq("id", streamId);
    }
    onEnded?.();
  }, [streamId, onEnded]);

  return {
    localStream,
    viewerCount,
    micOn,
    camOn,
    error,
    toggleMic,
    toggleCam,
    flipCamera,
    stop,
  };
}
