import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Loader2, Upload, X, Star, ArrowUp, ArrowDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Product {
  id: string;
  name: string;
}

interface ProductImage {
  id: string;
  product_id: string;
  image_url: string;
  display_order: number;
  is_primary: boolean;
}

const ProductImageManagement = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<string>("");
  const [images, setImages] = useState<ProductImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchProducts();
  }, []);

  useEffect(() => {
    if (selectedProduct) {
      fetchProductImages(selectedProduct);
    }
  }, [selectedProduct]);

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('id, name')
        .order('name');

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error('Error fetching products:', error);
      toast.error('Gagal memuat produk');
    } finally {
      setLoading(false);
    }
  };

  const fetchProductImages = async (productId: string) => {
    try {
      const { data, error } = await supabase
        .from('product_images')
        .select('*')
        .eq('product_id', productId)
        .order('display_order');

      if (error) throw error;
      setImages(data || []);
    } catch (error) {
      console.error('Error fetching images:', error);
      toast.error('Gagal memuat gambar produk');
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !selectedProduct) return;

    // Check if adding these files would exceed 5 images
    if (images.length + files.length > 5) {
      toast.error('Maksimal 5 gambar per produk');
      return;
    }

    setUploading(true);

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        // Validate file size (2MB)
        if (file.size > 2097152) {
          toast.error(`${file.name} terlalu besar (maks 2MB)`);
          continue;
        }

        // Validate file type
        if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
          toast.error(`${file.name} format tidak didukung`);
          continue;
        }

        // Upload to storage
        const fileExt = file.name.split('.').pop();
        const fileName = `${selectedProduct}_${Date.now()}_${i}.${fileExt}`;
        const filePath = `${selectedProduct}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('product-images')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('product-images')
          .getPublicUrl(filePath);

        // Insert into database
        const { error: dbError } = await supabase
          .from('product_images')
          .insert({
            product_id: selectedProduct,
            image_url: publicUrl,
            display_order: images.length + i,
            is_primary: images.length === 0 && i === 0
          });

        if (dbError) throw dbError;
      }

      toast.success('Gambar berhasil diunggah');
      fetchProductImages(selectedProduct);
    } catch (error) {
      console.error('Error uploading:', error);
      toast.error('Gagal mengunggah gambar');
    } finally {
      setUploading(false);
      if (e.target) e.target.value = '';
    }
  };

  const deleteImage = async (imageId: string, imageUrl: string) => {
    try {
      // Extract file path from URL
      const url = new URL(imageUrl);
      const pathParts = url.pathname.split('/');
      const filePath = pathParts.slice(-2).join('/');

      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('product-images')
        .remove([filePath]);

      if (storageError) throw storageError;

      // Delete from database
      const { error: dbError } = await supabase
        .from('product_images')
        .delete()
        .eq('id', imageId);

      if (dbError) throw dbError;

      toast.success('Gambar berhasil dihapus');
      fetchProductImages(selectedProduct);
    } catch (error) {
      console.error('Error deleting:', error);
      toast.error('Gagal menghapus gambar');
    }
  };

  const setPrimaryImage = async (imageId: string) => {
    try {
      // Set all images to non-primary
      await supabase
        .from('product_images')
        .update({ is_primary: false })
        .eq('product_id', selectedProduct);

      // Set selected image as primary
      const { error } = await supabase
        .from('product_images')
        .update({ is_primary: true })
        .eq('id', imageId);

      if (error) throw error;

      toast.success('Gambar utama berhasil diatur');
      fetchProductImages(selectedProduct);
    } catch (error) {
      console.error('Error setting primary:', error);
      toast.error('Gagal mengatur gambar utama');
    }
  };

  const updateDisplayOrder = async (imageId: string, newOrder: number) => {
    try {
      const { error } = await supabase
        .from('product_images')
        .update({ display_order: newOrder })
        .eq('id', imageId);

      if (error) throw error;

      fetchProductImages(selectedProduct);
    } catch (error) {
      console.error('Error updating order:', error);
      toast.error('Gagal mengubah urutan');
    }
  };

  const moveImage = (index: number, direction: 'up' | 'down') => {
    if (
      (direction === 'up' && index === 0) ||
      (direction === 'down' && index === images.length - 1)
    ) {
      return;
    }

    const newIndex = direction === 'up' ? index - 1 : index + 1;
    const currentImage = images[index];
    const swapImage = images[newIndex];

    updateDisplayOrder(currentImage.id, newIndex);
    updateDisplayOrder(swapImage.id, index);
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
        <h2 className="text-2xl font-bold mb-2">Manajemen Gambar Produk</h2>
        <p className="text-muted-foreground">
          Upload dan kelola gambar produk (maksimal 5 gambar per produk, maks 2MB per file)
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Pilih Produk</CardTitle>
        </CardHeader>
        <CardContent>
          <select
            value={selectedProduct}
            onChange={(e) => setSelectedProduct(e.target.value)}
            className="w-full p-2 border rounded-md bg-background"
          >
            <option value="">-- Pilih Produk --</option>
            {products.map((product) => (
              <option key={product.id} value={product.id}>
                {product.name}
              </option>
            ))}
          </select>
        </CardContent>
      </Card>

      {selectedProduct && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Gambar Produk ({images.length}/5)</span>
              {images.length < 5 && (
                <Label htmlFor="file-upload" className="cursor-pointer">
                  <Button asChild disabled={uploading}>
                    <span>
                      {uploading ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Uploading...
                        </>
                      ) : (
                        <>
                          <Upload className="w-4 h-4 mr-2" />
                          Upload Gambar
                        </>
                      )}
                    </span>
                  </Button>
                </Label>
              )}
              <Input
                id="file-upload"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                onChange={handleFileUpload}
                className="hidden"
                disabled={uploading}
              />
            </CardTitle>
          </CardHeader>
          <CardContent>
            {images.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                Belum ada gambar. Upload gambar pertama untuk produk ini.
              </p>
            ) : (
              <div className="grid gap-4">
                {images.map((image, index) => (
                  <div
                    key={image.id}
                    className="flex items-center gap-4 p-4 border rounded-lg"
                  >
                    <img
                      src={image.image_url}
                      alt={`Product ${index + 1}`}
                      className="w-24 h-24 object-cover rounded"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-medium">Gambar {index + 1}</span>
                        {image.is_primary && (
                          <Badge className="bg-yellow-500">
                            <Star className="w-3 h-3 mr-1" />
                            Utama
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Urutan tampilan: {image.display_order + 1}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => moveImage(index, 'up')}
                        disabled={index === 0}
                      >
                        <ArrowUp className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => moveImage(index, 'down')}
                        disabled={index === images.length - 1}
                      >
                        <ArrowDown className="w-4 h-4" />
                      </Button>
                      {!image.is_primary && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setPrimaryImage(image.id)}
                        >
                          <Star className="w-4 h-4" />
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => deleteImage(image.id, image.image_url)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ProductImageManagement;
