// Local fallback images for specific product IDs/slugs
import hoodieFront from "@/assets/product-hoodie-pecah-front.webp";
import hoodieBack from "@/assets/product-hoodie-pecah-back.webp";
import denimFront from "@/assets/product-denim.jpg";
import denimBack from "@/assets/product-denim-back.jpg";
import hoodieGeneric from "@/assets/product-hoodie.jpg";
import ballFront from "@/assets/product-ball.jpg";
import ballBack from "@/assets/product-ball-back.jpg";
import jerseyFront from "@/assets/product-jersey.jpg";
import jerseyBack from "@/assets/product-jersey-back.jpg";

export type FallbackPair = { front?: string; back?: string };

const map: Record<string, FallbackPair> = {
  "hoodie-pecah": { front: hoodieFront, back: hoodieBack },
  denim: { front: denimFront, back: denimBack },
  hoodie: { front: hoodieGeneric },
  ball: { front: ballFront, back: ballBack },
  jersey: { front: jerseyFront, back: jerseyBack },
  KEMEJA: { front: jerseyFront }, // loose fallback for uppercase demo item
};

export const getProductImageFallback = (productId?: string): FallbackPair | undefined => {
  if (!productId) return undefined;
  return map[productId] || map[productId.toLowerCase()];
};
