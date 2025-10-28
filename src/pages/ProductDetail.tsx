import { useState } from "react";
import { useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Heart, Bell } from "lucide-react";
import productDenim from "@/assets/product-denim.jpg";

const sizes = ["S", "M", "L", "XL", "XXL"];

const ProductDetail = () => {
  const { id } = useParams();
  const [selectedSize, setSelectedSize] = useState<string | null>(null);

  return (
    <div className="min-h-screen pb-24">
      {/* Product Image */}
      <div className="aspect-square w-full bg-muted">
        <img
          src={productDenim}
          alt="DENIM WASHED"
          className="w-full h-full object-cover"
        />
      </div>

      <div className="container px-6 py-6">
        {/* Status Badge */}
        <Badge className="mb-3 bg-muted text-muted-foreground font-bold">
          Sold Out
        </Badge>

        {/* Product Title */}
        <h1 className="text-3xl font-bold mb-4 uppercase tracking-tight">DENIM WASHED</h1>

        {/* Price and Wishlist */}
        <div className="flex items-center justify-between mb-8">
          <p className="text-2xl font-bold">Rp 699,000</p>
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
