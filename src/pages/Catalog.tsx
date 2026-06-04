import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import ProductCard from "@/components/ProductCard";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Product {
  id: string;
  name: string;
  price: string;
  image: string;
  stock_status: "available" | "out_of_stock" | "coming_soon";
}

type FilterStatus = "all" | "available" | "coming_soon" | "out_of_stock";
type SortOrder = "newest" | "name" | "price_asc" | "price_desc";

const FILTERS: { label: string; value: FilterStatus }[] = [
  { label: "All", value: "all" },
  { label: "In stock", value: "available" },
  { label: "Coming soon", value: "coming_soon" },
  { label: "Sold out", value: "out_of_stock" },
];

const SORTS: { label: string; value: SortOrder }[] = [
  { label: "Featured", value: "newest" },
  { label: "Alphabetical", value: "name" },
  { label: "Price, low to high", value: "price_asc" },
  { label: "Price, high to low", value: "price_desc" },
];

const FilterPanel = ({
  filterStatus,
  setFilterStatus,
  counts,
}: {
  filterStatus: FilterStatus;
  setFilterStatus: (v: FilterStatus) => void;
  counts: Record<FilterStatus, number>;
}) => (
  <div className="space-y-8">
    <div>
      <h3 className="eyebrow mb-4">Availability</h3>
      <ul className="space-y-3">
        {FILTERS.map((opt) => (
          <li key={opt.value}>
            <button
              onClick={() => setFilterStatus(opt.value)}
              className={`group flex items-center justify-between w-full text-left text-sm transition-colors ${
                filterStatus === opt.value
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <span className="flex items-center gap-3">
                <span
                  className={`h-[1px] transition-all ${
                    filterStatus === opt.value ? "w-6 bg-foreground" : "w-2 bg-border"
                  }`}
                />
                {opt.label}
              </span>
              <span className="text-xs tabular-nums opacity-60">{counts[opt.value]}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  </div>
);

const Catalog = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortOrder, setSortOrder] = useState<SortOrder>("newest");
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const { data: productsData, error } = await supabase
        .from("products")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;

      const { data: imagesData } = await supabase
        .from("product_images")
        .select("product_id, image_url, image_type, is_primary")
        .order("display_order", { ascending: true });

      const imagesMap: Record<string, string> = {};
      if (imagesData) {
        const grouped = imagesData.reduce((acc: any, img: any) => {
          if (!acc[img.product_id]) acc[img.product_id] = [];
          acc[img.product_id].push(img);
          return acc;
        }, {});
        Object.keys(grouped).forEach((pid) => {
          const imgs = grouped[pid];
          const front = imgs.find((i: any) => i.image_type === "front");
          const primary = imgs.find((i: any) => i.is_primary);
          imagesMap[pid] = front?.image_url || primary?.image_url || imgs[0]?.image_url;
        });
      }

      setProducts(
        (productsData || []).map((p) => ({
          id: p.id,
          name: p.name,
          price: p.price,
          image: imagesMap[p.id] || p.image,
          stock_status: p.stock_status as Product["stock_status"],
        }))
      );
    } catch (error) {
      console.error("Error fetching products:", error);
      toast.error("Failed to load products");
    } finally {
      setLoading(false);
    }
  };

  const counts: Record<FilterStatus, number> = {
    all: products.length,
    available: products.filter((p) => p.stock_status === "available").length,
    coming_soon: products.filter((p) => p.stock_status === "coming_soon").length,
    out_of_stock: products.filter((p) => p.stock_status === "out_of_stock").length,
  };

  const filtered = products.filter((p) =>
    filterStatus === "all" ? true : p.stock_status === filterStatus
  );

  const sorted = [...filtered].sort((a, b) => {
    if (sortOrder === "name") return a.name.localeCompare(b.name);
    if (sortOrder === "newest") return 0;
    const priceA = parseFloat(a.price.replace(/[^0-9.-]+/g, ""));
    const priceB = parseFloat(b.price.replace(/[^0-9.-]+/g, ""));
    return sortOrder === "price_asc" ? priceA - priceB : priceB - priceA;
  });

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-[1480px] mx-auto px-4 md:px-10 pt-24 pb-20">
        {/* Page heading */}
        <div className="mb-10 md:mb-14 text-center md:text-left">
          <p className="eyebrow text-muted-foreground mb-3">Collection</p>
          <h1 className="font-display text-4xl md:text-6xl">All pieces</h1>
        </div>

        {/* Toolbar */}
        <div className="flex items-center justify-between border-y border-border py-4 mb-10">
          <Sheet>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                className="md:hidden eyebrow gap-2 px-0"
              >
                <SlidersHorizontal className="h-4 w-4" strokeWidth={1.5} />
                Filter
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-80 pt-12">
              <FilterPanel
                filterStatus={filterStatus}
                setFilterStatus={setFilterStatus}
                counts={counts}
              />
            </SheetContent>
          </Sheet>

          <p className="hidden md:block eyebrow text-muted-foreground">
            {sorted.length} {sorted.length === 1 ? "piece" : "pieces"}
          </p>

          <Select value={sortOrder} onValueChange={(v) => setSortOrder(v as SortOrder)}>
            <SelectTrigger className="w-[200px] border-none shadow-none eyebrow justify-end gap-2 ml-auto bg-transparent focus:ring-0">
              <span className="text-muted-foreground">Sort:</span>
              <SelectValue />
            </SelectTrigger>
            <SelectContent align="end">
              {SORTS.map((s) => (
                <SelectItem key={s.value} value={s.value} className="text-sm">
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid md:grid-cols-[220px_1fr] gap-10 md:gap-14">
          {/* Sidebar - desktop only */}
          <aside className="hidden md:block">
            <div className="sticky top-24">
              <FilterPanel
                filterStatus={filterStatus}
                setFilterStatus={setFilterStatus}
                counts={counts}
              />
            </div>
          </aside>

          {/* Product grid */}
          <div>
            {loading ? (
              <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-6 gap-y-12">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="animate-pulse">
                    <div className="aspect-[3/4] bg-muted" />
                    <div className="h-3 w-2/3 bg-muted mt-4" />
                    <div className="h-3 w-1/3 bg-muted mt-2" />
                  </div>
                ))}
              </div>
            ) : sorted.length === 0 ? (
              <div className="text-center py-32">
                <p className="eyebrow text-muted-foreground mb-2">Empty</p>
                <p className="font-display text-2xl">No pieces match this filter</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-6 gap-y-12">
                {sorted.map((product) => (
                  <ProductCard
                    key={product.id}
                    id={product.id}
                    name={product.name}
                    price={product.price}
                    image={product.image}
                    comingSoon={product.stock_status === "coming_soon"}
                    outOfStock={product.stock_status === "out_of_stock"}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Catalog;
