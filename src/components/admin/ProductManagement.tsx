import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2, Upload, Image as ImageIcon } from "lucide-react";

interface Product {
  id: string;
  name: string;
  price: string;
  image: string;
  stock_status: string;
  stock_s: number;
  stock_m: number;
  stock_l: number;
  stock_xl: number;
  stock_xxl: number;
  size_guide_url?: string;
  description?: string;
}

const SIZE_LABELS = [
  { key: "stock_s", label: "S" },
  { key: "stock_m", label: "M" },
  { key: "stock_l", label: "L" },
  { key: "stock_xl", label: "XL" },
  { key: "stock_xxl", label: "XXL" },
];

const ProductManagement = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [editingDesc, setEditingDesc] = useState<Record<string, string>>({});
  const [uploadingGuide, setUploadingGuide] = useState<string | null>(null);

  useEffect(() => {
    fetchProducts();
    const channel = supabase
      .channel('products-admin-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, () => fetchProducts())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase.from('products').select('*').order('name');
      if (error) throw error;
      setProducts((data || []) as unknown as Product[]);
    } catch (error) {
      console.error('Error fetching products:', error);
      toast.error('Gagal memuat produk');
    } finally {
      setLoading(false);
    }
  };

  const updateStockStatus = async (productId: string, newStatus: string) => {
    setUpdating(productId);
    try {
      const { error } = await supabase.from('products').update({ stock_status: newStatus }).eq('id', productId);
      if (error) throw error;
      toast.success(`Status diperbarui`);
    } catch (error) {
      toast.error('Gagal memperbarui status');
    } finally {
      setUpdating(null);
    }
  };

  const updateSizeStock = async (productId: string, sizeKey: string, value: number) => {
    try {
      const { error } = await supabase.from('products').update({ [sizeKey]: Math.max(0, value) } as any).eq('id', productId);
      if (error) throw error;
    } catch (error) {
      toast.error('Gagal memperbarui stok');
    }
  };

  const updateDescription = async (productId: string) => {
    try {
      const { error } = await supabase.from('products').update({ description: editingDesc[productId] || '' }).eq('id', productId);
      if (error) throw error;
      toast.success('Deskripsi diperbarui');
    } catch (error) {
      toast.error('Gagal memperbarui deskripsi');
    }
  };

  const handleSizeGuideUpload = async (productId: string, file: File) => {
    setUploadingGuide(productId);
    try {
      const ext = file.name.split('.').pop();
      const path = `${productId}/size-guide.${ext}`;
      const { error: uploadError } = await supabase.storage.from('size-guides').upload(path, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from('size-guides').getPublicUrl(path);
      const { error: dbError } = await supabase.from('products').update({ size_guide_url: urlData.publicUrl }).eq('id', productId);
      if (dbError) throw dbError;
      toast.success('Size Guide diupload');
    } catch (error) {
      console.error(error);
      toast.error('Gagal upload Size Guide');
    } finally {
      setUploadingGuide(null);
    }
  };

  const getStatusColor = (s: string) => s === 'available' ? 'bg-green-500' : s === 'out_of_stock' ? 'bg-red-500' : s === 'coming_soon' ? 'bg-yellow-500' : 'bg-gray-500';
  const getStatusLabel = (s: string) => s === 'available' ? 'Tersedia' : s === 'out_of_stock' ? 'Stok Habis' : s === 'coming_soon' ? 'Akan Hadir' : s;

  if (loading) return <div className="flex items-center justify-center p-8"><Loader2 className="w-8 h-8 animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Pengaturan Produk</h2>
        <p className="text-muted-foreground text-sm">Kelola stok per ukuran, deskripsi, dan size guide.</p>
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
            <CardContent className="space-y-6">
              {/* Status toggles */}
              <div className="flex flex-wrap gap-4">
                {(['available', 'out_of_stock', 'coming_soon'] as const).map((status) => (
                  <div key={status} className="flex items-center gap-2">
                    <Switch
                      checked={product.stock_status === status}
                      onCheckedChange={(checked) => { if (checked) updateStockStatus(product.id, status); }}
                      disabled={updating === product.id}
                    />
                    <Label className="text-sm cursor-pointer">{getStatusLabel(status)}</Label>
                  </div>
                ))}
              </div>

              {/* Per-size stock */}
              <div>
                <Label className="text-sm font-semibold mb-2 block">Stok Per Ukuran</Label>
                <div className="grid grid-cols-5 gap-2">
                  {SIZE_LABELS.map(({ key, label }) => (
                    <div key={key} className="text-center">
                      <span className="text-xs font-semibold text-muted-foreground">{label}</span>
                      <Input
                        type="number"
                        min={0}
                        value={(product as any)[key] || 0}
                        onChange={(e) => {
                          const val = parseInt(e.target.value) || 0;
                          setProducts(prev => prev.map(p => p.id === product.id ? { ...p, [key]: val } : p));
                        }}
                        onBlur={(e) => updateSizeStock(product.id, key, parseInt(e.target.value) || 0)}
                        className="h-10 text-center mt-1"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Description */}
              <div>
                <Label className="text-sm font-semibold mb-2 block">Deskripsi Produk</Label>
                <Textarea
                  placeholder="Tulis deskripsi produk..."
                  value={editingDesc[product.id] ?? product.description ?? ''}
                  onChange={(e) => setEditingDesc(prev => ({ ...prev, [product.id]: e.target.value }))}
                  className="min-h-[80px] text-sm"
                />
                <Button size="sm" className="mt-2" onClick={() => updateDescription(product.id)}>Simpan Deskripsi</Button>
              </div>

              {/* Size Guide Upload */}
              <div>
                <Label className="text-sm font-semibold mb-2 block">Size Guide</Label>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 cursor-pointer border border-border rounded-lg px-4 py-2 hover:bg-muted transition-colors">
                    {uploadingGuide === product.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                    <span className="text-sm">Upload Gambar</span>
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleSizeGuideUpload(product.id, file);
                    }} />
                  </label>
                  {product.size_guide_url && (
                    <a href={product.size_guide_url} target="_blank" rel="noopener" className="flex items-center gap-1 text-xs text-blue-500 hover:underline">
                      <ImageIcon className="w-3 h-3" /> Lihat
                    </a>
                  )}
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
