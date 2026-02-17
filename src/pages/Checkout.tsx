import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useCart } from "@/hooks/useCart";
import { useAuth } from "@/hooks/useAuth";
import { Separator } from "@/components/ui/separator";
import { z } from "zod";
import PaymentMethodSelector, { type PaymentResult } from "@/components/payment/PaymentMethodSelector";

const Checkout = () => {
  const navigate = useNavigate();
  const { items, getTotalPrice, clearCart } = useCart();
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(false);
  const [selectedChannel, setSelectedChannel] = useState<string>("");
  const [paymentResult, setPaymentResult] = useState<PaymentResult | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [orderNumber, setOrderNumber] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  const [formData, setFormData] = useState({
    customerName: "",
    customerEmail: "",
    customerPhone: "",
    shippingAddress: "",
    city: "",
    postalCode: "",
  });

  const formatPrice = (price: number) => `Rp ${price.toLocaleString("id-ID")}`;

  const checkoutSchema = z.object({
    customerName: z.string().trim().min(2, "Nama minimal 2 karakter").max(100),
    customerEmail: z.string().trim().email("Email tidak valid").max(255),
    customerPhone: z.string().trim().regex(/^[0-9+\-\s()]{8,20}$/, "Nomor telepon tidak valid"),
    shippingAddress: z.string().trim().min(10, "Alamat minimal 10 karakter").max(500),
    city: z.string().trim().min(2, "Kota minimal 2 karakter").max(100),
    postalCode: z.string().trim().regex(/^[0-9]{5,10}$/, "Kode pos harus 5-10 digit angka"),
  });

  const handleSubmit = async (channelId: string) => {
    if (items.length === 0) {
      toast({ title: "Cart kosong", description: "Silakan tambahkan produk ke cart terlebih dahulu", variant: "destructive" });
      return;
    }

    if (!channelId) {
      toast({ title: "Pilih metode", description: "Silakan pilih metode pembayaran terlebih dahulu", variant: "destructive" });
      return;
    }

    const validationResult = checkoutSchema.safeParse(formData);
    if (!validationResult.success) {
      toast({ title: "Validasi Gagal", description: validationResult.error.issues[0].message, variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      // Step 1: Create order
      const newOrderNumber = `ORD-${Date.now()}`;
      const { data: { user: currentUser } } = await supabase.auth.getUser();

      const p_items = items.map(item => ({
        product_id: item.id,
        quantity: item.quantity,
        size: item.size,
        product_name: item.name,
        product_price: formatPrice(item.price),
        product_image: item.image,
      }));

      const { data: newOrderId, error } = await supabase.rpc('checkout_order', {
        p_user_id: currentUser?.id || null,
        p_order_number: newOrderNumber,
        p_customer_name: formData.customerName,
        p_customer_email: formData.customerEmail,
        p_customer_phone: formData.customerPhone,
        p_shipping_address: formData.shippingAddress,
        p_city: formData.city,
        p_postal_code: formData.postalCode,
        p_payment_method: channelId,
        p_items: p_items,
      });

      if (error) throw error;

      setOrderId(newOrderId);
      setOrderNumber(newOrderNumber);

      // Step 2: Create payment via edge function
      const { data: payData, error: payError } = await supabase.functions.invoke("create-doku-payment", {
        body: { orderId: newOrderId, paymentChannel: channelId },
      });

      if (payError) throw payError;
      if (!payData.success) throw new Error(payData.error || "Gagal membuat pembayaran");

      const result = mapDokuResponse(payData, channelId);
      setPaymentResult(result);

      toast({ title: "Pesanan berhasil dibuat!", description: `Nomor pesanan: ${newOrderNumber}` });
      clearCart();
    } catch (error: any) {
      console.error("Error creating order:", error);
      const message = error.message?.includes('Stok tidak cukup')
        ? error.message
        : error.message || "Gagal membuat pesanan";
      toast({ title: "Error", description: message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const mapDokuResponse = (data: any, channelId: string): PaymentResult => {
    const dokuRes = data.doku_response?.response || data.doku_response || {};
    const payment = dokuRes.payment || {};
    const vaInfo = dokuRes.virtual_account_info || payment.virtual_account_info || {};
    const qrInfo = dokuRes.qr || payment.qr || {};

    if (channelId === "QRIS") {
      return { type: "qris", qr_code_url: qrInfo.qr_code_url || qrInfo.url || data.qr_code_url, expiry_time: payment.expired_date };
    } else if (["ALFAMART", "INDOMARET"].includes(channelId)) {
      const retailInfo = dokuRes.payment_code_info || payment.payment_code_info || {};
      return { type: "retail", payment_code: retailInfo.payment_code || data.payment_code || "Menunggu...", store_name: channelId === "ALFAMART" ? "Alfamart" : "Indomaret", expiry_time: retailInfo.expired_date || payment.expired_date };
    } else if (["BCA", "BNI", "BRI", "MANDIRI", "CIMB", "PERMATA"].includes(channelId)) {
      return { type: "va", va_number: vaInfo.virtual_account_number || data.va_number || "Menunggu...", bank_name: channelId, expiry_time: vaInfo.expired_date || payment.expired_date };
    } else {
      return { type: "ewallet", payment_url: data.payment_url || payment?.url || dokuRes?.payment_url, expiry_time: payment.expired_date };
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

  // After payment created, show result + link to payment page
  if (paymentResult && orderId) {
    return (
      <div className="container px-4 py-6 pt-24 max-w-2xl">
        <h1 className="text-2xl font-bold mb-6 text-center">Pesanan Berhasil Dibuat!</h1>
        <p className="text-center text-muted-foreground mb-6">Nomor Pesanan: {orderNumber}</p>

        <PaymentMethodSelector
          onPaymentCreated={() => {}}
          onCreatePayment={async () => {}}
          loading={false}
          paymentResult={paymentResult}
        />

        <div className="mt-6 space-y-3">
          <Button onClick={() => navigate(`/payment?orderId=${orderId}&orderNumber=${orderNumber}`)} className="w-full h-14 rounded-full text-base font-bold">
            Lihat Detail Pesanan
          </Button>
          <Button onClick={() => navigate("/")} variant="outline" className="w-full h-14 rounded-full text-base font-bold">
            Kembali ke Beranda
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container px-4 py-6 pt-24 max-w-2xl">
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 mb-6 hover:opacity-70 transition-opacity">
        <ArrowLeft className="h-5 w-5" /><span className="font-semibold">Kembali</span>
      </button>

      <h1 className="text-3xl font-bold mb-6">Checkout</h1>

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
          <div>
            <Label htmlFor="customerName">Nama Lengkap *</Label>
            <Input id="customerName" required value={formData.customerName} onChange={(e) => setFormData({ ...formData, customerName: e.target.value })} />
          </div>
          <div>
            <Label htmlFor="customerEmail">Email *</Label>
            <Input id="customerEmail" type="email" required value={formData.customerEmail} onChange={(e) => setFormData({ ...formData, customerEmail: e.target.value })} />
          </div>
          <div>
            <Label htmlFor="customerPhone">Nomor Telepon *</Label>
            <Input id="customerPhone" type="tel" required value={formData.customerPhone} onChange={(e) => setFormData({ ...formData, customerPhone: e.target.value })} />
          </div>
          <div>
            <Label htmlFor="shippingAddress">Alamat Lengkap *</Label>
            <Input id="shippingAddress" required value={formData.shippingAddress} onChange={(e) => setFormData({ ...formData, shippingAddress: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="city">Kota *</Label>
              <Input id="city" required value={formData.city} onChange={(e) => setFormData({ ...formData, city: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="postalCode">Kode Pos *</Label>
              <Input id="postalCode" required value={formData.postalCode} onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })} />
            </div>
          </div>
        </div>
      </div>

      {/* Payment Method Selection - Inline with logos */}
      <div className="mb-6">
        <h2 className="font-bold text-lg mb-4">Metode Pembayaran</h2>
        <PaymentMethodSelector
          onPaymentCreated={() => {}}
          onCreatePayment={handleSubmit}
          loading={loading}
          paymentResult={null}
          hideButton
          onChannelChange={setSelectedChannel}
        />
      </div>

      {/* Subtotal */}
      <div className="border-t pt-6 space-y-3 mb-6">
        <div className="flex justify-between items-center">
          <span className="text-muted-foreground">Subtotal</span>
          <span className="font-semibold">{formatPrice(getTotalPrice())}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-muted-foreground">Pengiriman</span>
          <span className="font-semibold">Gratis</span>
        </div>
        <Separator className="my-2" />
        <div className="flex justify-between items-center">
          <span className="text-lg font-bold">Total</span>
          <span className="text-lg font-bold">{formatPrice(getTotalPrice())}</span>
        </div>
      </div>

      <Button
        onClick={() => handleSubmit(selectedChannel)}
        className="w-full h-14 rounded-full text-base font-bold"
        disabled={loading || !selectedChannel}
      >
        {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Memproses...</> : "BAYAR SEKARANG"}
      </Button>
    </div>
  );
};

export default Checkout;
