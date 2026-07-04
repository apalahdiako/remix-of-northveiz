import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useCart } from "@/hooks/useCart";
import { toast } from "sonner";
import { X, ShoppingBag, Zap } from "lucide-react";

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
  onClose: () => void;
}

/** Bottom sheet listing all pinned products for a live stream (TikTok "bag" drawer). */
const LiveProductSheet = ({ streamId, onClose }: Props) => {
  const [rows, setRows] = useState<Row[]>([]);
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
      .channel(`live_sheet:${streamId}`)
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

  const build = (p: NonNullable<Row["products"]>) => ({
    id: p.id,
    name: p.name,
    price: parseFloat(p.price.replace(/[^0-9]/g, "")) || 0,
    image: p.image || "/placeholder.svg",
    size: "M",
  });

  const addToCart = (p: NonNullable<Row["products"]>) => {
    if (p.stock <= 0) return toast.error("Stok habis");
    addItem(build(p));
    toast.success(`${p.name} ditambahkan`);
  };

  const buyNow = (p: NonNullable<Row["products"]>) => {
    if (p.stock <= 0) return toast.error("Stok habis");
    addItem(build(p));
    navigate("/checkout");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[120] flex flex-col animate-in fade-in duration-150">
      <button
        aria-label="Tutup"
        className="flex-1 bg-black/60"
        onClick={onClose}
      />
      <div className="bg-background text-foreground rounded-t-2xl max-h-[70vh] flex flex-col animate-in slide-in-from-bottom duration-200">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <div className="flex items-center gap-2">
            <ShoppingBag className="h-4 w-4 text-accent" />
            <p className="text-sm font-semibold">Produk Live · {rows.length}</p>
          </div>
          <button onClick={onClose} className="h-8 w-8 grid place-items-center rounded-full hover:bg-muted">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {rows.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-8">Belum ada produk yang ditambahkan.</p>
          )}
          {rows.map((r, i) => {
            const p = r.products;
            if (!p) return null;
            return (
              <div key={r.id} className="flex gap-3 border rounded-xl p-2">
                <div className="relative h-20 w-20 shrink-0 bg-muted rounded-lg overflow-hidden">
                  <img src={p.image || "/placeholder.svg"} alt={p.name} className="w-full h-full object-cover" />
                  <span className="absolute top-1 left-1 text-[9.5px] font-bold bg-black/70 text-white px-1.5 py-0.5 rounded">
                    #{i + 1}
                  </span>
                  {r.is_flash && (
                    <span className="absolute bottom-1 left-1 flex items-center gap-0.5 text-[9.5px] font-bold bg-accent text-accent-foreground px-1.5 py-0.5 rounded">
                      <Zap className="h-2.5 w-2.5" />
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0 flex flex-col">
                  <p className="text-[13px] font-medium leading-snug line-clamp-2">{p.name}</p>
                  <p className="text-accent font-bold mt-0.5">{p.price}</p>
                  <div className="mt-auto flex gap-2">
                    <button
                      onClick={() => addToCart(p)}
                      className="flex-1 text-xs font-semibold border border-foreground/60 rounded-full py-1.5"
                    >
                      + Keranjang
                    </button>
                    <button
                      onClick={() => buyNow(p)}
                      className="flex-1 text-xs font-semibold bg-accent text-accent-foreground rounded-full py-1.5"
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
    </div>
  );
};

export default LiveProductSheet;
