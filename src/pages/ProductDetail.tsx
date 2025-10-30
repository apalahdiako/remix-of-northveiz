import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Heart } from "lucide-react";
import { useCart } from "@/hooks/useCart";
import { toast } from "@/hooks/use-toast";
import productHoodiePecahFront from "@/assets/product-hoodie-pecah-front.webp";
import productHoodiePecahBack from "@/assets/product-hoodie-pecah-back.webp";
import productJersey from "@/assets/product-jersey.jpg";
import productJerseyBack from "@/assets/product-jersey-back.jpg";
import productBall from "@/assets/product-ball.jpg";
import productBallBack from "@/assets/product-ball-back.jpg";
import productHoodie from "@/assets/product-hoodie.jpg";
import productHoodieBack from "@/assets/product-hoodie-back.jpg";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from "@/components/ui/carousel";

const sizes = ["S", "M", "L", "XL", "XXL"];

const productData: Record<string, { images: string[]; name: string; price: string }> = {
  "1": { images: [productHoodiePecahFront, productHoodiePecahBack], name: "HOODIE PECAH POLA", price: "Rp 180,000" },
  "2": { images: [productJersey, productJerseyBack], name: "FRANCE JERSEY", price: "Rp 549,000" },
  "3": { images: [productBall, productBallBack], name: "CALLE BALL", price: "Rp 399,000" },
  "4": { images: [productHoodie, productHoodieBack], name: "ZIP HOODIE - BRAZIL", price: "Rp 649,000" },
};

const ProductDetail = () => {
  const { id } = useParams();
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);
  const { addItem } = useCart();

  const product = productData[id || "1"];
  const productImages = product?.images || [productHoodiePecahFront, productHoodiePecahBack];

  const handleAddToCart = () => {
    if (!selectedSize) {
      toast({
        title: "Please select a size",
        description: "You need to select a size before adding to cart",
        variant: "destructive",
      });
      return;
    }

    addItem({
      id: id!,
      name: product.name,
      price: parseFloat(product.price.replace(/[^0-9]/g, "")),
      image: product.images[0],
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

  return (
    <div className="min-h-screen pb-24">
      {/* Product Image Carousel */}
      <Carousel setApi={setApi} className="w-full relative" opts={{ loop: true }}>
        <CarouselContent>
          {productImages.map((image, index) => (
            <CarouselItem key={index}>
              <div className="aspect-square w-full bg-muted">
                <img
                  src={image}
                  alt={`${product?.name || 'Product'} ${index === 0 ? 'front' : 'back'} view`}
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
      <div className="container px-6 py-4">
        <div className="flex gap-3">
          {productImages.map((image, index) => (
            <button
              key={index}
              onClick={() => scrollTo(index)}
              className={`aspect-square w-20 rounded-lg overflow-hidden border-2 transition-all ${
                current === index
                  ? "border-foreground"
                  : "border-transparent opacity-60"
              }`}
            >
              <img
                src={image}
                alt={`Thumbnail ${index + 1}`}
                className="w-full h-full object-cover"
              />
            </button>
          ))}
        </div>
      </div>

      <div className="container px-6 pb-6">
        {/* Status Badge */}
        <Badge className="mb-3 bg-foreground text-background font-bold">
          COMING SOON
        </Badge>

        {/* Product Title */}
        <h1 className="text-3xl font-bold mb-4 uppercase tracking-tight">{product?.name || 'Product'}</h1>

        {/* Price and Wishlist */}
        <div className="flex items-center justify-between mb-8">
          <p className="text-2xl font-bold">{product?.price || 'Price'}</p>
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
        >
          Add to Cart
        </Button>
      </div>
    </div>
  );
};

export default ProductDetail;
