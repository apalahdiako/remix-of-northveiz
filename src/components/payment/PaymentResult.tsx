import { Copy, Building2, QrCode, Wallet, Store } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { QRCodeSVG } from "qrcode.react";
import CountdownTimer from "./CountdownTimer";

export interface PaymentResultData {
  type: "va" | "qris" | "ewallet" | "retail";
  va_number?: string;
  bank_name?: string;
  biller_code?: string;
  qr_string?: string;
  qr_code_url?: string;
  payment_url?: string;
  payment_code?: string;
  store_name?: string;
  expiry_time?: string;
}

interface PaymentResultDisplayProps {
  result: PaymentResultData;
  onExpired?: () => void;
}

const PaymentResultDisplay = ({ result, onExpired }: PaymentResultDisplayProps) => {
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Berhasil disalin!", description: "Nomor telah disalin ke clipboard" });
  };

  return (
    <div className="space-y-4">
      {result.expiry_time && (
        <CountdownTimer expiryTime={result.expiry_time} onExpired={onExpired} />
      )}

      {result.type === "va" && (
        <div className="bg-card border rounded-xl p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-primary" />
            <h3 className="font-bold text-lg">Transfer Bank - {result.bank_name}</h3>
          </div>
          {result.biller_code && (
            <div className="bg-muted rounded-lg p-4">
              <p className="text-sm text-muted-foreground mb-1">Kode Biller (Mandiri)</p>
              <div className="flex items-center justify-between">
                <span className="text-xl font-mono font-bold tracking-wider">{result.biller_code}</span>
                <Button variant="outline" size="sm" onClick={() => copyToClipboard(result.biller_code!)}>
                  <Copy className="w-4 h-4 mr-1" /> Salin
                </Button>
              </div>
            </div>
          )}
          <div className="bg-muted rounded-lg p-4">
            <p className="text-sm text-muted-foreground mb-1">
              {result.biller_code ? "Bill Key" : "Nomor Virtual Account"}
            </p>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-mono font-bold tracking-wider">{result.va_number}</span>
              <Button variant="outline" size="sm" onClick={() => copyToClipboard(result.va_number || "")}>
                <Copy className="w-4 h-4 mr-1" /> Salin
              </Button>
            </div>
          </div>
          <div className="bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
            <p className="text-sm text-yellow-800 dark:text-yellow-200 text-center">
              Transfer tepat sesuai jumlah total ke nomor VA di atas
            </p>
          </div>
        </div>
      )}

      {result.type === "qris" && (
        <div className="bg-card border rounded-xl p-6 space-y-4 text-center">
          <div className="flex items-center justify-center gap-2">
            <QrCode className="w-5 h-5 text-primary" />
            <h3 className="font-bold text-lg">Scan QRIS</h3>
          </div>
          <div className="flex justify-center">
            {result.qr_string ? (
              <div className="bg-white p-4 rounded-lg border">
                <QRCodeSVG value={result.qr_string} size={240} level="M" />
              </div>
            ) : result.qr_code_url ? (
              <img src={result.qr_code_url} alt="QRIS QR Code" className="w-64 h-64 rounded-lg border" />
            ) : (
              <div className="w-64 h-64 bg-muted rounded-lg flex items-center justify-center">
                <QrCode className="w-16 h-16 text-muted-foreground" />
              </div>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            Scan QR Code di atas menggunakan aplikasi e-Wallet atau mobile banking
          </p>
        </div>
      )}

      {result.type === "ewallet" && (
        <div className="bg-card border rounded-xl p-6 space-y-4 text-center">
          <div className="flex items-center justify-center gap-2">
            <Wallet className="w-5 h-5 text-primary" />
            <h3 className="font-bold text-lg">Pembayaran e-Wallet</h3>
          </div>
          <p className="text-sm text-muted-foreground">
            Selesaikan pembayaran melalui aplikasi e-Wallet Anda
          </p>
          {result.payment_url && (
            <Button onClick={() => window.open(result.payment_url!, "_blank")} className="w-full h-12 rounded-full font-bold">
              Buka Aplikasi e-Wallet
            </Button>
          )}
        </div>
      )}

      {result.type === "retail" && (
        <div className="bg-card border rounded-xl p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Store className="w-5 h-5 text-primary" />
            <h3 className="font-bold text-lg">Bayar di {result.store_name}</h3>
          </div>
          <div className="bg-muted rounded-lg p-4">
            <p className="text-sm text-muted-foreground mb-1">Kode Pembayaran</p>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-mono font-bold tracking-wider">{result.payment_code}</span>
              <Button variant="outline" size="sm" onClick={() => copyToClipboard(result.payment_code || "")}>
                <Copy className="w-4 h-4 mr-1" /> Salin
              </Button>
            </div>
          </div>
          <div className="bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
            <p className="text-sm text-yellow-800 dark:text-yellow-200 text-center">
              Tunjukkan kode pembayaran ini ke kasir {result.store_name}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default PaymentResultDisplay;
