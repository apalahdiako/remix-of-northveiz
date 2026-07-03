import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useLiveBroadcaster } from "@/hooks/useLiveBroadcaster";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { toast } from "sonner";
import {
  Radio,
  Video,
  VideoOff,
  Mic,
  MicOff,
  RefreshCw,
  Square,
  Plus,
  X,
  Zap,
  Eye,
  Heart,
  Minimize2,
  Package,
  MessageSquare,
} from "lucide-react";
import LiveChatPanel from "@/components/live/LiveChatPanel";

interface Product {
  id: string;
  name: string;
  price: string;
  image: string | null;
  stock: number;
}

interface PinnedRow {
  id: string;
  product_id: string;
  is_flash: boolean;
  position: number;
  products: Product | null;
}

const LiveStreamStudio = () => {
  const { user } = useAuth();
  const [streamId, setStreamId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [starting, setStarting] = useState(false);
  const [pinned, setPinned] = useState<PinnedRow[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState("");
  const [meta, setMeta] = useState<{ viewer_count: number; like_count: number } | null>(null);
  const [minimized, setMinimized] = useState(false);
  const previewRef = useRef<HTMLVideoElement>(null);

  const { localStream, viewerCount, micOn, camOn, error, toggleMic, toggleCam, flipCamera, stop } =
    useLiveBroadcaster({ streamId, onEnded: () => setStreamId(null) });

  // Load an in-flight live stream owned by this admin
  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("live_streams")
        .select("id")
        .eq("admin_id", user.id)
        .eq("status", "live")
        .order("started_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (data) setStreamId(data.id);
    })();
  }, [user]);

  // Bind preview
  useEffect(() => {
    if (previewRef.current && localStream) {
      previewRef.current.srcObject = localStream;
      previewRef.current.play().catch(() => {});
    }
  }, [localStream]);

  // Prevent body scroll when fullscreen
  useEffect(() => {
    if (streamId && !minimized) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [streamId, minimized]);

  // Load products
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("products")
        .select("id, name, price, image, stock")
        .order("created_at", { ascending: false })
        .limit(50);
      setProducts((data as Product[]) ?? []);
    })();
  }, []);

  // Watch pinned + meta
  useEffect(() => {
    if (!streamId) {
      setPinned([]);
      setMeta(null);
      return;
    }
    const loadPinned = async () => {
      const { data } = await supabase
        .from("live_stream_products")
        .select("id, product_id, is_flash, position, products(id, name, price, image, stock)")
        .eq("stream_id", streamId)
        .order("position", { ascending: true });
      setPinned((data as unknown as PinnedRow[]) ?? []);
    };
    const loadMeta = async () => {
      const { data } = await supabase
        .from("live_streams")
        .select("viewer_count, like_count")
        .eq("id", streamId)
        .maybeSingle();
      if (data) setMeta(data as any);
    };
    loadPinned();
    loadMeta();
    const ch = supabase
      .channel(`studio:${streamId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "live_stream_products", filter: `stream_id=eq.${streamId}` },
        () => loadPinned()
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "live_streams", filter: `id=eq.${streamId}` },
        (p) => setMeta(p.new as any)
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [streamId]);

  const startStream = async () => {
    if (!user) return;
    if (!title.trim()) {
      toast.error("Isi judul siaran dulu");
      return;
    }
    setStarting(true);
    const { data, error } = await supabase
      .from("live_streams")
      .insert({ admin_id: user.id, title: title.trim(), status: "live" })
      .select("id")
      .single();
    setStarting(false);
    if (error || !data) {
      toast.error("Gagal memulai siaran: " + (error?.message || ""));
      return;
    }
    setStreamId(data.id);
    setMinimized(false);
    toast.success("Siaran dimulai!");
  };

  const endStream = async () => {
    await stop();
    toast.success("Siaran berakhir");
  };

  const pinProduct = async (p: Product) => {
    if (!streamId) return;
    if (pinned.find((r) => r.product_id === p.id)) return;
    await supabase.from("live_stream_products").insert({
      stream_id: streamId,
      product_id: p.id,
      position: pinned.length,
    });
  };

  const unpin = async (id: string) => {
    await supabase.from("live_stream_products").delete().eq("id", id);
  };

  const toggleFlash = async (row: PinnedRow) => {
    await supabase
      .from("live_stream_products")
      .update({ is_flash: !row.is_flash })
      .eq("id", row.id);
  };

  const filteredProducts = products.filter(
    (p) => p.name.toLowerCase().includes(search.toLowerCase()) && !pinned.find((r) => r.product_id === p.id)
  );

  // ============ NOT LIVE — start form ============
  if (!streamId) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Radio className="h-5 w-5 text-accent" /> Mulai Live Streaming
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="live-title">Judul Siaran</Label>
            <Input
              id="live-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Contoh: Flash Sale Weekend Drop!"
              maxLength={120}
            />
          </div>
          <Button onClick={startStream} disabled={starting} className="w-full">
            <Radio className="h-4 w-4 mr-2" />
            {starting ? "Memulai..." : "Mulai Siaran"}
          </Button>
          <p className="text-xs text-muted-foreground">
            Setelah dimulai, studio akan terbuka fullscreen seperti TikTok Live. Kamera & mikrofon akan diminta izin.
          </p>
        </CardContent>
      </Card>
    );
  }

  // ============ MINIMIZED — small resumer card ============
  if (minimized) {
    return (
      <Card className="border-accent/40">
        <CardContent className="p-4 flex items-center gap-3">
          <span className="flex items-center gap-1 bg-accent text-accent-foreground text-[10px] font-bold px-2 py-1 rounded-full uppercase">
            <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" /> Live
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">Siaran sedang berjalan</p>
            <p className="text-xs text-muted-foreground">
              {meta?.viewer_count ?? viewerCount} penonton · {meta?.like_count ?? 0} like
            </p>
          </div>
          <Button size="sm" onClick={() => setMinimized(false)}>Buka Studio</Button>
          <Button size="sm" variant="destructive" onClick={endStream}>
            <Square className="h-3.5 w-3.5" />
          </Button>
        </CardContent>
      </Card>
    );
  }

  // ============ FULLSCREEN STUDIO (portrait, TikTok-style) ============
  return (
    <div className="fixed inset-0 z-[100] bg-black text-white overflow-hidden animate-in fade-in duration-200">
      {/* Portrait stage — centered 9:16, fills viewport height */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="relative h-full aspect-[9/16] max-w-full bg-black overflow-hidden shadow-2xl">
          <video
            ref={previewRef}
            autoPlay
            playsInline
            muted
            className="absolute inset-0 w-full h-full object-cover"
          />
          {!localStream && !error && (
            <div className="absolute inset-0 grid place-items-center text-white/70 text-sm">
              Menunggu kamera...
            </div>
          )}
          {error && (
            <div className="absolute inset-0 grid place-items-center text-red-400 text-sm px-4 text-center">
              {error}
            </div>
          )}

          {/* Top bar */}
          <div className="absolute top-0 inset-x-0 p-3 flex items-center gap-2 bg-gradient-to-b from-black/80 to-transparent z-20">
            <span className="flex items-center gap-1 bg-accent text-accent-foreground text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider">
              <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" /> Live
            </span>
            <span className="flex items-center gap-1 bg-black/50 backdrop-blur text-xs px-2 py-1 rounded-full">
              <Eye className="h-3 w-3" /> {meta?.viewer_count ?? viewerCount}
            </span>
            <span className="flex items-center gap-1 bg-black/50 backdrop-blur text-xs px-2 py-1 rounded-full">
              <Heart className="h-3 w-3" /> {meta?.like_count ?? 0}
            </span>
            <div className="flex-1" />
            <button
              onClick={() => setMinimized(true)}
              className="h-9 w-9 grid place-items-center rounded-full bg-black/50 hover:bg-black/70"
              aria-label="Minimize"
              title="Kecilkan"
            >
              <Minimize2 className="h-4 w-4" />
            </button>
            <button
              onClick={endStream}
              className="h-9 px-3 rounded-full bg-red-600 hover:bg-red-500 text-xs font-semibold flex items-center gap-1"
              aria-label="End live"
            >
              <Square className="h-3.5 w-3.5" /> End
            </button>
          </div>

          {/* Pinned products strip — sits above chat */}
          {pinned.length > 0 && (
            <div className="absolute left-2 right-2 bottom-40 z-20 flex gap-2 overflow-x-auto scrollbar-thin pb-1">
              {pinned.slice(0, 6).map((row) => {
                const p = row.products;
                if (!p) return null;
                return (
                  <div
                    key={row.id}
                    className="shrink-0 flex items-center gap-2 bg-black/70 backdrop-blur border border-white/10 rounded-lg p-1.5 pr-2.5"
                  >
                    <img src={p.image || "/placeholder.svg"} alt={p.name} className="h-9 w-9 rounded object-cover" />
                    <div className="min-w-0">
                      <p className="text-[11px] leading-tight truncate max-w-[110px]">{p.name}</p>
                      <p className="text-[11px] text-accent font-semibold flex items-center gap-1">
                        {row.is_flash && <Zap className="h-2.5 w-2.5" />}
                        {p.price}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Chat overlay — bottom, translucent, TikTok-style */}
          <div className="absolute left-0 right-0 bottom-16 h-40 z-10 pointer-events-none">
            <div className="h-full mx-2 rounded-xl bg-gradient-to-t from-black/70 via-black/40 to-transparent pointer-events-auto overflow-hidden">
              <LiveChatPanel streamId={streamId} canModerate />
            </div>
          </div>

          {/* Bottom control rail */}
          <div className="absolute inset-x-0 bottom-2 z-30 flex items-center justify-center gap-2 px-3">
            <button
              onClick={toggleMic}
              className={`h-11 w-11 grid place-items-center rounded-full backdrop-blur transition ${
                micOn ? "bg-black/60 hover:bg-black/80" : "bg-red-600 hover:bg-red-500"
              }`}
              aria-label="Toggle mic"
            >
              {micOn ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
            </button>
            <button
              onClick={toggleCam}
              className={`h-11 w-11 grid place-items-center rounded-full backdrop-blur transition ${
                camOn ? "bg-black/60 hover:bg-black/80" : "bg-red-600 hover:bg-red-500"
              }`}
              aria-label="Toggle camera"
            >
              {camOn ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
            </button>
            <button
              onClick={flipCamera}
              className="h-11 w-11 grid place-items-center rounded-full bg-black/60 hover:bg-black/80 backdrop-blur"
              aria-label="Flip camera"
            >
              <RefreshCw className="h-5 w-5" />
            </button>

            <Sheet>
              <SheetTrigger asChild>
                <button
                  className="h-11 px-4 rounded-full bg-accent text-accent-foreground text-xs font-semibold flex items-center gap-1.5"
                  aria-label="Kelola produk"
                >
                  <Package className="h-4 w-4" /> Produk ({pinned.length})
                </button>
              </SheetTrigger>
              <SheetContent side="bottom" className="h-[80vh] bg-background text-foreground z-[110]">
                <SheetHeader>
                  <SheetTitle>Kelola Produk Live</SheetTitle>
                </SheetHeader>
                <div className="mt-4 space-y-4 overflow-y-auto max-h-[calc(80vh-6rem)] pr-1">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                      Produk Terpasang ({pinned.length})
                    </p>
                    {pinned.length === 0 ? (
                      <p className="text-xs text-muted-foreground">Belum ada produk.</p>
                    ) : (
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                        {pinned.map((row) => {
                          const p = row.products;
                          if (!p) return null;
                          return (
                            <div key={row.id} className="relative border rounded-lg p-2 flex gap-2">
                              <img
                                src={p.image || "/placeholder.svg"}
                                alt={p.name}
                                className="h-14 w-14 object-cover rounded"
                              />
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-medium line-clamp-2">{p.name}</p>
                                <p className="text-xs text-accent font-semibold">{p.price}</p>
                                <div className="flex gap-1 mt-1">
                                  <button
                                    onClick={() => toggleFlash(row)}
                                    className={`text-[10px] px-1.5 py-0.5 rounded border ${
                                      row.is_flash
                                        ? "bg-accent text-accent-foreground border-accent"
                                        : "border-muted-foreground/30"
                                    }`}
                                  >
                                    <Zap className="h-2.5 w-2.5 inline -mt-0.5" /> Flash
                                  </button>
                                  <button
                                    onClick={() => unpin(row.id)}
                                    className="text-[10px] px-1.5 py-0.5 rounded border border-destructive/40 text-destructive"
                                  >
                                    <X className="h-2.5 w-2.5 inline -mt-0.5" /> Hapus
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                      Tambah Produk
                    </p>
                    <Input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Cari produk..."
                      className="mb-2"
                    />
                    <div className="space-y-1">
                      {filteredProducts.slice(0, 30).map((p) => (
                        <button
                          key={p.id}
                          onClick={() => pinProduct(p)}
                          className="w-full flex items-center gap-2 p-1.5 hover:bg-accent/10 rounded text-left"
                        >
                          <img
                            src={p.image || "/placeholder.svg"}
                            alt={p.name}
                            className="h-8 w-8 object-cover rounded"
                          />
                          <span className="flex-1 text-xs truncate">{p.name}</span>
                          <span className="text-xs text-accent font-medium">{p.price}</span>
                          <Plus className="h-3.5 w-3.5 text-muted-foreground" />
                        </button>
                      ))}
                      {filteredProducts.length === 0 && (
                        <p className="text-xs text-muted-foreground text-center py-4">Tidak ada produk lain.</p>
                      )}
                    </div>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LiveStreamStudio;
