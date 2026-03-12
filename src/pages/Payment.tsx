import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { CheckCircle2, Loader2, Clock } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { loadSnapJs } from "@/lib/midtransSnap";
import { OrderTrackingStepper } from "@/components/orders/OrderTrackingStepper";
import PaymentSuccess from "@/components/payment/PaymentSuccess";

declare global {
  interface Window {
    snap: {
      pay: (
        token: string,
        options: {
          onSuccess?: (result: any) => void;
          onPending?: (result: any) => void;
          onError?: (result: any) => void;
          onClose?: () => void;
        }
      ) => void;
    };
  }
}

const Payment = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get("orderId");
  const orderNumber = searchParams.get("orderNumber");

  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isPaid, setIsPaid] = useState(false);

  // Load Snap.js on mount
  useEffect(() => {
    loadSnapJs().catch(console.error);
  }, []);

  useEffect(() => {
    if (orderId) {
      fetchOrder();

      const channel = supabase
        .channel('payment-status')
        .on('postgres_changes', {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `id=eq.${orderId}`,
        }, (payload) => {
          const newOrder = payload.new as any;
          setOrder(newOrder);
          if (newOrder.order_status === 'paid' || newOrder.payment_status === 'paid') {
            setIsPaid(true);
            toast({ title: "Pembayaran Dikonfirmasi! 🎉", description: "Pesanan Anda sedang diproses." });
          }
        })
        .subscribe();

      return () => { supabase.removeChannel(channel); };
    }
  }, [orderId]);

  const fetchOrder = async () => {
    try {
      const { data, error } = await supabase.from("orders").select("*").eq("id", orderId).single();
      if (error) throw error;
      setOrder(data);
      if (data.order_status !== 'pending' && data.order_status !== 'cancelled') {
        setIsPaid(true);
      }
    } catch (error: any) {
      console.error("Error fetching order:", error);
      toast({ title: "Error", description: "Gagal memuat data pesanan", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const reopenSnap = () => {
    if (!order?.snap_token) {
      toast({ title: "Error", description: "Token pembayaran tidak tersedia", variant: "destructive" });
      return;
    }
    if (window.snap) {
      window.snap.pay(order.snap_token, {
        onSuccess: () => {
          setIsPaid(true);
          toast({ title: "Pembayaran Berhasil! 🎉" });
        },
        onPending: () => {
          toast({ title: "Menunggu Pembayaran", description: "Selesaikan pembayaran sesuai instruksi." });
        },
        onError: () => {
          toast({ title: "Pembayaran Gagal", variant: "destructive" });
        },
        onClose: () => {},
      });
    }
  };

  if (loading) {
    return (
      <div className="container px-4 py-6 pt-24 max-w-2xl space-y-6">
        <div className="text-center space-y-4">
          <Skeleton className="h-16 w-16 rounded-full mx-auto" />
          <Skeleton className="h-8 w-64 mx-auto" />
          <Skeleton className="h-4 w-48 mx-auto" />
        </div>
        <Skeleton className="h-48 w-full rounded-lg" />
      </div>
    );
  }

  if (!order) {
    return <div className="container px-4 py-6 pt-24"><p>Pesanan tidak ditemukan</p></div>;
  }

  // Show success screen
  if (isPaid) {
    return (
      <div className="container px-4 py-6 pt-24 max-w-2xl">
        <PaymentSuccess orderNumber={orderNumber || order.order_number} orderId={orderId!} />

        <div className="mt-8 bg-card border rounded-lg p-6">
          <h2 className="font-bold text-lg mb-2">Status Pesanan</h2>
          <OrderTrackingStepper currentStatus={order.order_status} trackingNumber={order.tracking_number} />
        </div>

        <div className="bg-muted p-6 rounded-lg mt-6">
          <h2 className="font-bold text-lg mb-4">Detail Pesanan</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Produk:</span><span className="font-semibold">{order.product_name}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Ukuran:</span><span className="font-semibold">{order.size}</span></div>
            {order.payment_type && (
              <div className="flex justify-between"><span className="text-muted-foreground">Metode:</span><span className="font-semibold uppercase">{order.payment_type}</span></div>
            )}
            <div className="flex justify-between pt-2 border-t"><span className="font-bold">Total:</span><span className="font-bold">Rp {Number(order.total_amount).toLocaleString("id-ID")}</span></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container px-4 py-6 pt-24 max-w-2xl">
      <div className="text-center mb-8">
        <Clock className="h-16 w-16 mx-auto mb-4 text-yellow-500" />
        <h1 className="text-2xl font-bold mb-2">Menunggu Pembayaran</h1>
        <p className="text-muted-foreground">Nomor Pesanan: {orderNumber || order.order_number}</p>
      </div>

      <div className="bg-card border rounded-lg p-6 mb-6">
        <h2 className="font-bold text-lg mb-2">Status Pesanan</h2>
        <OrderTrackingStepper currentStatus={order.order_status} trackingNumber={order.tracking_number} />
      </div>

      <div className="bg-muted p-6 rounded-lg mb-6">
        <h2 className="font-bold text-lg mb-4">Detail Pesanan</h2>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between"><span className="text-muted-foreground">Produk:</span><span className="font-semibold">{order.product_name}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Ukuran:</span><span className="font-semibold">{order.size}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Harga:</span><span className="font-semibold">{order.product_price}</span></div>
          {order.payment_type && (
            <div className="flex justify-between"><span className="text-muted-foreground">Metode:</span><span className="font-semibold uppercase">{order.payment_type}</span></div>
          )}
          {order.va_number && (
            <div className="flex justify-between"><span className="text-muted-foreground">VA/Kode:</span><span className="font-semibold font-mono">{order.va_number}</span></div>
          )}
          <div className="flex justify-between pt-2 border-t"><span className="font-bold">Total:</span><span className="font-bold">Rp {Number(order.total_amount).toLocaleString("id-ID")}</span></div>
        </div>
      </div>

      {/* Reopen Snap Payment */}
      {order.order_status === 'pending' && order.snap_token && (
        <Button onClick={reopenSnap} className="w-full h-14 rounded-full text-base font-bold mb-3">
          Lanjutkan Pembayaran
        </Button>
      )}

      <div className="space-y-3">
        <Button onClick={() => navigate("/")} variant="outline" className="w-full h-14 rounded-full text-base font-bold">Kembali ke Beranda</Button>
        <Button onClick={() => navigate("/account")} variant="outline" className="w-full h-14 rounded-full text-base font-bold">Lihat Pesanan Saya</Button>
      </div>

      {order.order_status === 'pending' && (
        <div className="mt-6 p-4 bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg">
          <p className="text-sm text-yellow-800 dark:text-yellow-200 text-center font-semibold mb-2">⚠️ Penting: Selesaikan Pembayaran</p>
          <p className="text-sm text-yellow-700 dark:text-yellow-300 text-center">
            Halaman ini akan otomatis berubah saat pembayaran dikonfirmasi via webhook.
          </p>
        </div>
      )}
    </div>
  );
};

export default Payment;
