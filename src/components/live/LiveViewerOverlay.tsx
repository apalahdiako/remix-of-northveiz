import { useEffect, useRef, useState } from "react";
import { X, Heart, Share2, Users, Eye } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useLiveViewer } from "@/hooks/useLiveViewer";
import type { LiveStream } from "@/hooks/useLiveStream";
import LiveChatPanel from "./LiveChatPanel";
import LiveProductRail from "./LiveProductRail";
import LikeBurst from "./LikeBurst";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

interface Props {
  stream: LiveStream;
  onClose: () => void;
}

const LiveViewerOverlay = ({ stream, onClose }: Props) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const { remoteStream, connected, ended } = useLiveViewer(stream.id);
  const [likeTrigger, setLikeTrigger] = useState(0);
  const [likeCount, setLikeCount] = useState(stream.like_count);
  const [viewerCount, setViewerCount] = useState(stream.viewer_count);
  const [hasLiked, setHasLiked] = useState(false);

  // Attach stream to <video>
  useEffect(() => {
    if (videoRef.current && remoteStream) {
      videoRef.current.srcObject = remoteStream;
      videoRef.current.play().catch(() => {
        /* autoplay policy - user must tap */
      });
    }
  }, [remoteStream]);

  // Live subscribe to counters
  useEffect(() => {
    const ch = supabase
      .channel(`live_meta:${stream.id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "live_streams", filter: `id=eq.${stream.id}` },
        (payload) => {
          const s = payload.new as LiveStream;
          setLikeCount(s.like_count);
          setViewerCount(s.viewer_count);
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [stream.id]);

  const like = async () => {
    setLikeTrigger((v) => v + 1);
    if (hasLiked) {
      // still animate but don't call RPC
      return;
    }
    if (!user) {
      toast.info("Login untuk memberi like");
      return;
    }
    setHasLiked(true);
    const { error } = await supabase.rpc("increment_live_like", { p_stream_id: stream.id });
    if (error) {
      setHasLiked(false);
    }
  };

  const share = async () => {
    const url = `${window.location.origin}/?live=${stream.id}`;
    const shareData = { title: stream.title, text: "Tonton siaran langsung NORTHVEIZ", url };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(url);
        toast.success("Link disalin");
      }
    } catch {
      /* user cancelled */
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black text-white flex flex-col md:flex-row overflow-hidden animate-in fade-in duration-200">
      {/* Video area */}
      <div className="relative flex-1 min-h-0 flex flex-col">
        <div className="relative flex-1 bg-black">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted={false}
            className="absolute inset-0 w-full h-full object-contain md:object-cover"
          />

          {!connected && !ended && (
            <div className="absolute inset-0 grid place-items-center bg-black/70">
              <div className="text-center">
                <div className="mx-auto h-12 w-12 border-4 border-white/20 border-t-accent rounded-full animate-spin" />
                <p className="mt-4 text-sm text-white/70">Menyambungkan ke siaran...</p>
              </div>
            </div>
          )}
          {ended && (
            <div className="absolute inset-0 grid place-items-center bg-black/85">
              <div className="text-center">
                <p className="text-xl font-bold">Siaran telah berakhir</p>
                <button
                  onClick={onClose}
                  className="mt-4 px-6 py-2 bg-accent text-accent-foreground rounded-full text-sm font-semibold"
                >
                  Tutup
                </button>
              </div>
            </div>
          )}

          {/* Top bar */}
          <div className="absolute top-0 inset-x-0 p-3 flex items-center gap-2 bg-gradient-to-b from-black/70 to-transparent">
            <span className="flex items-center gap-1 bg-accent text-accent-foreground text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider">
              <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" /> Live
            </span>
            <span className="flex items-center gap-1 bg-black/50 backdrop-blur text-xs px-2 py-1 rounded-full">
              <Eye className="h-3 w-3" /> {viewerCount}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate">{stream.title}</p>
            </div>
            <button
              onClick={onClose}
              className="h-9 w-9 grid place-items-center rounded-full bg-black/50 hover:bg-black/70"
              aria-label="Tutup"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Bottom-right action rail */}
          <div className="absolute right-3 bottom-3 flex flex-col items-center gap-3 z-10">
            <button
              onClick={like}
              className="h-11 w-11 grid place-items-center rounded-full bg-black/50 backdrop-blur hover:bg-accent/80 transition"
              aria-label="Like"
            >
              <Heart
                className={`h-5 w-5 ${hasLiked ? "fill-accent text-accent" : "text-white"}`}
              />
            </button>
            <span className="text-[11px] font-medium -mt-2">{likeCount}</span>
            <button
              onClick={share}
              className="h-11 w-11 grid place-items-center rounded-full bg-black/50 backdrop-blur hover:bg-white/20 transition"
              aria-label="Bagikan"
            >
              <Share2 className="h-5 w-5" />
            </button>
          </div>

          <LikeBurst trigger={likeTrigger} />
        </div>

        {/* Product rail */}
        <LiveProductRail streamId={stream.id} />
      </div>

      {/* Chat panel - side on desktop, drawer on mobile */}
      <aside className="md:w-96 md:border-l border-white/10 bg-black/85 md:bg-black flex flex-col h-64 md:h-auto shrink-0">
        <div className="hidden md:flex items-center gap-2 p-3 border-b border-white/10">
          <Users className="h-4 w-4" />
          <span className="text-sm font-semibold">Live Chat</span>
        </div>
        <LiveChatPanel streamId={stream.id} />
      </aside>
    </div>
  );
};

export default LiveViewerOverlay;
