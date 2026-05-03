import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, CheckCircle, XCircle, AlertCircle, Package } from "lucide-react";

interface CourierConfig {
  name: string;
  logo: string;
  color: string;
  connected: boolean;
  activeCount: number;
  avgDays: number;
}

const defaultCouriers: CourierConfig[] = [
  { name: "JNE", logo: "📦", color: "#E30613", connected: true, activeCount: 0, avgDays: 3 },
  { name: "J&T", logo: "🚚", color: "#E2001A", connected: true, activeCount: 0, avgDays: 2 },
  { name: "SiCepat", logo: "⚡", color: "#FFD100", connected: false, activeCount: 0, avgDays: 2 },
  { name: "Anteraja", logo: "🏃", color: "#E02020", connected: false, activeCount: 0, avgDays: 3 },
  { name: "Ninja Xpress", logo: "🥷", color: "#C8102E", connected: false, activeCount: 0, avgDays: 4 },
  { name: "Pos Indonesia", logo: "✉️", color: "#FF6600", connected: false, activeCount: 0, avgDays: 5 },
  { name: "GoSend", logo: "🟢", color: "#00AA13", connected: false, activeCount: 0, avgDays: 1 },
  { name: "GrabExpress", logo: "🟩", color: "#00B14F", connected: false, activeCount: 0, avgDays: 1 },
  { name: "Tiki", logo: "📮", color: "#003087", connected: false, activeCount: 0, avgDays: 4 },
  { name: "Lion Parcel", logo: "🦁", color: "#FF6600", connected: false, activeCount: 0, avgDays: 3 },
];

export default function CourierConnection() {
  const [couriers, setCouriers] = useState<CourierConfig[]>(defaultCouriers);
  const [loading, setLoading] = useState(true);
  const [selectedCourier, setSelectedCourier] = useState<string | null>(null);
  const [apiKey, setApiKey] = useState("");
  const [secretKey, setSecretKey] = useState("");
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    fetchCounts();
  }, []);

  const fetchCounts = async () => {
    const { data } = await supabase
      .from("shipment_tracking")
      .select("courier")
      .neq("current_phase", "delivered");

    const counts: Record<string, number> = {};
    (data || []).forEach((s: any) => { counts[s.courier] = (counts[s.courier] || 0) + 1; });

    setCouriers(prev => prev.map(c => ({ ...c, activeCount: counts[c.name] || 0 })));
    setLoading(false);
  };

  const handleConnect = () => {
    if (!apiKey.trim()) { toast.error("API Key wajib diisi"); return; }
    toast.success(`${selectedCourier} berhasil dihubungkan (simulasi)`);
    setCouriers(prev => prev.map(c => c.name === selectedCourier ? { ...c, connected: true } : c));
    setSelectedCourier(null);
    setApiKey("");
    setSecretKey("");
  };

  const handleTestConnection = async () => {
    setTesting(true);
    await new Promise(r => setTimeout(r, 1500));
    toast.success(`Koneksi ke ${selectedCourier} berhasil! (simulasi)`);
    setTesting(false);
  };

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
        {couriers.map(c => (
          <Card key={c.name} className="relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1" style={{ backgroundColor: c.color }} />
            <CardContent className="p-4">
              <div className="flex items-center gap-3 mb-3">
                <span className="text-3xl">{c.logo}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate">{c.name}</p>
                  <Badge className={`text-[10px] mt-1 ${c.connected ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}`}>
                    {c.connected ? "Terhubung" : "Tidak Terhubung"}
                  </Badge>
                </div>
              </div>
              <div className="space-y-1 text-xs text-muted-foreground">
                <div className="flex justify-between">
                  <span>Paket aktif</span>
                  <span className="font-medium text-foreground">{c.activeCount}</span>
                </div>
                <div className="flex justify-between">
                  <span>Rata-rata kirim</span>
                  <span className="font-medium text-foreground">{c.avgDays} hari</span>
                </div>
              </div>
              <Button
                size="sm"
                variant={c.connected ? "outline" : "default"}
                className="w-full mt-3 text-xs h-8"
                onClick={() => setSelectedCourier(c.name)}
              >
                {c.connected ? "Konfigurasi" : "Hubungkan"}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={!!selectedCourier} onOpenChange={() => setSelectedCourier(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Hubungkan {selectedCourier}</DialogTitle>
            <DialogDescription>Masukkan kredensial API untuk menghubungkan kurir</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>API Key</Label>
              <Input placeholder="Masukkan API Key..." value={apiKey} onChange={e => setApiKey(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Secret Key (opsional)</Label>
              <Input placeholder="Masukkan Secret Key..." value={secretKey} onChange={e => setSecretKey(e.target.value)} type="password" />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={handleTestConnection} disabled={testing}>
                {testing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Test Koneksi
              </Button>
              <Button className="flex-1" onClick={handleConnect}>Hubungkan</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
