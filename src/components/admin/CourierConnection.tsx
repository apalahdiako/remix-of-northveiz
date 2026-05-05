import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, CheckCircle, XCircle, Package, Search, Truck } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface BiteshipCourier {
  courier_code: string;
  courier_name: string;
  courier_service_code: string;
  courier_service_name: string;
  tier: string;
  description: string;
  service_type: string;
  shipping_type: string;
  available_for_cash_on_delivery?: boolean;
  available_for_proof_of_delivery?: boolean;
  available_for_instant_waybill_id?: boolean;
}

interface RateResult {
  courier_code: string;
  courier_name: string;
  courier_service_code: string;
  courier_service_name: string;
  price: number;
  duration: string;
  type: string;
}

interface TrackingHistory {
  note: string;
  status: string;
  updated_at: string;
}

interface TrackingResult {
  success: boolean;
  courier: { company: string; name: string };
  destination: { contact_name: string; address: string };
  history: TrackingHistory[];
  status: string;
  waybill_id: string;
}

async function callBiteship(action: string, payload?: any) {
  const { data, error } = await supabase.functions.invoke("biteship-proxy", {
    body: { action, payload },
  });
  if (error) throw new Error(error.message);
  return data;
}

export default function CourierConnection() {
  const [couriers, setCouriers] = useState<BiteshipCourier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Rate check state
  const [rateOrigin, setRateOrigin] = useState("12710");
  const [rateDest, setRateDest] = useState("15417");
  const [rateWeight, setRateWeight] = useState("1000");
  const [rates, setRates] = useState<RateResult[]>([]);
  const [ratesLoading, setRatesLoading] = useState(false);

  // Tracking state
  const [trackWaybill, setTrackWaybill] = useState("");
  const [trackCourier, setTrackCourier] = useState("");
  const [tracking, setTracking] = useState<TrackingResult | null>(null);
  const [trackingLoading, setTrackingLoading] = useState(false);

  useEffect(() => {
    fetchCouriers();
  }, []);

  const fetchCouriers = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await callBiteship("couriers");
      if (data?.couriers) {
        setCouriers(data.couriers);
      } else if (data?.error) {
        setError(data.error);
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckRates = async () => {
    if (!rateOrigin || !rateDest || !rateWeight) {
      toast.error("Isi semua field ongkir");
      return;
    }
    setRatesLoading(true);
    setRates([]);
    try {
      const data = await callBiteship("rates", {
        origin_postal_code: parseInt(rateOrigin),
        destination_postal_code: parseInt(rateDest),
        couriers: couriers.length > 0
          ? [...new Set(couriers.map(c => c.courier_code))].join(",")
          : "jne,jnt,sicepat,anteraja,pos",
        items: [{ name: "Paket", quantity: 1, weight: parseInt(rateWeight), value: 100000 }],
      });
      if (data?.pricing) {
        setRates(data.pricing.map((p: any) => ({
          courier_code: p.courier_code,
          courier_name: p.courier_name,
          courier_service_code: p.courier_service_code,
          courier_service_name: p.courier_service_name,
          price: p.price,
          duration: p.duration || "-",
          type: p.type || p.shipping_type || "-",
        })));
      } else {
        toast.error("Tidak ada hasil ongkir");
      }
    } catch (e: any) {
      toast.error("Gagal cek ongkir: " + e.message);
    } finally {
      setRatesLoading(false);
    }
  };

  const handleTrack = async () => {
    if (!trackWaybill || !trackCourier) {
      toast.error("Isi nomor resi dan kode kurir");
      return;
    }
    setTrackingLoading(true);
    setTracking(null);
    try {
      const data = await callBiteship("tracking", {
        waybill_id: trackWaybill,
        courier_code: trackCourier,
      });
      if (data?.status === "error" || data?.error) {
        toast.error(data?.error || "Tracking gagal");
      } else {
        setTracking(data);
      }
    } catch (e: any) {
      toast.error("Gagal tracking: " + e.message);
    } finally {
      setTrackingLoading(false);
    }
  };

  // Group couriers by courier_code for display
  const grouped = couriers.reduce<Record<string, BiteshipCourier[]>>((acc, c) => {
    (acc[c.courier_code] = acc[c.courier_code] || []).push(c);
    return acc;
  }, {});

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin mb-3" />
        <p className="text-sm text-muted-foreground">Mengambil data kurir dari Biteship...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-destructive">
        <XCircle className="h-10 w-10 mb-3 opacity-60" />
        <p className="text-sm font-medium">Gagal mengambil data kurir</p>
        <p className="text-xs text-muted-foreground mt-1">{error}</p>
        <Button size="sm" variant="outline" className="mt-4" onClick={fetchCouriers}>Coba Lagi</Button>
      </div>
    );
  }

  const formatRupiah = (n: number) => "Rp " + n.toLocaleString("id-ID");

  return (
    <div className="space-y-4">
      <Tabs defaultValue="couriers" className="space-y-4">
        <TabsList>
          <TabsTrigger value="couriers"><Truck className="mr-1.5 h-3.5 w-3.5" />Kurir Tersedia</TabsTrigger>
          <TabsTrigger value="rates"><Search className="mr-1.5 h-3.5 w-3.5" />Cek Ongkir</TabsTrigger>
          <TabsTrigger value="track"><Package className="mr-1.5 h-3.5 w-3.5" />Lacak Resi</TabsTrigger>
        </TabsList>

        {/* === KURIR LIST === */}
        <TabsContent value="couriers">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {Object.entries(grouped).map(([code, services]) => (
              <Card key={code} className="relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-green-500" />
                <CardContent className="p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-3xl">📦</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate">{services[0].courier_name}</p>
                      <Badge className="text-[10px] mt-1 bg-green-500/20 text-green-400">
                        <CheckCircle className="h-3 w-3 mr-1" />Terhubung
                      </Badge>
                    </div>
                  </div>
                  <div className="space-y-1 text-xs text-muted-foreground">
                    <div className="flex justify-between">
                      <span>Kode</span>
                      <span className="font-mono text-foreground">{code}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Layanan</span>
                      <span className="font-medium text-foreground">{services.length} jenis</span>
                    </div>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {services.slice(0, 3).map((s) => (
                      <Badge key={s.courier_service_code} variant="outline" className="text-[9px]">
                        {s.courier_service_name}
                      </Badge>
                    ))}
                    {services.length > 3 && (
                      <Badge variant="outline" className="text-[9px]">+{services.length - 3}</Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            Total: {couriers.length} layanan dari {Object.keys(grouped).length} kurir — via Biteship LIVE API
          </p>
        </TabsContent>

        {/* === CEK ONGKIR === */}
        <TabsContent value="rates">
          <Card>
            <CardContent className="p-4 space-y-4">
              <h3 className="text-sm font-semibold">Cek Ongkir Real-Time (Biteship)</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Kode Pos Asal</Label>
                  <Input value={rateOrigin} onChange={e => setRateOrigin(e.target.value)} placeholder="12710" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Kode Pos Tujuan</Label>
                  <Input value={rateDest} onChange={e => setRateDest(e.target.value)} placeholder="15417" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Berat (gram)</Label>
                  <Input value={rateWeight} onChange={e => setRateWeight(e.target.value)} placeholder="1000" />
                </div>
              </div>
              <Button onClick={handleCheckRates} disabled={ratesLoading} className="w-full sm:w-auto">
                {ratesLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Search className="h-4 w-4 mr-2" />}
                Cek Ongkir
              </Button>

              {rates.length > 0 && (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Kurir</TableHead>
                      <TableHead>Layanan</TableHead>
                      <TableHead>Harga</TableHead>
                      <TableHead>Estimasi</TableHead>
                      <TableHead>Tipe</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rates.map((r, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-medium text-xs">{r.courier_name}</TableCell>
                        <TableCell className="text-xs">{r.courier_service_name}</TableCell>
                        <TableCell className="font-mono text-xs">{formatRupiah(r.price)}</TableCell>
                        <TableCell className="text-xs">{r.duration}</TableCell>
                        <TableCell><Badge variant="outline" className="text-[10px]">{r.type}</Badge></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}

              {!ratesLoading && rates.length === 0 && (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  Masukkan kode pos dan berat, lalu tekan Cek Ongkir
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* === LACAK RESI === */}
        <TabsContent value="track">
          <Card>
            <CardContent className="p-4 space-y-4">
              <h3 className="text-sm font-semibold">Lacak Resi via Biteship</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Nomor Resi / Waybill</Label>
                  <Input value={trackWaybill} onChange={e => setTrackWaybill(e.target.value)} placeholder="JNE1234567890" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Kode Kurir</Label>
                  <Input value={trackCourier} onChange={e => setTrackCourier(e.target.value)} placeholder="jne" />
                </div>
              </div>
              <Button onClick={handleTrack} disabled={trackingLoading} className="w-full sm:w-auto">
                {trackingLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Search className="h-4 w-4 mr-2" />}
                Lacak
              </Button>

              {tracking && (
                <div className="space-y-3 mt-4">
                  <div className="flex items-center gap-2">
                    <Badge className="bg-green-500/20 text-green-400">{tracking.status}</Badge>
                    <span className="text-xs text-muted-foreground">Resi: {tracking.waybill_id}</span>
                  </div>
                  <div className="space-y-2 max-h-[300px] overflow-y-auto">
                    {(tracking.history || []).map((h, i) => (
                      <div key={i} className="flex gap-3 text-xs border-l-2 border-muted pl-3 py-1">
                        <span className="text-muted-foreground whitespace-nowrap">
                          {new Date(h.updated_at).toLocaleString("id-ID")}
                        </span>
                        <div>
                          <Badge variant="outline" className="text-[9px] mr-2">{h.status}</Badge>
                          <span>{h.note}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {!trackingLoading && !tracking && (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  Masukkan nomor resi dan kode kurir untuk melacak paket
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
