import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Loader2, Building2, Wallet, QrCode, Store, Check } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import PaymentResultDisplay, { type PaymentResultData } from "./PaymentResult";

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
  { id: "MANDIRI", name: "Mandiri Bill Payment", logo: mandiriLogo, category: "bank_transfer" },
  { id: "CIMB", name: "CIMB Virtual Account", logo: cimbLogo, category: "bank_transfer" },
  { id: "PERMATA", name: "Permata Virtual Account", logo: permataLogo, category: "bank_transfer" },
  { id: "QRIS", name: "QRIS", logo: qrisLogo, category: "qris" },
  { id: "GOPAY", name: "GoPay", logo: ovoLogo, category: "ewallet" },
  { id: "SHOPEEPAY", name: "ShopeePay", logo: shopeepayLogo, category: "ewallet" },
  { id: "ALFAMART", name: "Alfamart", logo: alfamartLogo, category: "retail" },
  { id: "INDOMARET", name: "Indomaret", logo: indomaretLogo, category: "retail" },
];

interface PaymentMethodSelectorProps {
  onPaymentCreated: (result: PaymentResultData) => void;
  onCreatePayment: (channelId: string) => Promise<void>;
  loading: boolean;
  paymentResult: PaymentResultData | null;
  hideButton?: boolean;
  onChannelChange?: (channelId: string) => void;
}

const PaymentMethodSelector = ({ onPaymentCreated, onCreatePayment, loading, paymentResult, hideButton, onChannelChange }: PaymentMethodSelectorProps) => {
  const [selectedChannel, setSelectedChannel] = useState<string>("");
  const [activeTab, setActiveTab] = useState("bank_transfer");

  useEffect(() => {
    onChannelChange?.(selectedChannel);
  }, [selectedChannel, onChannelChange]);

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

  if (paymentResult) {
    return <PaymentResultDisplay result={paymentResult} />;
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

        <TabsContent value="bank_transfer" className="mt-4">{renderChannelList("bank_transfer")}</TabsContent>
        <TabsContent value="ewallet" className="mt-4">{renderChannelList("ewallet")}</TabsContent>
        <TabsContent value="qris" className="mt-4">{renderChannelList("qris")}</TabsContent>
        <TabsContent value="retail" className="mt-4">{renderChannelList("retail")}</TabsContent>
      </Tabs>

      {!hideButton && (
        <Button onClick={handlePay} className="w-full h-14 rounded-full text-base font-bold" disabled={loading || !selectedChannel}>
          {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Menyiapkan Pembayaran...</> : "Bayar Sekarang"}
        </Button>
      )}
    </div>
  );
};

export default PaymentMethodSelector;
export type { PaymentResultData as PaymentResult };
