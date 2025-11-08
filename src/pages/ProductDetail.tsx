import { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Heart, Loader2, Star } from "lucide-react";
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

const sizes = ["S", "M", "L", "XL", "XXL"];

interface Product {
  id: string;
  name: string;
  price: string;
  stock_status: 'available' | 'out_of_stock' | 'coming_soon';
}

interface ProductImage {
  id: string;
  product_id: string;
  image_url: string;
  display_order: number;
  is_primary: boolean;
  image_type: 'front' | 'back' | 'gallery';
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
  const [currentThumbnail, setCurrentThumbnail] = useState(0);
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
        const avg = data.reduce((sum, review) => sum + review.rating, 0) / data.length;
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
      
      // Fetch product details
      const { data: productData, error: productError } = await supabase
        .from('products')
        .select('*')
        .eq('id', id)
        .single();

      if (productError) throw productError;
      setProduct(productData as Product);

      // Fetch product images (front and back)
      const { data: imagesData, error: imagesError } = await supabase
        .from('product_images')
        .select('*')
        .eq('product_id', id)
        .order('display_order', { ascending: true });

      if (imagesError) throw imagesError;
      
      // Priority: explicit 'front' > is_primary=true > first by display_order
      const front = (imagesData?.find(img => img.image_type === 'front') as ProductImage)
        || (imagesData?.find(img => img.is_primary) as ProductImage)
        || (imagesData && (imagesData[0] as ProductImage))
        || null;

      // Back image only when explicitly set as 'back'
      const back = imagesData?.find(img => img.image_type === 'back') as ProductImage || null;

      if (!front && (productData as any)?.image) {
        // Fallback to legacy products.image field
        setFrontImage({
          id: 'fallback',
          product_id: id!,
          image_url: (productData as any).image,
          display_order: 0,
          is_primary: true,
          image_type: 'front'
        });
      } else {
        setFrontImage(front);
      }
      setBackImage(back);
    } catch (error) {
      console.error('Error fetching product:', error);
      toast({
        title: "Error",
        description: "Failed to load product details",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = () => {
    if (!selectedSize) {
      toast({
        title: "Please select a size",
        description: "You need to select a size before adding to cart",
        variant: "destructive",
      });
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

    toast({
      title: "Added to cart",
      description: `${product.name} (Size ${selectedSize}) has been added to your cart`,
    });
  };

  // Setup carousel API for tracking current slide
  useEffect(() => {
    if (!carouselApi) return;

    carouselApi.on("select", () => {
      setCurrentThumbnail(carouselApi.selectedScrollSnap());
      const index = carouselApi.selectedScrollSnap();
      setShowBack(index === 1 && hasBackImage);
    });
  }, [carouselApi]);

  // Setup realtime subscription for image updates
  useEffect(() => {
    if (!id) return;

    const channel = supabase
      .channel('product-images-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'product_images',
          filter: `product_id=eq.${id}`
        },
        () => {
          fetchProductDetails();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-lg text-muted-foreground">Product not found</p>
      </div>
    );
  }

  const currentImage = showBack && backImage ? backImage : frontImage;
  const fallback = getProductImageFallback(id || undefined);
  const hasBackImage = !!backImage || !!fallback?.back;
  const displayUrl = (showBack
    ? (backImage?.image_url || fallback?.back)
    : (frontImage?.image_url || fallback?.front)
  ) || (product as any)?.image || '/placeholder.svg';

  // Prepare thumbnail images array
  const thumbnailImages = [
    {
      url: frontImage?.image_url || fallback?.front || (product as any)?.image || '/placeholder.svg',
      type: 'front',
      label: 'Depan'
    },
    ...(hasBackImage ? [{
      url: backImage?.image_url || fallback?.back || '/placeholder.svg',
      type: 'back',
      label: 'Belakang'
    }] : [])
  ];

  return (
    <div className="min-h-screen pb-24 pt-16">
      {/* Product Image with Toggle */}
      <div className="relative">
        <div className="aspect-square w-full bg-muted relative overflow-hidden">
          <img
            src={displayUrl + (currentImage ? `?v=${currentImage.id}` : '')}
            alt={`${product?.name} ${showBack ? 'belakang' : 'depan'}`}
            className="w-full h-full object-cover transition-opacity duration-300 animate-fade-in"
            key={`${showBack ? 'back' : 'front'}-${currentImage?.id || (showBack ? 'fallback-back' : 'fallback-front')}`}
            loading="lazy"
            decoding="async"
            onError={(e) => { (e.currentTarget as HTMLImageElement).src = fallback?.front || '/placeholder.svg'; }}
          />
        </div>

        {/* Thumbnail Slider - Always visible */}
        <div className="px-4 py-4">
          <Carousel
            opts={{
              align: "start",
              loop: thumbnailImages.length > 1,
            }}
            plugins={thumbnailImages.length > 1 ? [autoplayPlugin.current] : []}
            className="w-full"
            setApi={setCarouselApi}
            onMouseEnter={() => autoplayPlugin.current.stop()}
            onMouseLeave={() => autoplayPlugin.current.play()}
          >
            <CarouselContent className="-ml-2">
              {thumbnailImages.map((thumb, index) => (
                <CarouselItem key={thumb.type} className="basis-1/4 pl-2">
                  <button
                    onClick={() => {
                      setShowBack(thumb.type === 'back');
                      carouselApi?.scrollTo(index);
                    }}
                    className={`relative aspect-square w-full rounded-lg overflow-hidden border-2 transition-all ${
                      (showBack && thumb.type === 'back') || (!showBack && thumb.type === 'front')
                        ? 'border-foreground scale-95'
                        : 'border-border hover:border-foreground/50'
                    }`}
                  >
                    <img
                      src={thumb.url}
                      alt={`${product?.name} ${thumb.label}`}
                      className="w-full h-full object-cover"
                      loading="lazy"
                      onError={(e) => {
                        const img = e.currentTarget;
                        if (thumb.type === 'front') {
                          img.src = fallback?.front || '/placeholder.svg';
                        } else {
                          img.src = fallback?.back || '/placeholder.svg';
                        }
                      }}
                    />
                  </button>
                </CarouselItem>
              ))}
            </CarouselContent>
          </Carousel>
          
          {/* Indicator Dots */}
          {thumbnailImages.length > 1 && (
            <div className="flex justify-center gap-2 mt-3">
              {thumbnailImages.map((_, index) => (
                <button
                  key={index}
                  onClick={() => {
                    carouselApi?.scrollTo(index);
                    setShowBack(index === 1 && hasBackImage);
                  }}
                  className={`h-1.5 rounded-full transition-all ${
                    currentThumbnail === index 
                      ? 'w-6 bg-foreground' 
                      : 'w-1.5 bg-border hover:bg-foreground/50'
                  }`}
                  aria-label={`Go to thumbnail ${index + 1}`}
                />
              ))}
            </div>
          )}
        </div>
      </div>
      <div className="container px-6 pb-6">
        {/* Status Badge */}
        {product.stock_status === 'coming_soon' && (
          <Badge className="mb-3 bg-foreground text-background font-bold">
            COMING SOON
          </Badge>
        )}
        {product.stock_status === 'out_of_stock' && (
          <Badge className="mb-3 bg-destructive text-destructive-foreground font-bold">
            STOK HABIS
          </Badge>
        )}

        {/* Product Title */}
        <h1 className="text-3xl font-bold mb-2 uppercase tracking-tight">{product.name}</h1>
        
        {/* Rating Display */}
        {totalReviews > 0 && (
          <div className="flex items-center gap-2 mb-4">
            <div className="flex items-center">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={`w-5 h-5 ${
                    star <= Math.round(averageRating)
                      ? 'fill-yellow-500 text-yellow-500'
                      : 'text-muted-foreground'
                  }`}
                />
              ))}
            </div>
            <span className="text-base font-bold">{averageRating.toFixed(1)}</span>
            <span className="text-sm text-muted-foreground">({totalReviews})</span>
          </div>
        )}

        {/* Price and Wishlist */}
        <div className="flex items-center justify-between mb-8">
          <p className="text-2xl font-bold">{product.price}</p>
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={toggleLike}
              disabled={isLikeLoading}
              className="relative group"
            >
              <Heart 
                className={`h-6 w-6 transition-all duration-300 ${
                  isLiked 
                    ? 'fill-red-500 text-red-500 scale-110' 
                    : 'text-muted-foreground group-hover:text-red-500 group-hover:scale-110'
                }`}
              />
            </Button>
            {likeCount > 0 && (
              <span className="text-sm font-semibold text-muted-foreground">
                {likeCount}
              </span>
            )}
          </div>
        </div>

        {/* Size Selection */}
        <div className="mb-8">
          <h3 className="text-xl font-bold mb-4">Size</h3>
          <div className="grid grid-cols-5 gap-3">
            {sizes.map((size) => (
              <Button
                key={size}
                variant="outline"
                className={`h-16 text-lg font-semibold ${
                  selectedSize === size
                    ? "border-foreground bg-foreground text-background"
                    : "border-border"
                }`}
                onClick={() => setSelectedSize(size)}
                disabled={product.stock_status === 'out_of_stock'}
              >
                {size}
              </Button>
            ))}
          </div>
        </div>

        {/* Add to Cart Button */}
        <Button
          className="w-full h-14 rounded-full text-base font-bold bg-foreground text-background hover:bg-foreground/90"
          onClick={handleAddToCart}
          disabled={product.stock_status === 'out_of_stock' || product.stock_status === 'coming_soon'}
        >
          {product.stock_status === 'out_of_stock' 
            ? 'Stok Habis' 
            : product.stock_status === 'coming_soon'
            ? 'Coming Soon'
            : 'Add to Cart'}
        </Button>

        {/* Product Reviews Section */}
        <div className="mt-12 border-t pt-8">
          <ProductReviews 
            productId={id!} 
            productName={product.name}
          />
        </div>
      </div>
    </div>
  );
};

export default ProductDetail;
