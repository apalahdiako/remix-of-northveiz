import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { CheckCircle2, Loader2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { OrderTrackingStepper } from "@/components/orders/OrderTrackingStepper";
import PaymentMethodSelector, { type PaymentResult } from "@/components/payment/PaymentMethodSelector";

const Payment = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get("orderId");
  const orderNumber = searchParams.get("orderNumber");
  
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [creatingPayment, setCreatingPayment] = useState(false);
  const [paymentResult, setPaymentResult] = useState<PaymentResult | null>(null);

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

  const createPayment = async (channelId: string) => {
    setCreatingPayment(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-doku-payment", {
        body: { orderId, paymentChannel: channelId },
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error || "Gagal membuat pembayaran");

      // Map response to PaymentResult
      const result: PaymentResult = mapDokuResponse(data, channelId);
      setPaymentResult(result);
    } catch (error: any) {
      console.error("Error creating payment:", error);
      toast({ title: "Error", description: error.message || "Gagal membuat pembayaran", variant: "destructive" });
    } finally {
      setCreatingPayment(false);
    }
  };

  const mapDokuResponse = (data: any, channelId: string): PaymentResult => {
    const dokuRes = data.doku_response?.response || data.doku_response || {};
    const payment = dokuRes.payment || {};
    const vaInfo = dokuRes.virtual_account_info || payment.virtual_account_info || {};
    const qrInfo = dokuRes.qr || payment.qr || {};

    if (channelId === "QRIS") {
      return {
        type: "qris",
        qr_code_url: qrInfo.qr_code_url || qrInfo.url || data.qr_code_url,
        expiry_time: payment.expired_date,
      };
    } else if (["ALFAMART", "INDOMARET"].includes(channelId)) {
      const retailInfo = dokuRes.payment_code_info || payment.payment_code_info || {};
      return {
        type: "retail",
        payment_code: retailInfo.payment_code || data.payment_code || "Menunggu...",
        store_name: channelId === "ALFAMART" ? "Alfamart" : "Indomaret",
        expiry_time: retailInfo.expired_date || payment.expired_date,
      };
    } else if (["BCA", "BNI", "BRI", "MANDIRI", "CIMB", "PERMATA"].includes(channelId)) {
      return {
        type: "va",
        va_number: vaInfo.virtual_account_number || data.va_number || "Menunggu...",
        bank_name: channelId,
        expiry_time: vaInfo.expired_date || payment.expired_date,
      };
    } else {
      return {
        type: "ewallet",
        payment_url: data.payment_url || payment.url,
        expiry_time: payment.expired_date,
      };
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
          <div className="flex justify-between pt-2 border-t"><span className="font-bold">Total:</span><span className="font-bold">Rp {Number(order.total_amount).toLocaleString("id-ID")}</span></div>
        </div>
      </div>

      {/* Inline Payment Method - only show if pending */}
      {order.order_status === 'pending' && (
        <div className="bg-card border rounded-xl p-6 mb-6">
          <h2 className="font-bold text-lg mb-4">Pilih Metode Pembayaran</h2>
          <PaymentMethodSelector
            onPaymentCreated={setPaymentResult}
            onCreatePayment={createPayment}
            loading={creatingPayment}
            paymentResult={paymentResult}
          />
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

      {order.order_status === 'pending' && !paymentResult && (
        <div className="mt-6 p-4 bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg">
          <p className="text-sm text-yellow-800 dark:text-yellow-200 text-center font-semibold mb-2">⚠️ Penting: Selesaikan Pembayaran</p>
          <p className="text-sm text-yellow-700 dark:text-yellow-300 text-center">
            Selesaikan pembayaran dalam 60 menit. Halaman ini akan otomatis berubah saat pembayaran dikonfirmasi.
          </p>
        </div>
      )}
    </div>
  );
};

export default Payment;
