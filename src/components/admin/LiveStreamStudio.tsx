import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useLiveBroadcaster } from "@/hooks/useLiveBroadcaster";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  Users,
  Eye,
  Heart,
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

  // Load products for pinning
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
            Kamera & mikrofon akan diminta izinnya setelah siaran dimulai. Siaran hanya bisa dilakukan oleh admin dan
            langsung tampil di halaman utama.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {/* Preview + controls */}
      <Card className="lg:col-span-2">
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="flex items-center gap-2">
            <span className="flex items-center gap-1 bg-accent text-accent-foreground text-[10px] font-bold px-2 py-1 rounded-full uppercase">
              <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" /> Live
            </span>
            <span className="text-sm">Broadcast Studio</span>
          </CardTitle>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Eye className="h-3.5 w-3.5" /> {meta?.viewer_count ?? viewerCount}
            </span>
            <span className="flex items-center gap-1">
              <Heart className="h-3.5 w-3.5" /> {meta?.like_count ?? 0}
            </span>
            <span className="flex items-center gap-1">
              <Users className="h-3.5 w-3.5" /> {viewerCount} peer
            </span>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
            <video ref={previewRef} autoPlay playsInline muted className="w-full h-full object-cover" />
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
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant={micOn ? "secondary" : "destructive"} size="sm" onClick={toggleMic}>
              {micOn ? <Mic className="h-4 w-4 mr-1" /> : <MicOff className="h-4 w-4 mr-1" />}
              {micOn ? "Mic On" : "Mic Off"}
            </Button>
            <Button variant={camOn ? "secondary" : "destructive"} size="sm" onClick={toggleCam}>
              {camOn ? <Video className="h-4 w-4 mr-1" /> : <VideoOff className="h-4 w-4 mr-1" />}
              {camOn ? "Camera On" : "Camera Off"}
            </Button>
            <Button variant="secondary" size="sm" onClick={flipCamera}>
              <RefreshCw className="h-4 w-4 mr-1" /> Flip
            </Button>
            <Button variant="destructive" size="sm" onClick={endStream} className="ml-auto">
              <Square className="h-4 w-4 mr-1" /> End Live
            </Button>
          </div>

          {/* Pinned */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
              Produk Terpasang ({pinned.length})
            </p>
            {pinned.length === 0 ? (
              <p className="text-xs text-muted-foreground">Belum ada produk. Tambahkan dari daftar di kanan.</p>
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

          {/* Product picker */}
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
            <div className="max-h-56 overflow-y-auto space-y-1">
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
        </CardContent>
      </Card>

      {/* Chat + moderasi */}
      <Card className="flex flex-col min-h-[500px]">
        <CardHeader>
          <CardTitle className="text-sm">Live Chat & Moderasi</CardTitle>
        </CardHeader>
        <CardContent className="flex-1 min-h-0 p-0 bg-black rounded-b-lg overflow-hidden">
          <LiveChatPanel streamId={streamId} canModerate />
        </CardContent>
      </Card>
    </div>
  );
};

export default LiveStreamStudio;
