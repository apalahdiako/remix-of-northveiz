import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Heart, Loader2 } from "lucide-react";
import { useCart } from "@/hooks/useCart";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from "@/components/ui/carousel";

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
}

const ProductDetail = () => {
  const { id } = useParams();
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);
  const [loading, setLoading] = useState(true);
  const [product, setProduct] = useState<Product | null>(null);
  const [images, setImages] = useState<ProductImage[]>([]);
  const { addItem } = useCart();

  useEffect(() => {
    if (id) {
      fetchProductDetails();
    }
  }, [id]);

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

      // Fetch product images
      const { data: imagesData, error: imagesError } = await supabase
        .from('product_images')
        .select('*')
        .eq('product_id', id)
        .order('display_order');

      if (imagesError) throw imagesError;
      setImages(imagesData || []);
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
      image: images[0]?.image_url || '',
      size: selectedSize,
    });

    toast({
      title: "Added to cart",
      description: `${product.name} (Size ${selectedSize}) has been added to your cart`,
    });
  };

  const scrollTo = (index: number) => {
    api?.scrollTo(index);
  };

  useEffect(() => {
    if (!api) return;

    setCurrent(api.selectedScrollSnap());

    api.on("select", () => {
      setCurrent(api.selectedScrollSnap());
    });
  }, [api]);

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

  const productImages = images.length > 0 ? images : [];

  return (
    <div className="min-h-screen pb-24">
      {/* Product Image Carousel */}
      {productImages.length > 0 && (
        <>
          <Carousel setApi={setApi} className="w-full relative" opts={{ loop: true }}>
            <CarouselContent>
              {productImages.map((image, index) => (
                <CarouselItem key={image.id}>
                  <div className="aspect-square w-full bg-muted">
                    <img
                      src={image.image_url}
                      alt={`${product.name} ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious className="left-4" />
            <CarouselNext className="right-4" />
            
            {/* Slide Indicator */}
            <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2">
              {productImages.map((_, index) => (
                <button
                  key={index}
                  onClick={() => scrollTo(index)}
                  className={`h-2 rounded-full transition-all ${
                    current === index
                      ? "w-8 bg-foreground"
                      : "w-2 bg-foreground/30"
                  }`}
                />
              ))}
            </div>
          </Carousel>

          {/* Thumbnail Navigation */}
          {productImages.length > 1 && (
            <div className="container px-6 py-4">
              <div className="flex gap-3 overflow-x-auto">
                {productImages.map((image, index) => (
                  <button
                    key={image.id}
                    onClick={() => scrollTo(index)}
                    className={`aspect-square w-20 flex-shrink-0 rounded-lg overflow-hidden border-2 transition-all ${
                      current === index
                        ? "border-foreground"
                        : "border-transparent opacity-60"
                    }`}
                  >
                    <img
                      src={image.image_url}
                      alt={`Thumbnail ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            </div>
          )}
        </>
      )}

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
        <h1 className="text-3xl font-bold mb-4 uppercase tracking-tight">{product.name}</h1>

        {/* Price and Wishlist */}
        <div className="flex items-center justify-between mb-8">
          <p className="text-2xl font-bold">{product.price}</p>
          <Button variant="ghost" size="icon">
            <Heart className="h-6 w-6" />
          </Button>
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
      </div>
    </div>
  );
};

export default ProductDetail;
