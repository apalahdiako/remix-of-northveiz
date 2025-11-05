import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Loader2, Upload, X, Image as ImageIcon } from "lucide-react";

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
  image_type: 'front' | 'back' | 'gallery';
}

const ProductImageManagement = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<string>("");
  const [frontImage, setFrontImage] = useState<ProductImage | null>(null);
  const [backImage, setBackImage] = useState<ProductImage | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploadingFront, setUploadingFront] = useState(false);
  const [uploadingBack, setUploadingBack] = useState(false);

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
        .in('image_type', ['front', 'back']);

      if (error) throw error;
      
      const front = (data?.find(img => img.image_type === 'front') as ProductImage) || null;
      const back = (data?.find(img => img.image_type === 'back') as ProductImage) || null;
      
      setFrontImage(front || null);
      setBackImage(back || null);
    } catch (error) {
      console.error('Error fetching images:', error);
      toast.error('Gagal memuat gambar produk');
    }
  };

  const handleFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    imageType: 'front' | 'back'
  ) => {
    const file = e.target.files?.[0];
    if (!file || !selectedProduct) return;

    const setUploading = imageType === 'front' ? setUploadingFront : setUploadingBack;
    setUploading(true);

    try {
      // Validate file size (5MB as per requirements)
      if (file.size > 5242880) {
        toast.error('File terlalu besar (maksimal 5MB)');
        return;
      }

      // Validate file type
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
        toast.error('Format tidak didukung (hanya JPG, PNG, WEBP)');
        return;
      }

      // Delete existing image if any
      const existingImage = imageType === 'front' ? frontImage : backImage;
      if (existingImage) {
        await deleteImage(existingImage.id, existingImage.image_url);
      }

      // Upload to storage with cache-busting timestamp
      const fileExt = file.name.split('.').pop();
      const timestamp = Date.now();
      const fileName = `${selectedProduct}_${imageType}_${timestamp}.${fileExt}`;
      const filePath = `${selectedProduct}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('product-images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Get public URL with cache-busting
      const { data: { publicUrl } } = supabase.storage
        .from('product-images')
        .getPublicUrl(filePath);

      // Add timestamp parameter for cache-busting
      const cacheBustedUrl = `${publicUrl}?v=${timestamp}`;

      // Insert into database
      const { error: dbError } = await supabase
        .from('product_images')
        .insert({
          product_id: selectedProduct,
          image_url: cacheBustedUrl,
          display_order: imageType === 'front' ? 0 : 1,
          is_primary: imageType === 'front',
          image_type: imageType
        });

      if (dbError) throw dbError;

      toast.success(`Gambar ${imageType === 'front' ? 'Depan' : 'Belakang'} berhasil diunggah`);
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
      // Extract file path from URL (remove query params for storage)
      const url = new URL(imageUrl.split('?')[0]);
      const pathParts = url.pathname.split('/');
      const filePath = pathParts.slice(-2).join('/');

      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('product-images')
        .remove([filePath]);

      if (storageError) console.warn('Storage deletion warning:', storageError);

      // Delete from database
      const { error: dbError } = await supabase
        .from('product_images')
        .delete()
        .eq('id', imageId);

      if (dbError) throw dbError;

      fetchProductImages(selectedProduct);
    } catch (error) {
      console.error('Error deleting:', error);
      toast.error('Gagal menghapus gambar');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  const renderImageSlot = (
    type: 'front' | 'back',
    image: ProductImage | null,
    uploading: boolean
  ) => (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">
          {type === 'front' ? 'Gambar Utama (Tampilan Depan)' : 'Gambar Alternatif (Tampilan Belakang)'}
        </CardTitle>
        <CardDescription>
          {type === 'front' 
            ? 'Gambar utama yang akan ditampilkan pertama kali' 
            : 'Gambar belakang produk - pengguna dapat toggle untuk melihat'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {image ? (
          <div className="space-y-4">
            <div className="relative aspect-square w-full max-w-md mx-auto bg-muted rounded-lg overflow-hidden">
              <img
                src={image.image_url}
                alt={`${type} view`}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex gap-2">
              <Label htmlFor={`upload-${type}`} className="flex-1">
                <Button asChild variant="outline" className="w-full" disabled={uploading}>
                  <span>
                    {uploading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4 mr-2" />
                        Ganti Gambar
                      </>
                    )}
                  </span>
                </Button>
              </Label>
              <Button
                variant="destructive"
                onClick={() => deleteImage(image.id, image.image_url)}
                disabled={uploading}
              >
                <X className="w-4 h-4 mr-2" />
                Hapus
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <Label htmlFor={`upload-${type}`}>
              <div className="aspect-square w-full max-w-md mx-auto border-2 border-dashed rounded-lg hover:border-foreground/50 transition-colors cursor-pointer flex flex-col items-center justify-center gap-4 p-8 bg-muted/20">
                <ImageIcon className="w-16 h-16 text-muted-foreground" />
                <div className="text-center">
                  <p className="font-medium mb-1">
                    {uploading ? 'Uploading...' : 'Klik untuk upload gambar'}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    JPG, PNG, WEBP (maks. 5MB)
                  </p>
                </div>
              </div>
            </Label>
          </div>
        )}
        <Input
          id={`upload-${type}`}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={(e) => handleFileUpload(e, type)}
          className="hidden"
          disabled={uploading}
        />
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Upload Gambar Produk (Depan & Belakang)</h2>
        <p className="text-muted-foreground">
          Upload gambar depan dan belakang produk. Perubahan akan langsung terlihat oleh pengguna secara realtime.
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
        <div className="grid md:grid-cols-2 gap-6">
          {renderImageSlot('front', frontImage, uploadingFront)}
          {renderImageSlot('back', backImage, uploadingBack)}
        </div>
      )}
    </div>
  );
};

export default ProductImageManagement;
