import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { SlidersHorizontal, ArrowUpDown } from "lucide-react";
import { toast } from "sonner";
import ProductCard from "@/components/ProductCard";

interface Product {
  id: string;
  name: string;
  price: string;
  image: string;
  stock_status: 'available' | 'out_of_stock' | 'coming_soon';
}

const Catalog = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortOrder, setSortOrder] = useState<'name' | 'price_asc' | 'price_desc'>('name');
  const [filterStatus, setFilterStatus] = useState<'all' | 'available' | 'coming_soon'>('all');
  const [showFilter, setShowFilter] = useState(false);
  const [showSort, setShowSort] = useState(false);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const { data: productsData, error } = await supabase
        .from('products')
        .select('*')
        .order('name');

      if (error) throw error;

      // Fetch primary images
      const { data: imagesData } = await supabase
        .from('product_images')
        .select('product_id, image_url, image_type, is_primary')
        .order('display_order', { ascending: true });

      const imagesMap: Record<string, string> = {};
      if (imagesData) {
        const grouped = imagesData.reduce((acc: any, img: any) => {
          if (!acc[img.product_id]) acc[img.product_id] = [];
          acc[img.product_id].push(img);
          return acc;
        }, {});
        Object.keys(grouped).forEach(pid => {
          const imgs = grouped[pid];
          const front = imgs.find((i: any) => i.image_type === 'front');
          const primary = imgs.find((i: any) => i.is_primary);
          imagesMap[pid] = front?.image_url || primary?.image_url || imgs[0]?.image_url;
        });
      }

      setProducts((productsData || []).map(p => ({
        id: p.id,
        name: p.name,
        price: p.price,
        image: imagesMap[p.id] || p.image,
        stock_status: p.stock_status as Product['stock_status'],
      })));
    } catch (error) {
      console.error('Error fetching products:', error);
      toast.error('Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  const filtered = products.filter(p => {
    if (filterStatus === 'all') return true;
    return p.stock_status === filterStatus;
  });

  const sorted = [...filtered].sort((a, b) => {
    if (sortOrder === 'name') return a.name.localeCompare(b.name);
    const priceA = parseFloat(a.price.replace(/[^0-9.-]+/g, ''));
    const priceB = parseFloat(b.price.replace(/[^0-9.-]+/g, ''));
    return sortOrder === 'price_asc' ? priceA - priceB : priceB - priceA;
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 pt-20 pb-6">
        {/* Filter & Sort Buttons */}
        <div className="flex gap-3 mb-6">
          <Button
            variant="outline"
            className="flex-1 rounded-full h-12 text-sm font-medium"
            onClick={() => { setShowFilter(!showFilter); setShowSort(false); }}
          >
            <SlidersHorizontal className="h-4 w-4 mr-2" />
            Filter
          </Button>
          <Button
            variant="outline"
            className="flex-1 rounded-full h-12 text-sm font-medium"
            onClick={() => { setShowSort(!showSort); setShowFilter(false); }}
          >
            <ArrowUpDown className="h-4 w-4 mr-2" />
            Sort
          </Button>
        </div>

        {/* Filter Options */}
        {showFilter && (
          <div className="flex gap-2 mb-4 flex-wrap animate-fade-in">
            {[
              { label: 'All', value: 'all' as const },
              { label: 'Available', value: 'available' as const },
              { label: 'Coming Soon', value: 'coming_soon' as const },
            ].map(opt => (
              <Button
                key={opt.value}
                variant={filterStatus === opt.value ? 'default' : 'outline'}
                size="sm"
                className="rounded-full"
                onClick={() => { setFilterStatus(opt.value); setShowFilter(false); }}
              >
                {opt.label}
              </Button>
            ))}
          </div>
        )}

        {/* Sort Options */}
        {showSort && (
          <div className="flex gap-2 mb-4 flex-wrap animate-fade-in">
            {[
              { label: 'Name', value: 'name' as const },
              { label: 'Price ↑', value: 'price_asc' as const },
              { label: 'Price ↓', value: 'price_desc' as const },
            ].map(opt => (
              <Button
                key={opt.value}
                variant={sortOrder === opt.value ? 'default' : 'outline'}
                size="sm"
                className="rounded-full"
                onClick={() => { setSortOrder(opt.value); setShowSort(false); }}
              >
                {opt.label}
              </Button>
            ))}
          </div>
        )}

        {/* Product Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
          {sorted.map(product => (
            <ProductCard
              key={product.id}
              id={product.id}
              name={product.name}
              price={product.price}
              image={product.image}
              comingSoon={product.stock_status === 'coming_soon'}
              outOfStock={product.stock_status === 'out_of_stock'}
            />
          ))}
        </div>

        {sorted.length === 0 && (
          <div className="text-center py-20 text-muted-foreground">
            No products found
          </div>
        )}
      </div>
    </div>
  );
};

export default Catalog;
