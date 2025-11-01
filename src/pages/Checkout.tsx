import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { ArrowLeft } from "lucide-react";
import { useCart } from "@/hooks/useCart";
import { Separator } from "@/components/ui/separator";

const Checkout = () => {
  const navigate = useNavigate();
  const { items, getTotalPrice, clearCart } = useCart();
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    customerName: "",
    customerEmail: "",
    customerPhone: "",
    shippingAddress: "",
    city: "",
    postalCode: "",
    paymentMethod: "bank_transfer",
  });

  const formatPrice = (price: number) => {
    return `Rp ${price.toLocaleString("id-ID")}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (items.length === 0) {
      toast({
        title: "Cart kosong",
        description: "Silakan tambahkan produk ke cart terlebih dahulu",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      // Generate order number
      const orderNumber = `ORD-${Date.now()}`;
      
      // Calculate total amount
      const totalAmount = getTotalPrice();

      // Get current user if logged in
      const { data: { user } } = await supabase.auth.getUser();

      // Insert orders for each item
      const orderInserts = items.map(item => ({
        user_id: user?.id || null,
        order_number: orderNumber,
        product_id: item.id,
        product_name: item.name,
        product_price: formatPrice(item.price),
        product_image: item.image,
        size: item.size,
        quantity: item.quantity,
        customer_name: formData.customerName,
        customer_email: formData.customerEmail,
        customer_phone: formData.customerPhone,
        shipping_address: formData.shippingAddress,
        city: formData.city,
        postal_code: formData.postalCode,
        payment_method: formData.paymentMethod,
        payment_status: "pending",
        total_amount: totalAmount,
      }));

      const { data: orders, error } = await supabase
        .from("orders")
        .insert(orderInserts)
        .select();

      if (error) throw error;

      toast({
        title: "Pesanan berhasil dibuat!",
        description: `Nomor pesanan: ${orderNumber}`,
      });

      // Clear cart after successful order
      clearCart();

      // Redirect to payment page
      navigate(`/payment?orderId=${orders[0].id}&orderNumber=${orderNumber}`);
    } catch (error: any) {
      console.error("Error creating order:", error);
      toast({
        title: "Error",
        description: error.message || "Gagal membuat pesanan",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container px-4 py-6 max-w-2xl">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 mb-6 hover:opacity-70 transition-opacity"
      >
        <ArrowLeft className="h-5 w-5" />
        <span className="font-semibold">Kembali</span>
      </button>

      <h1 className="text-3xl font-bold mb-6">Checkout</h1>

      {/* Order Summary */}
      <div className="bg-muted p-4 rounded-lg mb-6">
        <h2 className="font-bold text-lg mb-4">Ringkasan Pesanan</h2>
        {items.length === 0 ? (
          <p className="text-muted-foreground text-center py-4">
            Cart kosong. Silakan tambahkan produk terlebih dahulu.
          </p>
        ) : (
          <div className="space-y-4">
            {items.map((item) => (
              <div key={`${item.id}-${item.size}`} className="flex gap-4 pb-4 border-b last:border-0">
                <img
                  src={item.image}
                  alt={item.name}
                  className="w-20 h-20 object-cover rounded"
                />
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
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <h2 className="font-bold text-lg mb-4">Informasi Pengiriman</h2>
          <div className="space-y-4">
            <div>
              <Label htmlFor="customerName">Nama Lengkap *</Label>
              <Input
                id="customerName"
                required
                value={formData.customerName}
                onChange={(e) =>
                  setFormData({ ...formData, customerName: e.target.value })
                }
              />
            </div>

            <div>
              <Label htmlFor="customerEmail">Email *</Label>
              <Input
                id="customerEmail"
                type="email"
                required
                value={formData.customerEmail}
                onChange={(e) =>
                  setFormData({ ...formData, customerEmail: e.target.value })
                }
              />
            </div>

            <div>
              <Label htmlFor="customerPhone">Nomor Telepon *</Label>
              <Input
                id="customerPhone"
                type="tel"
                required
                value={formData.customerPhone}
                onChange={(e) =>
                  setFormData({ ...formData, customerPhone: e.target.value })
                }
              />
            </div>

            <div>
              <Label htmlFor="shippingAddress">Alamat Lengkap *</Label>
              <Input
                id="shippingAddress"
                required
                value={formData.shippingAddress}
                onChange={(e) =>
                  setFormData({ ...formData, shippingAddress: e.target.value })
                }
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="city">Kota *</Label>
                <Input
                  id="city"
                  required
                  value={formData.city}
                  onChange={(e) =>
                    setFormData({ ...formData, city: e.target.value })
                  }
                />
              </div>

              <div>
                <Label htmlFor="postalCode">Kode Pos *</Label>
                <Input
                  id="postalCode"
                  required
                  value={formData.postalCode}
                  onChange={(e) =>
                    setFormData({ ...formData, postalCode: e.target.value })
                  }
                />
              </div>
            </div>
          </div>
        </div>

        {/* Payment Method */}
        <div>
          <h2 className="font-bold text-lg mb-4">Metode Pembayaran</h2>
          <RadioGroup
            value={formData.paymentMethod}
            onValueChange={(value) =>
              setFormData({ ...formData, paymentMethod: value })
            }
          >
            <div className="flex items-center space-x-2 border rounded-lg p-4">
              <RadioGroupItem value="bank_transfer" id="bank_transfer" />
              <Label htmlFor="bank_transfer" className="flex-1 cursor-pointer">
                Transfer Bank
              </Label>
            </div>
            <div className="flex items-center space-x-2 border rounded-lg p-4">
              <RadioGroupItem value="credit_card" id="credit_card" />
              <Label htmlFor="credit_card" className="flex-1 cursor-pointer">
                Kartu Kredit/Debit
              </Label>
            </div>
            <div className="flex items-center space-x-2 border rounded-lg p-4">
              <RadioGroupItem value="ewallet" id="ewallet" />
              <Label htmlFor="ewallet" className="flex-1 cursor-pointer">
                e-Wallet
              </Label>
            </div>
          </RadioGroup>
        </div>

        {/* Subtotal Section */}
        <div className="border-t pt-6 space-y-3">
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

        {/* Proceed to Checkout Button */}
        <Button
          type="submit"
          className="w-full h-14 rounded-full text-base font-bold bg-primary hover:bg-primary/90 shadow-lg hover:shadow-xl transition-all duration-300"
          disabled={loading}
          aria-label="Lanjutkan ke pembayaran dan konfirmasi pesanan"
        >
          {loading ? "Memproses..." : "PROCEED TO CHECKOUT"}
        </Button>
      </form>
    </div>
  );
};

export default Checkout;