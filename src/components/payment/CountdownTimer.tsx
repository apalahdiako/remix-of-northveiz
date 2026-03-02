import { useState, useEffect } from "react";
import { Clock } from "lucide-react";

interface CountdownTimerProps {
  expiryTime: string;
  onExpired?: () => void;
}

const CountdownTimer = ({ expiryTime, onExpired }: CountdownTimerProps) => {
  const [timeLeft, setTimeLeft] = useState({ hours: 0, minutes: 0, seconds: 0, expired: false });

  useEffect(() => {
    const calcTimeLeft = () => {
      const now = new Date().getTime();
      const expiry = new Date(expiryTime).getTime();
      const diff = expiry - now;

      if (diff <= 0) {
        setTimeLeft({ hours: 0, minutes: 0, seconds: 0, expired: true });
        onExpired?.();
        return;
      }

      setTimeLeft({
        hours: Math.floor(diff / (1000 * 60 * 60)),
        minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((diff % (1000 * 60)) / 1000),
        expired: false,
      });
    };

    calcTimeLeft();
    const interval = setInterval(calcTimeLeft, 1000);
    return () => clearInterval(interval);
  }, [expiryTime, onExpired]);

  if (timeLeft.expired) {
    return (
      <div className="flex items-center justify-center gap-2 p-3 bg-destructive/10 border border-destructive/30 rounded-lg">
        <Clock className="w-4 h-4 text-destructive" />
        <span className="text-sm font-semibold text-destructive">Waktu pembayaran habis</span>
      </div>
    );
  }

  const pad = (n: number) => String(n).padStart(2, "0");

  return (
    <div className="flex items-center justify-center gap-2 p-3 bg-primary/5 border border-primary/20 rounded-lg">
      <Clock className="w-4 h-4 text-primary" />
      <span className="text-sm text-muted-foreground">Selesaikan dalam</span>
      <div className="flex items-center gap-1">
        <span className="bg-primary text-primary-foreground px-2 py-1 rounded font-mono font-bold text-sm">{pad(timeLeft.hours)}</span>
        <span className="font-bold">:</span>
        <span className="bg-primary text-primary-foreground px-2 py-1 rounded font-mono font-bold text-sm">{pad(timeLeft.minutes)}</span>
        <span className="font-bold">:</span>
        <span className="bg-primary text-primary-foreground px-2 py-1 rounded font-mono font-bold text-sm">{pad(timeLeft.seconds)}</span>
      </div>
    </div>
  );
};

export default CountdownTimer;
