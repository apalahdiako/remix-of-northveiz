import { Link, useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getProductImageFallback } from "@/lib/productImageFallbacks";

interface ProductCardProps {
  id: string;
  name: string;
  price: string;
  image: string;
  comingSoon?: boolean;
  outOfStock?: boolean;
}

const ProductCard = ({ id, name, price, image, comingSoon, outOfStock }: ProductCardProps) => {
  const navigate = useNavigate();
  const fallback = getProductImageFallback(id);
  const displaySrc = image || fallback?.front || '/placeholder.svg';

  const handleBuyNow = (e: React.MouseEvent) => {
    e.preventDefault();
    navigate(`/buy-now?id=${id}&name=${encodeURIComponent(name)}&price=${encodeURIComponent(price)}&image=${encodeURIComponent(displaySrc)}`);
  };

  return (
    <div className="group">
      <Link to={`/product/${id}`}>
        <div className="relative aspect-square overflow-hidden rounded-lg bg-muted mb-3">
          {comingSoon && (
            <Badge className="absolute top-3 left-3 z-10 bg-foreground text-background font-bold">
              COMING SOON
            </Badge>
          )}
          {outOfStock && (
            <Badge className="absolute top-3 left-3 z-10 bg-destructive text-destructive-foreground font-bold">
              STOK HABIS
            </Badge>
          )}
          <img
            src={displaySrc}
            alt={name}
            className="w-full h-full object-cover transition-transform group-hover:scale-105"
            loading="lazy"
            decoding="async"
            onError={(e) => { e.currentTarget.src = fallback?.front || '/placeholder.svg'; }}
          />
        </div>
      </Link>
      <Link to={`/product/${id}`}>
        <h3 className="font-bold text-sm mb-1 uppercase tracking-tight">{name}</h3>
        <p className="font-bold text-sm mb-2">{price}</p>
      </Link>
      <Button
        onClick={handleBuyNow}
        className="w-full h-9 rounded-full text-sm font-bold"
      >
        Buy Now
      </Button>
    </div>
  );
};

export default ProductCard;
