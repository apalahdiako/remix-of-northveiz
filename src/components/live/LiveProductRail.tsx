import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useCart } from "@/hooks/useCart";
import { toast } from "sonner";
import { ShoppingBag, Zap } from "lucide-react";

interface Row {
  id: string;
  product_id: string;
  is_flash: boolean;
  position: number;
  products: {
    id: string;
    name: string;
    price: string;
    image_url: string | null;
    stock: number;
  } | null;
}

interface Props {
  streamId: string;
}

const LiveProductRail = ({ streamId }: Props) => {
  const [rows, setRows] = useState<Row[]>([]);
  const { addItem } = useCart();
  const navigate = useNavigate();

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("live_stream_products")
        .select("id, product_id, is_flash, position, products(id, name, price, image_url, stock)")
        .eq("stream_id", streamId)
        .order("position", { ascending: true });
      setRows((data as unknown as Row[]) ?? []);
    };
    load();

    const ch = supabase
      .channel(`live_prod:${streamId}`)
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

  const buildItem = (p: NonNullable<Row["products"]>) => ({
    id: p.id,
    name: p.name,
    price: parseFloat(p.price.replace(/[^0-9]/g, "")) || 0,
    image: p.image_url || "/placeholder.svg",
    size: "M",
  });

  const addToCart = (p: NonNullable<Row["products"]>) => {
    if (p.stock <= 0) {
      toast.error("Stok habis");
      return;
    }
    addItem(buildItem(p));
    toast.success(`${p.name} ditambahkan ke keranjang`);
  };

  const buyNow = (p: NonNullable<Row["products"]>) => {
    if (p.stock <= 0) {
      toast.error("Stok habis");
      return;
    }
    addItem(buildItem(p));
    navigate("/checkout");
  };

  if (rows.length === 0) return null;

  return (
    <div className="bg-black/70 backdrop-blur border-t border-white/10 px-3 py-2">
      <div className="flex items-center gap-1.5 mb-2">
        <ShoppingBag className="h-3.5 w-3.5 text-white/70" />
        <span className="text-[11px] uppercase tracking-widest text-white/70 font-semibold">
          Produk Live · {rows.length}
        </span>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 snap-x">
        {rows.map((r, idx) => {
          const p = r.products;
          if (!p) return null;
          return (
            <div
              key={r.id}
              className="snap-start shrink-0 w-40 bg-white/95 text-black rounded-lg overflow-hidden flex flex-col shadow-lg"
            >
              <div className="relative aspect-square bg-muted">
                <img
                  src={p.image_url || "/placeholder.svg"}
                  alt={p.name}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
                <span className="absolute top-1 left-1 text-[10px] font-bold bg-black/70 text-white px-1.5 py-0.5 rounded">
                  #{idx + 1}
                </span>
                {r.is_flash && (
                  <span className="absolute top-1 right-1 flex items-center gap-0.5 text-[10px] font-bold bg-accent text-accent-foreground px-1.5 py-0.5 rounded">
                    <Zap className="h-2.5 w-2.5" /> FLASH
                  </span>
                )}
                {p.stock <= 0 && (
                  <div className="absolute inset-0 bg-black/60 grid place-items-center">
                    <span className="text-white text-xs font-bold uppercase">Habis</span>
                  </div>
                )}
              </div>
              <div className="p-1.5 flex-1 flex flex-col">
                <p className="text-[11px] leading-tight line-clamp-2 min-h-[26px]">{p.name}</p>
                <p className="text-sm font-bold text-accent mt-0.5">{p.price}</p>
                <div className="mt-1.5 grid grid-cols-2 gap-1">
                  <button
                    onClick={() => addToCart(p)}
                    className="text-[10px] font-semibold uppercase border border-black/70 py-1 rounded hover:bg-black hover:text-white transition"
                  >
                    + Keranjang
                  </button>
                  <button
                    onClick={() => buyNow(p)}
                    className="text-[10px] font-semibold uppercase bg-accent text-accent-foreground py-1 rounded"
                  >
                    Beli
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default LiveProductRail;
