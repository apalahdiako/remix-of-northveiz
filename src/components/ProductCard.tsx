import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";

interface ProductCardProps {
  id: string;
  name: string;
  price: string;
  image: string;
  comingSoon?: boolean;
}

const ProductCard = ({ id, name, price, image, comingSoon }: ProductCardProps) => {
  return (
    <Link to={`/product/${id}`} className="group">
      <div className="relative aspect-square overflow-hidden rounded-lg bg-muted mb-3">
        {comingSoon && (
          <Badge className="absolute top-3 left-3 z-10 bg-foreground text-background font-bold">
            COMING SOON
          </Badge>
        )}
        <img
          src={image}
          alt={name}
          className="w-full h-full object-cover transition-transform group-hover:scale-105"
        />
      </div>
      <h3 className="font-bold text-sm mb-1 uppercase tracking-tight">{name}</h3>
      <p className="font-bold text-sm">{price}</p>
    </Link>
  );
};

export default ProductCard;
