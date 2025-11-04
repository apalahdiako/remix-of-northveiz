import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface Product {
  id: string;
  name: string;
  price: string;
  image: string;
  stock_status: 'available' | 'out_of_stock' | 'coming_soon';
}

const ProductManagement = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    fetchProducts();

    // Subscribe to realtime updates
    const channel = supabase
      .channel('products-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'products'
        },
        () => {
          fetchProducts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('name');

      if (error) throw error;
      setProducts((data || []) as Product[]);
    } catch (error) {
      console.error('Error fetching products:', error);
      toast.error('Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  const updateStockStatus = async (productId: string, newStatus: string) => {
    setUpdating(productId);
    try {
      const { error } = await supabase
        .from('products')
        .update({ stock_status: newStatus })
        .eq('id', productId);

      if (error) throw error;
      
      const statusLabels = {
        available: 'Tersedia',
        out_of_stock: 'Stok Habis',
        coming_soon: 'Akan Hadir'
      };
      
      toast.success(`Status produk diperbarui menjadi: ${statusLabels[newStatus as keyof typeof statusLabels]}`);
    } catch (error) {
      console.error('Error updating product:', error);
      toast.error('Gagal memperbarui status produk');
    } finally {
      setUpdating(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available':
        return 'bg-green-500';
      case 'out_of_stock':
        return 'bg-red-500';
      case 'coming_soon':
        return 'bg-yellow-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'available':
        return 'Tersedia';
      case 'out_of_stock':
        return 'Stok Habis';
      case 'coming_soon':
        return 'Akan Hadir';
      default:
        return status;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Pengaturan Stok Produk</h2>
        <p className="text-muted-foreground">
          Kelola status stok produk secara real-time. Perubahan akan langsung terlihat oleh semua pengguna.
        </p>
      </div>

      <div className="grid gap-4">
        {products.map((product) => (
          <Card key={product.id}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="text-lg">{product.name}</span>
                <div className="flex items-center gap-2">
                  <span className={`w-3 h-3 rounded-full ${getStatusColor(product.stock_status)}`} />
                  <span className="text-sm font-normal">{getStatusLabel(product.stock_status)}</span>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Harga: {product.price}</p>
                  <p className="text-xs text-muted-foreground">ID: {product.id}</p>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-4">
                    <Label htmlFor={`available-${product.id}`} className="cursor-pointer">
                      Tersedia
                    </Label>
                    <Switch
                      id={`available-${product.id}`}
                      checked={product.stock_status === 'available'}
                      onCheckedChange={(checked) => {
                        if (checked) updateStockStatus(product.id, 'available');
                      }}
                      disabled={updating === product.id}
                    />
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <Label htmlFor={`out-${product.id}`} className="cursor-pointer">
                      Stok Habis
                    </Label>
                    <Switch
                      id={`out-${product.id}`}
                      checked={product.stock_status === 'out_of_stock'}
                      onCheckedChange={(checked) => {
                        if (checked) updateStockStatus(product.id, 'out_of_stock');
                      }}
                      disabled={updating === product.id}
                    />
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <Label htmlFor={`coming-${product.id}`} className="cursor-pointer">
                      Akan Hadir
                    </Label>
                    <Switch
                      id={`coming-${product.id}`}
                      checked={product.stock_status === 'coming_soon'}
                      onCheckedChange={(checked) => {
                        if (checked) updateStockStatus(product.id, 'coming_soon');
                      }}
                      disabled={updating === product.id}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default ProductManagement;