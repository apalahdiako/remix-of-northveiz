import { useEffect, useRef, useState } from "react";
import { X, Heart, Share2, ChevronDown, ShoppingBag, Gift, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useLiveViewer } from "@/hooks/useLiveViewer";
import type { LiveStream } from "@/hooks/useLiveStream";
import LiveChatFeed from "./LiveChatFeed";
import LiveChatInput from "./LiveChatInput";
import LiveFeaturedProduct from "./LiveFeaturedProduct";
import LiveProductSheet from "./LiveProductSheet";
import LikeBurst from "./LikeBurst";
import { toast } from "sonner";

interface Props {
  stream: LiveStream;
  onClose: () => void;
}

const formatCount = (n: number) => {
  if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, "") + "K";
  return String(n);
};

const LiveViewerOverlay = ({ stream, onClose }: Props) => {
  const { user } = useAuth();
  const videoRef = useRef<HTMLVideoElement>(null);
  const { remoteStream, connected, ended } = useLiveViewer(stream.id);
  const [likeTrigger, setLikeTrigger] = useState(0);
  const [likeCount, setLikeCount] = useState(stream.like_count);
  const [viewerCount, setViewerCount] = useState(stream.viewer_count);
  const [hasLiked, setHasLiked] = useState(false);
  const [pinnedCount, setPinnedCount] = useState(0);
  const [showProducts, setShowProducts] = useState(false);
  const [following, setFollowing] = useState(false);

  useEffect(() => {
    if (videoRef.current && remoteStream) {
      videoRef.current.srcObject = remoteStream;
      videoRef.current.play().catch(() => {});
    }
  }, [remoteStream]);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  // Live meta subscription
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

  // Pinned count
  useEffect(() => {
    const load = async () => {
      const { count } = await supabase
        .from("live_stream_products")
        .select("id", { count: "exact", head: true })
        .eq("stream_id", stream.id);
      setPinnedCount(count ?? 0);
    };
    load();
    const ch = supabase
      .channel(`live_pcount:${stream.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "live_stream_products", filter: `stream_id=eq.${stream.id}` },
        () => load()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [stream.id]);

  const like = async () => {
    setLikeTrigger((v) => v + 1);
    if (hasLiked) return;
    if (!user) return toast.info("Login untuk memberi like");
    setHasLiked(true);
    const { error } = await supabase.rpc("increment_live_like", { p_stream_id: stream.id });
    if (error) setHasLiked(false);
  };

  const share = async () => {
    const url = `${window.location.origin}/?live=${stream.id}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: stream.title, url });
      } else {
        await navigator.clipboard.writeText(url);
        toast.success("Link disalin");
      }
    } catch {
      /* cancel */
    }
  };

  const sendRose = async () => {
    if (!user) return toast.info("Login untuk mengirim gift");
    const name =
      (user.user_metadata as any)?.full_name ||
      user.email?.split("@")[0] ||
      "User";
    await supabase.from("live_stream_messages").insert({
      stream_id: stream.id,
      user_id: user.id,
      display_name: name,
      content: `mengirim 🌹`,
      type: "gift",
    });
    setLikeTrigger((v) => v + 1);
  };

  const streamerInitial = "N";

  return (
    <div className="fixed inset-0 z-[100] bg-black text-white overflow-hidden animate-in fade-in duration-200">
      {/* Portrait stage — 9:16 centered */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="relative h-full aspect-[9/16] max-w-full bg-black overflow-hidden">
          {/* Video */}
          <video
            ref={videoRef}
            autoPlay
            playsInline
            className="absolute inset-0 w-full h-full object-cover"
          />

          {/* Connection states */}
          {!connected && !ended && (
            <div className="absolute inset-0 grid place-items-center bg-black/70 z-10">
              <div className="text-center">
                <div className="mx-auto h-12 w-12 border-4 border-white/20 border-t-accent rounded-full animate-spin" />
                <p className="mt-4 text-sm text-white/70">Menyambungkan ke siaran...</p>
              </div>
            </div>
          )}
          {ended && (
            <div className="absolute inset-0 grid place-items-center bg-black/85 z-30">
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

          {/* Top gradient scrim */}
          <div className="absolute top-0 inset-x-0 h-40 bg-gradient-to-b from-black/70 via-black/30 to-transparent pointer-events-none z-10" />

          {/* Bottom gradient scrim */}
          <div className="absolute bottom-0 inset-x-0 h-72 bg-gradient-to-t from-black/85 via-black/40 to-transparent pointer-events-none z-10" />

          {/* ============ TOP BAR ============ */}
          <div className="absolute top-0 inset-x-0 p-3 z-30 flex items-start gap-2">
            {/* Streamer chip */}
            <div className="flex items-center gap-2 bg-black/45 backdrop-blur rounded-full pr-3 pl-1 py-1">
              <div className="h-8 w-8 rounded-full bg-gradient-to-br from-accent to-pink-500 grid place-items-center text-xs font-bold ring-2 ring-white/20">
                {streamerInitial}
              </div>
              <div className="min-w-0">
                <p className="text-[12px] font-semibold leading-none truncate max-w-[110px]">NORTHVEIZ</p>
                <p className="text-[10px] leading-tight text-white/70 flex items-center gap-1 mt-0.5">
                  <Heart className="h-2.5 w-2.5 fill-white/70" /> {formatCount(likeCount)}
                </p>
              </div>
              <button
                onClick={() => setFollowing((v) => !v)}
                className={`ml-1 h-7 px-2.5 rounded-full text-[11px] font-bold transition ${
                  following
                    ? "bg-white/15 text-white"
                    : "bg-accent text-accent-foreground"
                }`}
              >
                {following ? "Diikuti" : "+ Ikuti"}
              </button>
            </div>

            <div className="flex-1" />

            {/* Viewer count */}
            <div className="flex items-center gap-1 bg-black/45 backdrop-blur rounded-full pl-1 pr-2.5 py-1">
              <div className="h-6 w-6 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 grid place-items-center text-[10px] font-bold">
                {formatCount(viewerCount).slice(0, 1)}
              </div>
              <span className="text-[12px] font-semibold">{formatCount(viewerCount)}</span>
            </div>

            <button
              onClick={onClose}
              className="h-8 w-8 grid place-items-center rounded-full bg-black/45 backdrop-blur hover:bg-black/70"
              aria-label="Kecilkan"
            >
              <ChevronDown className="h-4 w-4" />
            </button>
            <button
              onClick={onClose}
              className="h-8 w-8 grid place-items-center rounded-full bg-black/45 backdrop-blur hover:bg-black/70"
              aria-label="Tutup"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Sub top chips (rankings / topic) */}
          <div className="absolute top-16 inset-x-0 px-3 z-20 flex items-center justify-between gap-2 pointer-events-none">
            <div className="flex items-center gap-1.5 bg-black/45 backdrop-blur rounded-full pl-1.5 pr-3 py-1 text-[11px] font-medium pointer-events-auto">
              <ShoppingBag className="h-3 w-3 text-amber-300" />
              Peringkat Belanja
            </div>
            <div className="flex items-center gap-1 bg-black/45 backdrop-blur rounded-full px-3 py-1 text-[11px] font-medium truncate max-w-[45%] pointer-events-auto">
              {stream.title}
            </div>
          </div>

          {/* ============ CHAT FEED (bottom-left, above bottom bar) ============ */}
          <div className="absolute left-2 right-24 bottom-[168px] h-[38%] z-20">
            <LiveChatFeed streamId={stream.id} />
          </div>

          {/* ============ RIGHT ACTION RAIL (like burst area) ============ */}
          <LikeBurst trigger={likeTrigger} />

          {/* ============ FEATURED PRODUCT CARD ============ */}
          <LiveFeaturedProduct streamId={stream.id} />

          {/* ============ BOTTOM ACTION BAR ============ */}
          <div className="absolute inset-x-0 bottom-0 z-30 px-2.5 pb-3 pt-2 flex items-center gap-2">
            {/* Cart / product bag */}
            <button
              onClick={() => setShowProducts(true)}
              className="relative h-11 w-11 grid place-items-center rounded-full bg-white/12 backdrop-blur-md shrink-0"
              aria-label="Produk"
            >
              <ShoppingBag className="h-5 w-5 text-amber-300" />
              {pinnedCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 bg-accent text-accent-foreground text-[9.5px] font-bold rounded-full min-w-[18px] h-[18px] px-1 grid place-items-center">
                  {pinnedCount > 99 ? "99+" : pinnedCount}
                </span>
              )}
            </button>

            {/* Chat input pill */}
            <LiveChatInput streamId={stream.id} compact />

            {/* Viewers */}
            <button
              className="h-11 w-11 grid place-items-center rounded-full bg-white/12 backdrop-blur-md shrink-0"
              aria-label="Penonton"
              onClick={() => toast.info(`${viewerCount} penonton menonton`)}
            >
              <Users className="h-5 w-5" />
            </button>

            {/* Rose gift */}
            <button
              onClick={sendRose}
              className="h-11 w-11 grid place-items-center rounded-full bg-white/12 backdrop-blur-md shrink-0 text-lg"
              aria-label="Kirim mawar"
            >
              🌹
            </button>

            {/* Gift box */}
            <button
              onClick={sendRose}
              className="h-11 w-11 grid place-items-center rounded-full bg-pink-500/90 shrink-0"
              aria-label="Gift"
            >
              <Gift className="h-5 w-5" />
            </button>

            {/* Like heart */}
            <button
              onClick={like}
              className="h-11 w-11 grid place-items-center rounded-full bg-white/12 backdrop-blur-md shrink-0"
              aria-label="Like"
            >
              <Heart className={`h-5 w-5 ${hasLiked ? "fill-red-500 text-red-500" : "text-white"}`} />
            </button>

            {/* Share */}
            <button
              onClick={share}
              className="h-11 w-11 grid place-items-center rounded-full bg-white/12 backdrop-blur-md shrink-0"
              aria-label="Bagikan"
            >
              <Share2 className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      {showProducts && <LiveProductSheet streamId={stream.id} onClose={() => setShowProducts(false)} />}
    </div>
  );
};

export default LiveViewerOverlay;
