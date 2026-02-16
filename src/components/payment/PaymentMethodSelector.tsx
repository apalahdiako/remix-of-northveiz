import { useState } from "react";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Copy, Loader2, QrCode, Wallet, Building2, CreditCard, Check, Store } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Payment logos
import bcaLogo from "@/assets/payment/bca.jpg";
import bniLogo from "@/assets/payment/bni-new.jpg";
import briLogo from "@/assets/payment/bri-new.jpg";
import mandiriLogo from "@/assets/payment/mandiri.png";
import cimbLogo from "@/assets/payment/cimb.png";
import permataLogo from "@/assets/payment/permata.png";
import qrisLogo from "@/assets/payment/qris-new.jpg";
import ovoLogo from "@/assets/payment/ovo-new.jpg";
import shopeepayLogo from "@/assets/payment/shopeepay-new.jpg";
import alfamartLogo from "@/assets/payment/alfamart-new.jpg";
import indomaretLogo from "@/assets/payment/indomaret.jpg";

interface PaymentChannel {
  id: string;
  name: string;
  logo: string;
  category: "bank_transfer" | "ewallet" | "qris" | "retail";
}

const paymentChannels: PaymentChannel[] = [
  { id: "BCA", name: "BCA Virtual Account", logo: bcaLogo, category: "bank_transfer" },
  { id: "BNI", name: "BNI Virtual Account", logo: bniLogo, category: "bank_transfer" },
  { id: "BRI", name: "BRI Virtual Account", logo: briLogo, category: "bank_transfer" },
  { id: "MANDIRI", name: "Mandiri Virtual Account", logo: mandiriLogo, category: "bank_transfer" },
  { id: "CIMB", name: "CIMB Virtual Account", logo: cimbLogo, category: "bank_transfer" },
  { id: "PERMATA", name: "Permata Virtual Account", logo: permataLogo, category: "bank_transfer" },
  { id: "QRIS", name: "QRIS", logo: qrisLogo, category: "qris" },
  { id: "OVO", name: "OVO", logo: ovoLogo, category: "ewallet" },
  { id: "SHOPEEPAY", name: "ShopeePay", logo: shopeepayLogo, category: "ewallet" },
  { id: "ALFAMART", name: "Alfamart", logo: alfamartLogo, category: "retail" },
  { id: "INDOMARET", name: "Indomaret", logo: indomaretLogo, category: "retail" },
];

interface PaymentResult {
  type: "va" | "qris" | "ewallet" | "retail";
  va_number?: string;
  bank_name?: string;
  qr_code_url?: string;
  payment_url?: string;
  payment_code?: string;
  store_name?: string;
  expiry_time?: string;
}

interface PaymentMethodSelectorProps {
  onPaymentCreated: (result: PaymentResult) => void;
  onCreatePayment: (channelId: string) => Promise<void>;
  loading: boolean;
  paymentResult: PaymentResult | null;
}

const PaymentMethodSelector = ({ onPaymentCreated, onCreatePayment, loading, paymentResult }: PaymentMethodSelectorProps) => {
  const [selectedChannel, setSelectedChannel] = useState<string>("");
  const [activeTab, setActiveTab] = useState("bank_transfer");

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Berhasil disalin!", description: "Nomor telah disalin ke clipboard" });
  };

  const handlePay = () => {
    if (!selectedChannel) {
      toast({ title: "Pilih metode", description: "Silakan pilih metode pembayaran terlebih dahulu", variant: "destructive" });
      return;
    }
    onCreatePayment(selectedChannel);
  };

  const renderChannelList = (category: string) => {
    const channels = paymentChannels.filter(c => c.category === category);
    return (
      <RadioGroup value={selectedChannel} onValueChange={setSelectedChannel} className="space-y-2">
        {channels.map((channel) => (
          <label
            key={channel.id}
            htmlFor={channel.id}
            className={`flex items-center gap-3 border rounded-xl p-4 cursor-pointer transition-all ${
              selectedChannel === channel.id 
                ? "border-primary bg-primary/5 ring-1 ring-primary" 
                : "border-border hover:border-primary/50"
            }`}
          >
            <RadioGroupItem value={channel.id} id={channel.id} />
            <img src={channel.logo} alt={channel.name} className="w-10 h-10 object-contain rounded-md" />
            <span className="font-medium text-sm flex-1">{channel.name}</span>
            {selectedChannel === channel.id && <Check className="w-5 h-5 text-primary" />}
          </label>
        ))}
      </RadioGroup>
    );
  };

  // If payment has been created, show result inline
  if (paymentResult) {
    return (
      <div className="space-y-4">
        {paymentResult.type === "va" && (
          <div className="bg-card border rounded-xl p-6 space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <Building2 className="w-5 h-5 text-primary" />
              <h3 className="font-bold text-lg">Transfer Bank - {paymentResult.bank_name}</h3>
            </div>
            <div className="bg-muted rounded-lg p-4">
              <p className="text-sm text-muted-foreground mb-1">Nomor Virtual Account</p>
              <div className="flex items-center justify-between">
                <span className="text-2xl font-mono font-bold tracking-wider">{paymentResult.va_number}</span>
                <Button variant="outline" size="sm" onClick={() => copyToClipboard(paymentResult.va_number || "")}>
                  <Copy className="w-4 h-4 mr-1" /> Salin
                </Button>
              </div>
            </div>
            {paymentResult.expiry_time && (
              <p className="text-sm text-muted-foreground text-center">
                Berlaku hingga: <span className="font-semibold">{new Date(paymentResult.expiry_time).toLocaleString("id-ID")}</span>
              </p>
            )}
            <div className="bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
              <p className="text-sm text-yellow-800 dark:text-yellow-200 text-center">
                Transfer tepat sesuai jumlah total ke nomor VA di atas
              </p>
            </div>
          </div>
        )}

        {paymentResult.type === "qris" && (
          <div className="bg-card border rounded-xl p-6 space-y-4 text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <QrCode className="w-5 h-5 text-primary" />
              <h3 className="font-bold text-lg">Scan QRIS</h3>
            </div>
            {paymentResult.qr_code_url ? (
              <div className="flex justify-center">
                <img src={paymentResult.qr_code_url} alt="QRIS QR Code" className="w-64 h-64 rounded-lg border" />
              </div>
            ) : (
              <div className="w-64 h-64 mx-auto bg-muted rounded-lg flex items-center justify-center">
                <QrCode className="w-16 h-16 text-muted-foreground" />
              </div>
            )}
            <p className="text-sm text-muted-foreground">
              Scan QR Code di atas menggunakan aplikasi e-Wallet atau mobile banking Anda
            </p>
            {paymentResult.expiry_time && (
              <p className="text-sm text-muted-foreground">
                Berlaku hingga: <span className="font-semibold">{new Date(paymentResult.expiry_time).toLocaleString("id-ID")}</span>
              </p>
            )}
          </div>
        )}

        {paymentResult.type === "ewallet" && (
          <div className="bg-card border rounded-xl p-6 space-y-4 text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Wallet className="w-5 h-5 text-primary" />
              <h3 className="font-bold text-lg">Pembayaran e-Wallet</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Silakan selesaikan pembayaran melalui aplikasi e-Wallet Anda
            </p>
            {paymentResult.payment_url && (
              <Button onClick={() => window.open(paymentResult.payment_url!, "_blank")} className="w-full h-12 rounded-full font-bold">
                Buka Aplikasi e-Wallet
              </Button>
            )}
            {paymentResult.expiry_time && (
              <p className="text-sm text-muted-foreground mt-2">
                Berlaku hingga: <span className="font-semibold">{new Date(paymentResult.expiry_time).toLocaleString("id-ID")}</span>
              </p>
            )}
          </div>
        )}

        {paymentResult.type === "retail" && (
          <div className="bg-card border rounded-xl p-6 space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <Store className="w-5 h-5 text-primary" />
              <h3 className="font-bold text-lg">Bayar di {paymentResult.store_name}</h3>
            </div>
            <div className="bg-muted rounded-lg p-4">
              <p className="text-sm text-muted-foreground mb-1">Kode Pembayaran</p>
              <div className="flex items-center justify-between">
                <span className="text-2xl font-mono font-bold tracking-wider">{paymentResult.payment_code}</span>
                <Button variant="outline" size="sm" onClick={() => copyToClipboard(paymentResult.payment_code || "")}>
                  <Copy className="w-4 h-4 mr-1" /> Salin
                </Button>
              </div>
            </div>
            {paymentResult.expiry_time && (
              <p className="text-sm text-muted-foreground text-center">
                Berlaku hingga: <span className="font-semibold">{new Date(paymentResult.expiry_time).toLocaleString("id-ID")}</span>
              </p>
            )}
            <div className="bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
              <p className="text-sm text-yellow-800 dark:text-yellow-200 text-center">
                Tunjukkan kode pembayaran ini ke kasir {paymentResult.store_name}
              </p>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4 h-12">
          <TabsTrigger value="bank_transfer" className="text-xs sm:text-sm gap-1">
            <Building2 className="w-4 h-4" />
            <span className="hidden sm:inline">Transfer</span> Bank
          </TabsTrigger>
          <TabsTrigger value="ewallet" className="text-xs sm:text-sm gap-1">
            <Wallet className="w-4 h-4" />
            e-Wallet
          </TabsTrigger>
          <TabsTrigger value="qris" className="text-xs sm:text-sm gap-1">
            <QrCode className="w-4 h-4" />
            QRIS
          </TabsTrigger>
          <TabsTrigger value="retail" className="text-xs sm:text-sm gap-1">
            <Store className="w-4 h-4" />
            Retail
          </TabsTrigger>
        </TabsList>

        <TabsContent value="bank_transfer" className="mt-4">
          {renderChannelList("bank_transfer")}
        </TabsContent>
        <TabsContent value="ewallet" className="mt-4">
          {renderChannelList("ewallet")}
        </TabsContent>
        <TabsContent value="qris" className="mt-4">
          {renderChannelList("qris")}
        </TabsContent>
        <TabsContent value="retail" className="mt-4">
          {renderChannelList("retail")}
        </TabsContent>
      </Tabs>

      <Button
        onClick={handlePay}
        className="w-full h-14 rounded-full text-base font-bold"
        disabled={loading || !selectedChannel}
      >
        {loading ? (
          <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Menyiapkan Pembayaran...</>
        ) : (
          "Bayar Sekarang"
        )}
      </Button>
    </div>
  );
};

export default PaymentMethodSelector;
export type { PaymentResult };
