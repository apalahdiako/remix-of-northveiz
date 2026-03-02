import { CheckCircle2, PartyPopper } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";

interface PaymentSuccessProps {
  orderNumber: string;
  orderId: string;
}

const PaymentSuccess = ({ orderNumber, orderId }: PaymentSuccessProps) => {
  const navigate = useNavigate();
  const [showConfetti, setShowConfetti] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setShowConfetti(false), 3000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="text-center space-y-6 py-8 animate-in fade-in-0 zoom-in-95 duration-500">
      <div className="relative inline-block">
        <CheckCircle2 className="w-20 h-20 text-green-500 mx-auto animate-in zoom-in-50 duration-700" />
        {showConfetti && (
          <PartyPopper className="w-8 h-8 text-yellow-500 absolute -top-2 -right-2 animate-bounce" />
        )}
      </div>

      <div>
        <h2 className="text-2xl font-bold text-green-600 mb-2">Pembayaran Berhasil! 🎉</h2>
        <p className="text-muted-foreground">Pesanan kamu sedang diproses</p>
      </div>

      <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-xl p-4">
        <p className="text-sm text-muted-foreground">Nomor Pesanan</p>
        <p className="text-lg font-bold font-mono">{orderNumber}</p>
      </div>

      <div className="space-y-3 pt-4">
        <Button
          onClick={() => navigate(`/payment?orderId=${orderId}&orderNumber=${orderNumber}`)}
          className="w-full h-14 rounded-full text-base font-bold"
        >
          Lihat Detail Pesanan
        </Button>
        <Button
          onClick={() => navigate("/account")}
          variant="outline"
          className="w-full h-14 rounded-full text-base font-bold"
        >
          Pesanan Saya
        </Button>
        <Button
          onClick={() => navigate("/")}
          variant="ghost"
          className="w-full h-12 rounded-full text-base"
        >
          Kembali ke Beranda
        </Button>
      </div>
    </div>
  );
};

export default PaymentSuccess;
