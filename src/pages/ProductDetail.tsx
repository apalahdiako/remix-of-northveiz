import { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Heart, Loader2, Star, ChevronRight, ChevronDown, ChevronUp } from "lucide-react";
import { useCart } from "@/hooks/useCart";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { getProductImageFallback } from "@/lib/productImageFallbacks";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from "@/components/ui/carousel";
import { ProductReviews } from "@/components/ProductReviews";
import { useProductLikes } from "@/hooks/useProductLikes";
import Autoplay from "embla-carousel-autoplay";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const SIZE_KEYS = ["S", "M", "L", "XL", "XXL"] as const;
const SIZE_DB_MAP: Record<string, string> = {
  S: "stock_s",
  M: "stock_m",
  L: "stock_l",
  XL: "stock_xl",
  XXL: "stock_xxl",
};

const PROVINCES = [
  "Aceh", "Sumatera Utara", "Sumatera Barat", "Riau", "Kepulauan Riau",
  "Jambi", "Sumatera Selatan", "Bengkulu", "Lampung", "Bangka Belitung",
  "DKI Jakarta", "Jawa Barat", "Banten", "Jawa Tengah", "DI Yogyakarta",
  "Jawa Timur", "Bali", "Nusa Tenggara Barat", "Nusa Tenggara Timur",
  "Kalimantan Barat", "Kalimantan Tengah", "Kalimantan Selatan",
  "Kalimantan Timur", "Kalimantan Utara", "Sulawesi Utara", "Gorontalo",
  "Sulawesi Tengah", "Sulawesi Barat", "Sulawesi Selatan", "Sulawesi Tenggara",
  "Maluku", "Maluku Utara", "Papua", "Papua Barat", "Papua Selatan",
  "Papua Tengah", "Papua Pegunungan", "Papua Barat Daya",
];

interface Product {
  id: string;
  name: string;
  price: string;
  stock_status: string;
  description?: string;
  size_guide_url?: string;
  stock_s: number;
  stock_m: number;
  stock_l: number;
  stock_xl: number;
  stock_xxl: number;
}

interface ProductImage {
  id: string;
  product_id: string;
  image_url: string;
  display_order: number;
  is_primary: boolean;
  image_type: string;
}

const ProductDetail = () => {
  const { id } = useParams();
  const { likeCount, isLiked, isLoading: isLikeLoading, toggleLike } = useProductLikes(id!);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [showBack, setShowBack] = useState(false);
  const [loading, setLoading] = useState(true);
  const [product, setProduct] = useState<Product | null>(null);
  const [frontImage, setFrontImage] = useState<ProductImage | null>(null);
  const [backImage, setBackImage] = useState<ProductImage | null>(null);
  const [averageRating, setAverageRating] = useState<number>(0);
  const [totalReviews, setTotalReviews] = useState<number>(0);
  const [carouselApi, setCarouselApi] = useState<CarouselApi>();
  const [mainCarouselApi, setMainCarouselApi] = useState<CarouselApi>();
  const [currentThumbnail, setCurrentThumbnail] = useState(0);
  const [sizeGuideOpen, setSizeGuideOpen] = useState(false);
  const [descExpanded, setDescExpanded] = useState(false);
  const [selectedProvince, setSelectedProvince] = useState<string>("");
  const autoplayPlugin = useRef(
    Autoplay({ delay: 4000, stopOnInteraction: true, stopOnMouseEnter: true })
  );
  const { addItem } = useCart();

  useEffect(() => {
    if (id) {
      fetchProductDetails();
      fetchProductRating();
    }
  }, [id]);

  const fetchProductRating = async () => {
    try {
      const { data, error } = await supabase
        .from('product_reviews')
        .select('rating')
        .eq('product_id', id)
        .eq('is_moderated', true);
      if (error) throw error;
      if (data && data.length > 0) {
        const avg = data.reduce((sum, r) => sum + r.rating, 0) / data.length;
        setAverageRating(avg);
        setTotalReviews(data.length);
      }
    } catch (error) {
      console.error('Error fetching rating:', error);
    }
  };

  const fetchProductDetails = async () => {
    try {
      setLoading(true);
      const { data: productData, error: productError } = await supabase
        .from('products')
        .select('*')
        .eq('id', id)
        .single();
      if (productError) throw productError;
      setProduct(productData as unknown as Product);

      const { data: imagesData, error: imagesError } = await supabase
        .from('product_images')
        .select('*')
        .eq('product_id', id)
        .order('display_order', { ascending: true });
      if (imagesError) throw imagesError;

      const front = (imagesData?.find(img => img.image_type === 'front') as unknown as ProductImage)
        || (imagesData?.find(img => img.is_primary) as unknown as ProductImage)
        || (imagesData && (imagesData[0] as unknown as ProductImage))
        || null;
      const back = imagesData?.find(img => img.image_type === 'back') as unknown as ProductImage || null;

      if (!front && (productData as any)?.image) {
        setFrontImage({
          id: 'fallback', product_id: id!, image_url: (productData as any).image,
          display_order: 0, is_primary: true, image_type: 'front'
        });
      } else {
        setFrontImage(front);
      }
      setBackImage(back);
    } catch (error) {
      console.error('Error fetching product:', error);
      toast({ title: "Error", description: "Failed to load product details", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const getSizeStock = (size: string): number => {
    if (!product) return 0;
    const key = SIZE_DB_MAP[size] as keyof Product;
    return (product[key] as number) || 0;
  };

  const handleAddToCart = () => {
    if (!selectedSize) {
      toast({ title: "Pilih ukuran", description: "Kamu harus memilih ukuran terlebih dahulu", variant: "destructive" });
      return;
    }
    if (!product) return;
    addItem({
      id: id!,
      name: product.name,
      price: parseFloat(product.price.replace(/[^0-9]/g, "")),
      image: frontImage?.image_url || '',
      size: selectedSize,
    });
    toast({ title: "Ditambahkan ke keranjang", description: `${product.name} (Size ${selectedSize})` });
  };

  // Sync carousels
  useEffect(() => {
    if (!carouselApi || !mainCarouselApi) return;
    const onThumb = () => { const i = carouselApi.selectedScrollSnap(); setCurrentThumbnail(i); setShowBack(i === 1); mainCarouselApi.scrollTo(i); };
    const onMain = () => { const i = mainCarouselApi.selectedScrollSnap(); setCurrentThumbnail(i); setShowBack(i === 1); carouselApi.scrollTo(i); };
    carouselApi.on("select", onThumb);
    mainCarouselApi.on("select", onMain);
    return () => { carouselApi.off("select", onThumb); mainCarouselApi.off("select", onMain); };
  }, [carouselApi, mainCarouselApi]);

  // Realtime for product changes (stock, images)
  useEffect(() => {
    if (!id) return;
    const ch1 = supabase.channel('product-detail-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products', filter: `id=eq.${id}` }, () => fetchProductDetails())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'product_images', filter: `product_id=eq.${id}` }, () => fetchProductDetails())
      .subscribe();
    return () => { supabase.removeChannel(ch1); };
  }, [id]);

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen"><Loader2 className="w-8 h-8 animate-spin" /></div>;
  }
  if (!product) {
    return <div className="flex items-center justify-center min-h-screen"><p className="text-lg text-muted-foreground">Produk tidak ditemukan</p></div>;
  }

  const fallback = getProductImageFallback(id || undefined);
  const hasBackImage = !!backImage || !!fallback?.back;
  const thumbnailImages = [
    { url: frontImage?.image_url || fallback?.front || (product as any)?.image || '/placeholder.svg', type: 'front', label: 'Depan' },
    ...(hasBackImage ? [{ url: backImage?.image_url || fallback?.back || '/placeholder.svg', type: 'back', label: 'Belakang' }] : [])
  ];

  const descText = product.description || '';
  const isLongDesc = descText.length > 200;

  return (
    <div className="min-h-screen pb-24 pt-16">
      <div className="md:grid md:grid-cols-2 md:gap-12 lg:gap-20 md:max-w-[1480px] md:mx-auto md:px-10 md:pt-8 md:items-start">
      {/* Product Image Carousel */}
      <div className="relative md:sticky md:top-24">

        <Carousel opts={{ align: "start", loop: thumbnailImages.length > 1 }} className="w-full" setApi={setMainCarouselApi}>
          <CarouselContent>
            {thumbnailImages.map((thumb) => (
              <CarouselItem key={thumb.type}>
                <div className="aspect-square w-full bg-muted relative overflow-hidden">
                  <img src={thumb.url} alt={`${product.name} ${thumb.label}`} className="w-full h-full object-cover transition-opacity duration-300" loading="lazy" decoding="async"
                    onError={(e) => { e.currentTarget.src = (thumb.type === 'front' ? fallback?.front : fallback?.back) || '/placeholder.svg'; }} />
                  {thumb.type === 'front' && hasBackImage && currentThumbnail === 0 && (
                    <div className="absolute bottom-12 right-4 flex items-center gap-1.5 bg-foreground/60 text-background text-xs font-medium px-3 py-1.5 rounded-full animate-fade-in pointer-events-none">
                      <span>Geser</span>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
                    </div>
                  )}
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>
        </Carousel>

        {/* Thumbnail Slider */}
        <div className="px-4 py-4">
          <Carousel opts={{ align: "start", loop: thumbnailImages.length > 1 }} plugins={thumbnailImages.length > 1 ? [autoplayPlugin.current] : []} className="w-full" setApi={setCarouselApi}>
            <CarouselContent className="-ml-2">
              {thumbnailImages.map((thumb, index) => (
                <CarouselItem key={thumb.type} className="basis-1/4 pl-2">
                  <button onClick={() => { setShowBack(thumb.type === 'back'); carouselApi?.scrollTo(index); mainCarouselApi?.scrollTo(index); }}
                    className={`relative aspect-square w-full rounded-lg overflow-hidden border-2 transition-all ${(showBack && thumb.type === 'back') || (!showBack && thumb.type === 'front') ? 'border-foreground scale-95' : 'border-border hover:border-foreground/50'}`}>
                    <img src={thumb.url} alt={`${product.name} ${thumb.label}`} className="w-full h-full object-cover" loading="lazy"
                      onError={(e) => { e.currentTarget.src = (thumb.type === 'front' ? fallback?.front : fallback?.back) || '/placeholder.svg'; }} />
                  </button>
                </CarouselItem>
              ))}
            </CarouselContent>
          </Carousel>
          {thumbnailImages.length > 1 && (
            <div className="flex justify-center gap-2 mt-3">
              {thumbnailImages.map((_, index) => (
                <button key={index} onClick={() => { carouselApi?.scrollTo(index); mainCarouselApi?.scrollTo(index); setShowBack(index === 1); }}
                  className={`h-1.5 rounded-full transition-all ${currentThumbnail === index ? 'w-6 bg-foreground' : 'w-1.5 bg-border hover:bg-foreground/50'}`} aria-label={`Go to thumbnail ${index + 1}`} />
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="container px-6 pb-6 md:px-0 md:max-w-none md:pt-2">
        {/* Eyebrow */}
        <p className="eyebrow text-muted-foreground mb-3 hidden md:block">Northveiz</p>

        {/* Status Badge */}
        {product.stock_status === 'coming_soon' && (
          <Badge className="mb-3 bg-foreground text-background font-bold">COMING SOON</Badge>
        )}
        {product.stock_status === 'out_of_stock' && (
          <Badge className="mb-3 bg-destructive text-destructive-foreground font-bold">STOK HABIS</Badge>
        )}

        {/* Product Title */}
        <h1 className="text-2xl md:text-4xl lg:text-5xl font-display mb-1 tracking-tight normal-case">{product.name}</h1>

        {/* Rating */}
        {totalReviews > 0 && (
          <div className="flex items-center gap-2 mb-3">
            <div className="flex items-center">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star key={star} className={`w-4 h-4 ${star <= Math.round(averageRating) ? 'fill-yellow-500 text-yellow-500' : 'text-muted-foreground'}`} />
              ))}
            </div>
            <span className="text-sm font-bold">{averageRating.toFixed(1)}</span>
            <span className="text-xs text-muted-foreground">({totalReviews})</span>
          </div>
        )}

        {/* Price and Wishlist */}
        <div className="flex items-center justify-between mb-8 mt-4">
          <p className="text-xl md:text-2xl font-light tracking-wide">{product.price}</p>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={toggleLike} disabled={isLikeLoading} className="relative group" aria-label="Wishlist">
              <Heart className={`h-5 w-5 transition-all duration-300 ${isLiked ? 'fill-accent text-accent scale-110' : 'text-muted-foreground group-hover:text-accent'}`} strokeWidth={1.5} />
            </Button>
            {likeCount > 0 && <span className="text-sm font-light text-muted-foreground">{likeCount}</span>}
          </div>
        </div>


        {/* Size Selection */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="eyebrow">Size</h3>
            {product.size_guide_url && (
              <button onClick={() => setSizeGuideOpen(true)} className="flex items-center gap-1 eyebrow text-muted-foreground hover:text-foreground transition-colors">
                Size guide <ChevronRight className="w-3 h-3" />
              </button>
            )}
          </div>

          <div className="grid grid-cols-5 gap-3">
            {SIZE_KEYS.map((size) => {
              const stock = getSizeStock(size);
              const outOfStock = stock === 0;
              const isSelected = selectedSize === size;
              return (
                <button
                  key={size}
                  disabled={outOfStock || product.stock_status === 'out_of_stock'}
                  onClick={() => setSelectedSize(size)}
                  className={`relative h-14 rounded-lg border-2 text-base font-semibold transition-all overflow-hidden ${
                    outOfStock
                      ? 'border-border text-muted-foreground/40 cursor-not-allowed bg-muted/30'
                      : isSelected
                      ? 'border-red-500 bg-red-500 text-white scale-[0.97]'
                      : 'border-border hover:border-foreground/50 bg-background'
                  }`}
                >
                  {size}
                  {/* Diagonal strikethrough for out of stock */}
                  {outOfStock && (
                    <svg className="absolute inset-0 w-full h-full pointer-events-none" preserveAspectRatio="none">
                      <line x1="0" y1="100%" x2="100%" y2="0" stroke="currentColor" strokeWidth="1.5" className="text-muted-foreground/40" />
                    </svg>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Description Accordion */}
        {descText && (
          <div className="mb-6 border border-border rounded-xl p-4">
            <button onClick={() => setDescExpanded(!descExpanded)} className="flex items-center justify-between w-full text-left">
              <h3 className="text-sm font-bold">Deskripsi Produk</h3>
              {isLongDesc && (descExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />)}
            </button>
            <div className={`mt-2 text-sm text-muted-foreground leading-relaxed whitespace-pre-line ${!descExpanded && isLongDesc ? 'line-clamp-4' : ''}`}>
              {descText}
            </div>
            {isLongDesc && !descExpanded && (
              <button onClick={() => setDescExpanded(true)} className="text-xs font-semibold text-foreground mt-1">
                Baca selengkapnya
              </button>
            )}
          </div>
        )}

        {/* Shipping Province */}
        <div className="mb-6 border border-border rounded-xl p-4">
          <h3 className="text-sm font-bold mb-3">Pengiriman</h3>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">Dikirim ke:</span>
            <Select value={selectedProvince} onValueChange={setSelectedProvince}>
              <SelectTrigger className="w-[180px] h-9 text-sm border-border">
                <SelectValue placeholder="Pilih Provinsi" />
              </SelectTrigger>
              <SelectContent className="max-h-60">
                {PROVINCES.map((p) => (
                  <SelectItem key={p} value={p}>{p}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <p className="text-xs text-muted-foreground">Dikirim dalam 24 jam, (Setelah pembayaran dikonfirmasi)</p>
        </div>

        {/* Add to Cart Button */}
        <Button
          className="w-full h-14 rounded-none text-xs font-medium tracking-[0.2em] uppercase bg-foreground text-background hover:bg-foreground/90"
          onClick={handleAddToCart}
          disabled={product.stock_status === 'out_of_stock' || product.stock_status === 'coming_soon'}
        >
          {product.stock_status === 'out_of_stock' ? 'Sold out' : product.stock_status === 'coming_soon' ? 'Coming soon' : 'Add to bag'}
        </Button>

        {/* Product Reviews */}
        <div className="mt-12 border-t pt-8">
          <ProductReviews productId={id!} productName={product.name} />
        </div>
      </div>
      </div>


      {/* Size Guide Modal */}
      <Dialog open={sizeGuideOpen} onOpenChange={setSizeGuideOpen}>
        <DialogContent className="bg-background/80 backdrop-blur-xl border-border max-w-md mx-auto rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-center font-bold">Size Guide</DialogTitle>
          </DialogHeader>
          {product.size_guide_url && (
            <div className="p-2">
              <img src={product.size_guide_url} alt="Size Guide" className="w-full rounded-lg" />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProductDetail;
