import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { CheckCircle2, Copy, Loader2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { OrderTrackingStepper } from "@/components/orders/OrderTrackingStepper";

const Payment = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get("orderId");
  const orderNumber = searchParams.get("orderNumber");
  
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (orderId) {
      fetchOrder();

      // Real-time listener: auto-redirect when paid
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
    } catch (error: any) {
      console.error("Error fetching order:", error);
      toast({ title: "Error", description: "Gagal memuat data pesanan", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Berhasil disalin!", description: "Teks telah disalin ke clipboard" });
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
        <Skeleton className="h-64 w-full rounded-lg" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="container px-4 py-6 pt-24"><p>Pesanan tidak ditemukan</p></div>
    );
  }

  const isPaid = order.order_status !== 'pending' && order.order_status !== 'cancelled';

  return (
    <div className="container px-4 py-6 pt-24 max-w-2xl">
      <div className="text-center mb-8">
        <CheckCircle2 className={`h-16 w-16 mx-auto mb-4 ${isPaid ? 'text-green-500' : 'text-yellow-500'}`} />
        <h1 className="text-2xl font-bold mb-2">
          {isPaid ? 'Pembayaran Dikonfirmasi!' : 'Pesanan Berhasil Dibuat!'}
        </h1>
        <p className="text-muted-foreground">Nomor Pesanan: {orderNumber || order.order_number}</p>
      </div>

      {/* Order Tracking Stepper */}
      <div className="bg-card border rounded-lg p-6 mb-6">
        <h2 className="font-bold text-lg mb-2">Status Pesanan</h2>
        <OrderTrackingStepper currentStatus={order.order_status} trackingNumber={order.tracking_number} />
      </div>

      {/* Order Details */}
      <div className="bg-muted p-6 rounded-lg mb-6">
        <h2 className="font-bold text-lg mb-4">Detail Pesanan</h2>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between"><span className="text-muted-foreground">Produk:</span><span className="font-semibold">{order.product_name}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Ukuran:</span><span className="font-semibold">{order.size}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Harga:</span><span className="font-semibold">{order.product_price}</span></div>
          <div className="flex justify-between pt-2 border-t"><span className="font-bold">Total:</span><span className="font-bold">{order.product_price}</span></div>
        </div>
      </div>

      {/* Payment Instructions - only show if not yet paid */}
      {order.order_status === 'pending' && (
        <div className="bg-card border rounded-lg p-6 mb-6">
          <h2 className="font-bold text-lg mb-4">Instruksi Pembayaran</h2>
          {order.payment_method === "bank_transfer" && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">Silakan transfer ke rekening berikut:</p>
              <div className="bg-muted p-4 rounded-lg space-y-3">
                <div><p className="text-sm text-muted-foreground">Bank</p><p className="font-bold">BCA</p></div>
                <div>
                  <p className="text-sm text-muted-foreground">Nomor Rekening</p>
                  <div className="flex items-center gap-2">
                    <p className="font-bold">1234567890</p>
                    <Button variant="ghost" size="sm" onClick={() => copyToClipboard("1234567890")}><Copy className="h-4 w-4" /></Button>
                  </div>
                </div>
                <div><p className="text-sm text-muted-foreground">Atas Nama</p><p className="font-bold">NORTHVEIZ STORE</p></div>
                <div><p className="text-sm text-muted-foreground">Jumlah Transfer</p><p className="font-bold text-lg">{order.product_price}</p></div>
              </div>
            </div>
          )}
          {order.payment_method === "credit_card" && (
            <div className="text-center py-8"><p className="text-muted-foreground">Integrasi payment gateway segera tersedia</p></div>
          )}
          {order.payment_method === "ewallet" && (
            <div className="text-center py-8"><p className="text-muted-foreground">Pembayaran e-Wallet segera tersedia</p></div>
          )}
        </div>
      )}

      {/* Shipping Info */}
      <div className="bg-muted p-6 rounded-lg mb-6">
        <h2 className="font-bold text-lg mb-4">Informasi Pengiriman</h2>
        <div className="space-y-2 text-sm">
          <div><p className="text-muted-foreground">Nama</p><p className="font-semibold">{order.customer_name}</p></div>
          <div><p className="text-muted-foreground">Alamat</p><p className="font-semibold">{order.shipping_address}</p><p className="font-semibold">{order.city}, {order.postal_code}</p></div>
          <div><p className="text-muted-foreground">Kontak</p><p className="font-semibold">{order.customer_phone}</p><p className="font-semibold">{order.customer_email}</p></div>
        </div>
      </div>

      <div className="space-y-3">
        <Button onClick={() => navigate("/")} className="w-full h-14 rounded-full text-base font-bold">Kembali ke Beranda</Button>
        <Button onClick={() => navigate("/account")} variant="outline" className="w-full h-14 rounded-full text-base font-bold">Lihat Pesanan Saya</Button>
      </div>

      {order.order_status === 'pending' && (
        <div className="mt-6 p-4 bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg">
          <p className="text-sm text-yellow-800 dark:text-yellow-200 text-center font-semibold mb-2">⚠️ Penting: Selesaikan Pembayaran</p>
          <p className="text-sm text-yellow-700 dark:text-yellow-300 text-center">
            Silakan transfer sesuai instruksi di atas. Tim kami akan mengkonfirmasi pembayaran Anda. Halaman ini akan otomatis berubah saat pembayaran dikonfirmasi.
          </p>
        </div>
      )}
    </div>
  );
};

export default Payment;
