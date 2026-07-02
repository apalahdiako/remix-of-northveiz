import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const ICE_SERVERS: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
];

/** Viewer side WebRTC: connects to broadcaster and receives remote MediaStream. */
export function useLiveViewer(streamId: string | null) {
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [connected, setConnected] = useState(false);
  const [ended, setEnded] = useState(false);
  const viewerIdRef = useRef<string>(
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2)
  );
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    if (!streamId) return;
    setEnded(false);
    const viewerId = viewerIdRef.current;
    const channel = supabase.channel(`live:${streamId}`, {
      config: { broadcast: { self: false } },
    });
    channelRef.current = channel;

    const sendJoin = () =>
      channel.send({ type: "broadcast", event: "viewer-join", payload: { type: "viewer-join", viewerId } });

    channel.on("broadcast", { event: "offer" }, async ({ payload }) => {
      if (payload?.viewerId !== viewerId) return;
      try {
        const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
        pcRef.current = pc;

        const remote = new MediaStream();
        setRemoteStream(remote);
        pc.ontrack = (e) => {
          e.streams[0]?.getTracks().forEach((t) => remote.addTrack(t));
        };
        pc.onicecandidate = (e) => {
          if (e.candidate) {
            channel.send({
              type: "broadcast",
              event: "ice",
              payload: { type: "ice", viewerId, from: "viewer", candidate: e.candidate.toJSON() },
            });
          }
        };
        pc.onconnectionstatechange = () => {
          if (pc.connectionState === "connected") setConnected(true);
          if (["failed", "disconnected", "closed"].includes(pc.connectionState)) setConnected(false);
        };

        await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        channel.send({
          type: "broadcast",
          event: "answer",
          payload: { type: "answer", viewerId, sdp: pc.localDescription },
        });
      } catch (err) {
        console.error("viewer offer handling failed", err);
      }
    });

    channel.on("broadcast", { event: "ice" }, async ({ payload }) => {
      if (payload?.viewerId !== viewerId || payload?.from !== "broadcaster") return;
      try {
        await pcRef.current?.addIceCandidate(new RTCIceCandidate(payload.candidate));
      } catch (err) {
        console.error("viewer ice", err);
      }
    });

    channel.on("broadcast", { event: "broadcaster-ready" }, () => {
      sendJoin();
    });

    channel.on("broadcast", { event: "stream-ended" }, () => {
      setEnded(true);
      setConnected(false);
      pcRef.current?.close();
      pcRef.current = null;
    });

    channel.subscribe((status) => {
      if (status === "SUBSCRIBED") sendJoin();
    });

    return () => {
      channel.send({
        type: "broadcast",
        event: "viewer-leave",
        payload: { type: "viewer-leave", viewerId },
      });
      pcRef.current?.close();
      pcRef.current = null;
      supabase.removeChannel(channel);
      channelRef.current = null;
      setRemoteStream(null);
      setConnected(false);
    };
  }, [streamId]);

  return { remoteStream, connected, ended };
}
