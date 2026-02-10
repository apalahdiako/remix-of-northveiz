import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Heart, Loader2, Star } from "lucide-react";
import { useCart } from "@/hooks/useCart";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { getProductImageFallback } from "@/lib/productImageFallbacks";
import { ProductReviews } from "@/components/ProductReviews";
import { useProductLikes } from "@/hooks/useProductLikes";

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

  const fallback = getProductImageFallback(id || undefined);
  const hasBackImage = !!backImage || !!fallback?.back;
  const displayUrl = (showBack
    ? (backImage?.image_url || fallback?.back)
    : (frontImage?.image_url || fallback?.front)
  ) || (product as any)?.image || '/placeholder.svg';

  return (
    <div className="min-h-screen pb-24 pt-16">
      {/* Product Image - Tap to flip */}
      <div
        className="relative aspect-square w-full bg-muted overflow-hidden cursor-pointer"
        onClick={() => hasBackImage && setShowBack(!showBack)}
      >
        <img
          src={displayUrl}
          alt={`${product?.name} ${showBack ? 'Back' : 'Front'}`}
          className="w-full h-full object-cover transition-all duration-500"
          loading="lazy"
          decoding="async"
          onError={(e) => {
            e.currentTarget.src = fallback?.front || '/placeholder.svg';
          }}
        />
        {hasBackImage && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
            <span className={`h-2 w-2 rounded-full transition-all ${!showBack ? 'bg-foreground' : 'bg-foreground/30'}`} />
            <span className={`h-2 w-2 rounded-full transition-all ${showBack ? 'bg-foreground' : 'bg-foreground/30'}`} />
          </div>
        )}
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
