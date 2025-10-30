import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { ArrowLeft } from "lucide-react";

const Checkout = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(false);
  
  // Get product details from URL
  const productId = searchParams.get("productId");
  const productName = searchParams.get("name");
  const productPrice = searchParams.get("price");
  const productImage = searchParams.get("image");
  const size = searchParams.get("size");

  const [formData, setFormData] = useState({
    customerName: "",
    customerEmail: "",
    customerPhone: "",
    shippingAddress: "",
    city: "",
    postalCode: "",
    paymentMethod: "bank_transfer",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Generate order number
      const orderNumber = `ORD-${Date.now()}`;
      
      // Parse price to number
      const priceString = productPrice?.replace(/[^\d]/g, '') || "0";
      const totalAmount = parseInt(priceString);

      // Get current user if logged in
      const { data: { user } } = await supabase.auth.getUser();

      // Insert order
      const { data: order, error } = await supabase
        .from("orders")
        .insert({
          user_id: user?.id || null,
          order_number: orderNumber,
          product_id: productId,
          product_name: productName,
          product_price: productPrice,
          product_image: productImage,
          size: size,
          quantity: 1,
          customer_name: formData.customerName,
          customer_email: formData.customerEmail,
          customer_phone: formData.customerPhone,
          shipping_address: formData.shippingAddress,
          city: formData.city,
          postal_code: formData.postalCode,
          payment_method: formData.paymentMethod,
          payment_status: "pending",
          total_amount: totalAmount,
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Pesanan berhasil dibuat!",
        description: `Nomor pesanan: ${orderNumber}`,
      });

      // Redirect to payment page
      navigate(`/payment?orderId=${order.id}&orderNumber=${orderNumber}`);
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
        <div className="flex gap-4">
          <img
            src={productImage || ""}
            alt={productName || ""}
            className="w-20 h-20 object-cover rounded"
          />
          <div className="flex-1">
            <h3 className="font-bold">{productName}</h3>
            <p className="text-sm text-muted-foreground">Ukuran: {size}</p>
            <p className="font-bold mt-2">{productPrice}</p>
          </div>
        </div>
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

        <Button
          type="submit"
          className="w-full h-14 rounded-full text-base font-bold"
          disabled={loading}
        >
          {loading ? "Memproses..." : "Bayar Sekarang"}
        </Button>
      </form>
    </div>
  );
};

export default Checkout;