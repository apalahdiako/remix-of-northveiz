import { Link, useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { getProductImageFallback } from "@/lib/productImageFallbacks";
import { useProductLikes } from "@/hooks/useProductLikes";
import { Heart } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

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
  const { isLiked, toggleLike, isLoading } = useProductLikes(id);
  const fallback = getProductImageFallback(id);
  const primary = image || fallback?.front || "/placeholder.svg";
  const [secondary, setSecondary] = useState<string | null>(fallback?.back || null);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data } = await supabase
        .from("product_images")
        .select("image_url,image_type")
        .eq("product_id", id)
        .eq("image_type", "back")
        .limit(1);
      if (active && data && data[0]?.image_url) setSecondary(data[0].image_url);
    })();
    return () => {
      active = false;
    };
  }, [id]);

  const handleWishlist = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleLike();
  };

  return (
    <div className="group">
      <Link to={`/product/${id}`} className="block">
        <div className="relative aspect-[3/4] overflow-hidden bg-muted">
          {comingSoon && (
            <span className="absolute top-3 left-3 z-10 eyebrow bg-background/80 backdrop-blur px-2 py-1">
              Coming soon
            </span>
          )}
          {outOfStock && (
            <span className="absolute top-3 left-3 z-10 eyebrow bg-background/80 backdrop-blur px-2 py-1 text-destructive">
              Sold out
            </span>
          )}

          <img
            src={primary}
            alt={name}
            className={`w-full h-full object-cover transition-opacity duration-500 ${
              secondary ? "group-hover:opacity-0" : "group-hover:scale-[1.02]"
            }`}
            loading="lazy"
            decoding="async"
            onError={(e) => {
              e.currentTarget.src = fallback?.front || "/placeholder.svg";
            }}
          />
          {secondary && (
            <img
              src={secondary}
              alt={`${name} alternate`}
              className="absolute inset-0 w-full h-full object-cover opacity-0 group-hover:opacity-100 transition-opacity duration-500"
              loading="lazy"
              decoding="async"
            />
          )}

          <button
            type="button"
            onClick={handleWishlist}
            disabled={isLoading}
            aria-label="Add to wishlist"
            className="absolute top-3 right-3 z-10 h-9 w-9 grid place-items-center bg-background/70 backdrop-blur opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <Heart
              className={`h-4 w-4 transition-colors ${
                isLiked ? "fill-accent text-accent" : "text-foreground"
              }`}
              strokeWidth={1.5}
            />
          </button>
        </div>
      </Link>

      <Link to={`/product/${id}`} className="block pt-4 pb-1">
        <h3 className="eyebrow mb-2 truncate">{name}</h3>
        <p className="text-sm font-light tracking-wide text-foreground">{price}</p>
      </Link>
    </div>
  );
};

export default ProductCard;
