import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useCart } from "@/hooks/useCart";
import { toast } from "sonner";
import { X, Zap } from "lucide-react";

interface Row {
  id: string;
  product_id: string;
  is_flash: boolean;
  position: number;
  products: {
    id: string;
    name: string;
    price: string;
    image: string | null;
    stock: number;
  } | null;
}

interface Props {
  streamId: string;
}

/** TikTok-style floating featured product card at the bottom of the video. */
const LiveFeaturedProduct = ({ streamId }: Props) => {
  const [rows, setRows] = useState<Row[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [countdown, setCountdown] = useState(157); // 02:37 vibe
  const { addItem } = useCart();
  const navigate = useNavigate();

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("live_stream_products")
        .select("id, product_id, is_flash, position, products(id, name, price, image, stock)")
        .eq("stream_id", streamId)
        .order("position", { ascending: true });
      setRows((data as unknown as Row[]) ?? []);
    };
    load();

    const ch = supabase
      .channel(`live_feat:${streamId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "live_stream_products", filter: `stream_id=eq.${streamId}` },
        () => load()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(ch);
    };
  }, [streamId]);

  useEffect(() => {
    const t = setInterval(() => setCountdown((c) => (c > 0 ? c - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, []);

  const featured = rows.find((r) => !dismissed.has(r.id) && r.products);
  if (!featured || !featured.products) return null;
  const p = featured.products;

  const mm = String(Math.floor(countdown / 60)).padStart(2, "0");
  const ss = String(countdown % 60).padStart(2, "0");

  const buy = () => {
    if (p.stock <= 0) {
      toast.error("Stok habis");
      return;
    }
    addItem({
      id: p.id,
      name: p.name,
      price: parseFloat(p.price.replace(/[^0-9]/g, "")) || 0,
      image: p.image || "/placeholder.svg",
      size: "M",
    });
    navigate("/checkout");
  };

  return (
    <div className="absolute left-2 right-2 bottom-[92px] z-20 flex justify-start pointer-events-none">
      <div className="relative flex items-stretch gap-2 bg-white text-black rounded-xl shadow-2xl overflow-hidden max-w-[92%] pointer-events-auto animate-in slide-in-from-bottom-2 duration-300">
        {/* Thumbnail with countdown badge */}
        <div className="relative w-[72px] h-[72px] shrink-0 bg-muted">
          <img src={p.image || "/placeholder.svg"} alt={p.name} className="w-full h-full object-cover" />
          {featured.is_flash && (
            <div className="absolute top-1 left-1 flex items-center gap-0.5 bg-accent text-accent-foreground text-[10px] font-bold px-1.5 py-0.5 rounded">
              <Zap className="h-2.5 w-2.5" /> {mm}:{ss}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0 py-1.5 pr-2 flex flex-col justify-center">
          <div className="flex items-center gap-1">
            <span className="text-[9.5px] font-bold bg-accent text-accent-foreground px-1 rounded">7.7</span>
            <p className="text-[12px] font-medium truncate">{p.name}</p>
          </div>
          <div className="mt-0.5 flex items-baseline gap-1.5">
            <span className="text-accent text-sm font-bold">{p.price}</span>
          </div>
        </div>

        {/* Buy button */}
        <button
          onClick={buy}
          className="self-stretch px-4 my-1.5 mr-1.5 rounded-full bg-accent text-accent-foreground text-xs font-bold shrink-0"
        >
          Beli
        </button>

        {/* Dismiss */}
        <button
          onClick={() => setDismissed((s) => new Set(s).add(featured.id))}
          className="absolute top-1 right-1 h-4 w-4 grid place-items-center rounded-full bg-black/10 text-black/60"
          aria-label="Tutup"
        >
          <X className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
};

export default LiveFeaturedProduct;
