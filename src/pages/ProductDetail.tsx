import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Heart, Bell } from "lucide-react";
import productDenim from "@/assets/product-denim.jpg";
import productDenimBack from "@/assets/product-denim-back.jpg";
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
  "1": { images: [productDenim, productDenimBack], name: "DENIM WASHED", price: "Rp 699,000" },
  "2": { images: [productJersey, productJerseyBack], name: "FRANCE JERSEY", price: "Rp 549,000" },
  "3": { images: [productBall, productBallBack], name: "CALLE BALL", price: "Rp 399,000" },
  "4": { images: [productHoodie, productHoodieBack], name: "ZIP HOODIE - BRAZIL", price: "Rp 649,000" },
};

const ProductDetail = () => {
  const { id } = useParams();
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);

  const product = productData[id || "1"];
  const productImages = product?.images || [productDenim, productDenimBack];

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
        <Badge className="mb-3 bg-muted text-muted-foreground font-bold">
          Sold Out
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
                className="h-16 text-lg font-semibold relative opacity-40 line-through"
                disabled
              >
                {size}
              </Button>
            ))}
          </div>
        </div>

        {/* Notify Button */}
        <Button
          className="w-full h-14 rounded-full text-base font-bold bg-muted text-muted-foreground hover:bg-muted/80"
          disabled
        >
          <Bell className="h-5 w-5 mr-2" />
          Notify Me
        </Button>
      </div>
    </div>
  );
};

export default ProductDetail;
