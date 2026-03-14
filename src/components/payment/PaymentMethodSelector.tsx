import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Check } from "lucide-react";
import { toast } from "@/hooks/use-toast";

// Payment logos
import qrisLogo from "@/assets/payment/qris-new.jpg";
import ovoLogo from "@/assets/payment/ovo-new.jpg";
import shopeepayLogo from "@/assets/payment/shopeepay-new.jpg";
import gopayLogo from "@/assets/payment/gopay.png";
import danaLogo from "@/assets/payment/dana.png";
import linkajaLogo from "@/assets/payment/linkaja.png";
import bcaLogo from "@/assets/payment/bca.jpg";
import mandiriLogo from "@/assets/payment/mandiri.png";
import bniLogo from "@/assets/payment/bni-new.jpg";
import briLogo from "@/assets/payment/bri-new.jpg";
import permataLogo from "@/assets/payment/permata.png";
import cimbLogo from "@/assets/payment/cimb.png";
import alfamartLogo from "@/assets/payment/alfamart-new.jpg";
import indomaretLogo from "@/assets/payment/indomaret.jpg";
import akulakuLogo from "@/assets/payment/akulaku-new.jpg";
import visaLogo from "@/assets/payment/visa.png";
import mastercardLogo from "@/assets/payment/mastercard.png";

export interface PaymentOption {
  id: string;
  name: string;
  logo: string;
  /** Midtrans enabled_payments code(s) */
  midtransCode: string[];
}

interface PaymentCategory {
  title: string;
  options: PaymentOption[];
}

const paymentCategories: PaymentCategory[] = [
  {
    title: "QRIS",
    options: [
      { id: "qris", name: "QRIS", logo: qrisLogo, midtransCode: ["other_qris"] },
    ],
  },
  {
    title: "E-Wallet",
    options: [
      { id: "gopay", name: "GoPay", logo: gopayLogo, midtransCode: ["gopay"] },
      { id: "shopeepay", name: "ShopeePay", logo: shopeepayLogo, midtransCode: ["shopeepay"] },
      { id: "dana", name: "Dana", logo: danaLogo, midtransCode: ["dana"] },
      { id: "linkaja", name: "LinkAja", logo: linkajaLogo, midtransCode: ["linkaja"] },
      { id: "ovo", name: "OVO", logo: ovoLogo, midtransCode: ["ovo"] },
    ],
  },
  {
    title: "Virtual Account (Transfer Bank)",
    options: [
      { id: "bca_va", name: "BCA", logo: bcaLogo, midtransCode: ["bca_va"] },
      { id: "mandiri", name: "Mandiri", logo: mandiriLogo, midtransCode: ["echannel"] },
      { id: "bni_va", name: "BNI", logo: bniLogo, midtransCode: ["bni_va"] },
      { id: "bri_va", name: "BRI", logo: briLogo, midtransCode: ["bri_va"] },
      { id: "permata_va", name: "Permata", logo: permataLogo, midtransCode: ["permata_va"] },
      { id: "cimb_va", name: "CIMB Niaga", logo: cimbLogo, midtransCode: ["cimb_va"] },
    ],
  },
  {
    title: "Retail Outlets",
    options: [
      { id: "alfamart", name: "Alfamart", logo: alfamartLogo, midtransCode: ["alfamart"] },
      { id: "indomaret", name: "Indomaret", logo: indomaretLogo, midtransCode: ["indomaret"] },
    ],
  },
  {
    title: "Paylater & Card",
    options: [
      { id: "akulaku", name: "Akulaku", logo: akulakuLogo, midtransCode: ["akulaku"] },
      { id: "credit_card", name: "Credit/Debit Card", logo: visaLogo, midtransCode: ["credit_card"] },
    ],
  },
];

// Export all logos for footer usage
export const allPaymentLogos = paymentCategories.flatMap((cat) =>
  cat.options.map((opt) => ({ src: opt.logo, alt: opt.name }))
).concat([{ src: mastercardLogo, alt: "Mastercard" }]);

interface PaymentMethodSelectorProps {
  onSelect: (option: PaymentOption) => void;
  selectedId: string | null;
  loading: boolean;
  onConfirm: () => void;
}

const PaymentMethodSelector = ({
  onSelect,
  selectedId,
  loading,
  onConfirm,
}: PaymentMethodSelectorProps) => {
  const handleConfirm = () => {
    if (!selectedId) {
      toast({
        title: "Pilih metode",
        description: "Silakan pilih metode pembayaran terlebih dahulu",
        variant: "destructive",
      });
      return;
    }
    onConfirm();
  };

  return (
    <div className="space-y-6">
      {paymentCategories.map((category) => (
        <div key={category.title}>
          <h3 className="text-sm font-bold uppercase tracking-wide text-muted-foreground mb-3">
            {category.title}
          </h3>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
            {category.options.map((option) => {
              const isSelected = selectedId === option.id;
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => onSelect(option)}
                  className={`relative flex flex-col items-center justify-center aspect-square bg-white rounded-lg p-2 border-2 transition-all cursor-pointer ${
                    isSelected
                      ? "border-foreground ring-1 ring-foreground"
                      : "border-border hover:border-foreground/40"
                  }`}
                >
                  {isSelected && (
                    <div className="absolute top-1 right-1 w-5 h-5 bg-foreground rounded-full flex items-center justify-center">
                      <Check className="w-3 h-3 text-background" />
                    </div>
                  )}
                  <img
                    src={option.logo}
                    alt={option.name}
                    className="w-full h-3/4 object-contain"
                    loading="lazy"
                  />
                  <span className="text-[10px] font-medium text-foreground mt-1 truncate w-full text-center">
                    {option.name}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ))}

      <Button
        onClick={handleConfirm}
        className="w-full h-14 rounded-full text-base font-bold"
        disabled={loading || !selectedId}
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Memproses Pembayaran...
          </>
        ) : (
          "Konfirmasi Pembayaran"
        )}
      </Button>
    </div>
  );
};

export default PaymentMethodSelector;
export type { PaymentOption as PaymentMethodOption };
