import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { ArrowLeft, Loader2, AlertTriangle } from "lucide-react";
import { useCart } from "@/hooks/useCart";
import { useAuth } from "@/hooks/useAuth";
import { Separator } from "@/components/ui/separator";
import { z } from "zod";
import PaymentSuccess from "@/components/payment/PaymentSuccess";
import { loadSnapJs } from "@/lib/midtransSnap";

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

const MIN_AMOUNT = 10000;

const checkoutSchema = z.object({
  customerName: z.string().trim().min(2, "Nama minimal 2 karakter").max(100),
  customerEmail: z.string().trim().email("Email tidak valid").max(255),
  customerPhone: z.string().trim().regex(/^[0-9+\-\s()]{8,20}$/, "Nomor telepon tidak valid"),
  shippingAddress: z.string().trim().min(10, "Alamat minimal 10 karakter").max(500),
  city: z.string().trim().min(2, "Kota minimal 2 karakter").max(100),
  postalCode: z.string().trim().regex(/^[0-9]{5,10}$/, "Kode pos harus 5-10 digit angka"),
});

const Checkout = () => {
  const navigate = useNavigate();
  const { items, getTotalPrice, clearCart } = useCart();
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [orderNumber, setOrderNumber] = useState<string | null>(null);
  const [isPaid, setIsPaid] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [user, authLoading, navigate]);

  // Realtime listener for payment status
  useEffect(() => {
    if (!orderId) return;
    const channel = supabase
      .channel(`checkout-payment-${orderId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'orders',
        filter: `id=eq.${orderId}`,
      }, (payload) => {
        const newOrder = payload.new as any;
        if (newOrder.order_status === 'paid' || newOrder.payment_status === 'paid') {
          setIsPaid(true);
          toast({ title: "Pembayaran Berhasil! 🎉", description: "Pesanan kamu sedang diproses." });
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [orderId]);

  const [formData, setFormData] = useState({
    customerName: "", customerEmail: "", customerPhone: "",
    shippingAddress: "", city: "", postalCode: "",
  });

  const formatPrice = (price: number) => `Rp ${price.toLocaleString("id-ID")}`;
  const totalPrice = getTotalPrice();
  const isBelowMinimum = totalPrice > 0 && totalPrice < MIN_AMOUNT;

  const handleSubmit = async () => {
    if (items.length === 0) {
      toast({ title: "Cart kosong", description: "Tambahkan produk terlebih dahulu", variant: "destructive" });
      return;
    }

    if (isBelowMinimum) {
      toast({
        title: "Minimal Transaksi",
        description: `Minimal transaksi Rp${MIN_AMOUNT.toLocaleString("id-ID")}. Beberapa metode pembayaran (Alfamart/Indomaret) tidak tersedia di bawah nominal tersebut.`,
        variant: "destructive",
      });
      return;
    }

    const validationResult = checkoutSchema.safeParse(formData);
    if (!validationResult.success) {
      toast({ title: "Validasi Gagal", description: validationResult.error.issues[0].message, variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const newOrderNumber = `ORD-${Date.now()}`;
      const { data: { user: currentUser } } = await supabase.auth.getUser();

      const p_items = items.map(item => ({
        product_id: item.id, quantity: item.quantity, size: item.size,
        product_name: item.name, product_price: formatPrice(item.price), product_image: item.image,
      }));

      // Step 1: Create order via RPC
      const { data: newOrderId, error } = await supabase.rpc('checkout_order', {
        p_user_id: currentUser?.id || null,
        p_order_number: newOrderNumber,
        p_customer_name: formData.customerName,
        p_customer_email: formData.customerEmail,
        p_customer_phone: formData.customerPhone,
        p_shipping_address: formData.shippingAddress,
        p_city: formData.city,
        p_postal_code: formData.postalCode,
        p_payment_method: "midtrans_snap",
        p_items: p_items,
      });

      if (error) throw error;

      setOrderId(newOrderId);
      setOrderNumber(newOrderNumber);

      // Step 2: Get Snap token from edge function
      const { data: payData, error: payError } = await supabase.functions.invoke("initiate-payment", {
        body: { orderId: newOrderId },
      });

      if (payError) throw payError;
      if (!payData.success) throw new Error(payData.error || "Gagal membuat pembayaran");

      const snapToken = payData.snap_token;
      if (!snapToken) throw new Error("Snap token tidak ditemukan");

      // Step 3: Open Midtrans Snap popup
      clearCart();
      toast({ title: "Pesanan berhasil dibuat!", description: `Nomor pesanan: ${newOrderNumber}` });

      if (window.snap) {
        window.snap.pay(snapToken, {
          onSuccess: (result: any) => {
            console.log("Payment success:", result);
            setIsPaid(true);
            toast({ title: "Pembayaran Berhasil! 🎉", description: "Pesanan kamu sedang diproses." });
          },
          onPending: (result: any) => {
            console.log("Payment pending:", result);
            toast({ title: "Menunggu Pembayaran", description: "Selesaikan pembayaran sesuai instruksi." });
            navigate(`/payment?orderId=${newOrderId}&orderNumber=${newOrderNumber}`);
          },
          onError: (result: any) => {
            console.error("Payment error:", result);
            toast({ title: "Pembayaran Gagal", description: "Silakan coba lagi.", variant: "destructive" });
          },
          onClose: () => {
            console.log("Snap popup closed");
            // Navigate to payment page so user can see order status
            navigate(`/payment?orderId=${newOrderId}&orderNumber=${newOrderNumber}`);
          },
        });
      } else {
        // Fallback: redirect to Midtrans payment page
        if (payData.redirect_url) {
          window.location.href = payData.redirect_url;
        } else {
          navigate(`/payment?orderId=${newOrderId}&orderNumber=${newOrderNumber}`);
        }
      }
    } catch (error: any) {
      console.error("Error creating order:", error);
      const message = error.message?.includes('Stok tidak cukup') ? error.message : error.message || "Gagal membuat pesanan";
      toast({ title: "Error", description: message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="container px-4 py-6 pt-24 max-w-2xl flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (!user) return null;

  // Show success screen when paid
  if (isPaid && orderId && orderNumber) {
    return (
      <div className="container px-4 py-6 pt-24 max-w-2xl">
        <PaymentSuccess orderNumber={orderNumber} orderId={orderId} />
      </div>
    );
  }

  return (
    <div className="container px-4 py-6 pt-24 max-w-2xl">
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 mb-6 hover:opacity-70 transition-opacity">
        <ArrowLeft className="h-5 w-5" /><span className="font-semibold">Kembali</span>
      </button>

      <h1 className="text-3xl font-bold mb-6">Checkout</h1>

      {/* Minimum Amount Warning */}
      {isBelowMinimum && (
        <div className="flex items-start gap-3 p-4 mb-6 bg-destructive/10 border border-destructive/30 rounded-lg">
          <AlertTriangle className="w-5 h-5 text-destructive mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold text-destructive text-sm">Nominal di bawah minimum</p>
            <p className="text-sm text-destructive/80">
              Minimal transaksi Rp{MIN_AMOUNT.toLocaleString("id-ID")}. Metode pembayaran seperti Alfamart/Indomaret tidak tersedia di bawah nominal tersebut.
            </p>
          </div>
        </div>
      )}

      {/* Order Summary */}
      <div className="bg-muted p-4 rounded-lg mb-6">
        <h2 className="font-bold text-lg mb-4">Ringkasan Pesanan</h2>
        {items.length === 0 ? (
          <p className="text-muted-foreground text-center py-4">Cart kosong.</p>
        ) : (
          <div className="space-y-4">
            {items.map((item) => (
              <div key={`${item.id}-${item.size}`} className="flex gap-4 pb-4 border-b last:border-0">
                <img src={item.image} alt={item.name} className="w-20 h-20 object-cover rounded" />
                <div className="flex-1">
                  <h3 className="font-bold text-sm uppercase">{item.name}</h3>
                  <p className="text-sm text-muted-foreground">Ukuran: {item.size}</p>
                  <p className="text-sm text-muted-foreground">Qty: {item.quantity}</p>
                  <p className="font-bold mt-2">{formatPrice(item.price * item.quantity)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Shipping Form */}
      <div className="mb-6">
        <h2 className="font-bold text-lg mb-4">Informasi Pengiriman</h2>
        <div className="space-y-4">
          <div><Label htmlFor="customerName">Nama Lengkap *</Label><Input id="customerName" required value={formData.customerName} onChange={(e) => setFormData({ ...formData, customerName: e.target.value })} /></div>
          <div><Label htmlFor="customerEmail">Email *</Label><Input id="customerEmail" type="email" required value={formData.customerEmail} onChange={(e) => setFormData({ ...formData, customerEmail: e.target.value })} /></div>
          <div><Label htmlFor="customerPhone">Nomor Telepon *</Label><Input id="customerPhone" type="tel" required value={formData.customerPhone} onChange={(e) => setFormData({ ...formData, customerPhone: e.target.value })} /></div>
          <div><Label htmlFor="shippingAddress">Alamat Lengkap *</Label><Input id="shippingAddress" required value={formData.shippingAddress} onChange={(e) => setFormData({ ...formData, shippingAddress: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><Label htmlFor="city">Kota *</Label><Input id="city" required value={formData.city} onChange={(e) => setFormData({ ...formData, city: e.target.value })} /></div>
            <div><Label htmlFor="postalCode">Kode Pos *</Label><Input id="postalCode" required value={formData.postalCode} onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })} /></div>
          </div>
        </div>
      </div>

      {/* Total */}
      <div className="border-t pt-6 space-y-3 mb-6">
        <div className="flex justify-between items-center"><span className="text-muted-foreground">Subtotal</span><span className="font-semibold">{formatPrice(totalPrice)}</span></div>
        <div className="flex justify-between items-center"><span className="text-muted-foreground">Pengiriman</span><span className="font-semibold">Gratis</span></div>
        <Separator className="my-2" />
        <div className="flex justify-between items-center"><span className="text-lg font-bold">Total</span><span className="text-lg font-bold">{formatPrice(totalPrice)}</span></div>
      </div>

      {/* Payment info */}
      <div className="bg-muted/50 border rounded-lg p-4 mb-6">
        <p className="text-sm text-muted-foreground text-center">
          Setelah klik tombol di bawah, popup Midtrans akan muncul untuk memilih metode pembayaran (Transfer Bank, e-Wallet, QRIS, Kartu Kredit, Alfamart/Indomaret, dll).
        </p>
      </div>

      <Button onClick={handleSubmit} className="w-full h-14 rounded-full text-base font-bold" disabled={loading || items.length === 0 || isBelowMinimum}>
        {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Memproses...</> : "BAYAR SEKARANG"}
      </Button>
    </div>
  );
};

export default Checkout;
