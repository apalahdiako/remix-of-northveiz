import { useEffect, useState } from "react";
import { Heart } from "lucide-react";

interface Burst {
  id: number;
  x: number;
  hue: number;
}

interface Props {
  trigger: number; // increment to spawn a heart
}

const LikeBurst = ({ trigger }: Props) => {
  const [bursts, setBursts] = useState<Burst[]>([]);

  useEffect(() => {
    if (!trigger) return;
    const id = Date.now() + Math.random();
    const b: Burst = {
      id,
      x: Math.random() * 40 - 20,
      hue: Math.floor(Math.random() * 60) + 340,
    };
    setBursts((prev) => [...prev, b]);
    const t = setTimeout(() => {
      setBursts((prev) => prev.filter((x) => x.id !== id));
    }, 2200);
    return () => clearTimeout(t);
  }, [trigger]);

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 h-64 overflow-hidden">
      {bursts.map((b) => (
        <span
          key={b.id}
          className="absolute bottom-2 left-1/2 -translate-x-1/2"
          style={{
            transform: `translateX(calc(-50% + ${b.x}px))`,
            animation: "likeFloat 2.2s ease-out forwards",
            color: `hsl(${b.hue}, 90%, 60%)`,
          }}
        >
          <Heart className="h-8 w-8 fill-current" strokeWidth={0} />
        </span>
      ))}
      <style>{`
        @keyframes likeFloat {
          0% { opacity: 0; transform: translate(-50%, 0) scale(0.5); }
          15% { opacity: 1; transform: translate(-50%, -40px) scale(1.1); }
          100% { opacity: 0; transform: translate(-50%, -220px) scale(0.9) rotate(15deg); }
        }
      `}</style>
    </div>
  );
};

export default LikeBurst;
