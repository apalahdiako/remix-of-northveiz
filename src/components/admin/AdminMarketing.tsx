import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Plus, Tag, Zap, Package, Gift, Percent, Calendar } from "lucide-react";

interface Voucher {
  id: string; code: string; type: "percentage" | "nominal"; value: number; minPurchase: number;
  quota: number; used: number; validFrom: string; validTo: string; status: "active" | "expired" | "depleted";
}

const mockVouchers: Voucher[] = [
  { id: "1", code: "WELCOME10", type: "percentage", value: 10, minPurchase: 100000, quota: 100, used: 34, validFrom: "2026-01-01", validTo: "2026-06-30", status: "active" },
  { id: "2", code: "FLAT50K", type: "nominal", value: 50000, minPurchase: 200000, quota: 50, used: 50, validFrom: "2026-01-01", validTo: "2026-03-31", status: "depleted" },
  { id: "3", code: "SUMMER25", type: "percentage", value: 25, minPurchase: 150000, quota: 200, used: 87, validFrom: "2026-05-01", validTo: "2026-08-31", status: "active" },
];

const mockFlashSales = [
  { id: "1", product: "NORTHVEIZ Hoodie Classic", originalPrice: 450000, flashPrice: 299000, startTime: "2026-05-02T10:00", endTime: "2026-05-02T22:00", stock: 20, sold: 8 },
  { id: "2", product: "NORTHVEIZ Tee Essential", originalPrice: 250000, flashPrice: 149000, startTime: "2026-05-03T08:00", endTime: "2026-05-03T20:00", stock: 50, sold: 0 },
];

const mockBundles = [
  { id: "1", name: "Bundle Hemat", items: ["Hoodie Classic", "Tee Essential"], discount: 15, type: "percentage" },
  { id: "2", name: "Buy 2 Get 1", items: ["Cap Basic", "Cap Premium", "Cap Basic (Free)"], discount: 100, type: "free_item" },
];

export default function AdminMarketing() {
  const [vouchers] = useState(mockVouchers);
  const [flashSales] = useState(mockFlashSales);
  const [bundles] = useState(mockBundles);
  const [voucherDialog, setVoucherDialog] = useState(false);
  const [loyaltyEnabled, setLoyaltyEnabled] = useState(true);
  const [pointsPerRp, setPointsPerRp] = useState("1000");
  const [pointsToDiscount, setPointsToDiscount] = useState("100");

  const formatRp = (v: number) => `Rp ${v.toLocaleString("id-ID")}`;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Promo & Marketing</h2>

      {/* Vouchers */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2"><Tag className="h-4 w-4 text-muted-foreground" /><h3 className="text-sm font-semibold">Voucher</h3></div>
            <Dialog open={voucherDialog} onOpenChange={setVoucherDialog}>
              <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-2" />Buat Voucher</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Buat Voucher Baru</DialogTitle></DialogHeader>
                <div className="space-y-4">
                  <div><Label>Kode Voucher</Label><Input placeholder="KODE10" className="mt-1" /></div>
                  <div><Label>Tipe Diskon</Label>
                    <Select defaultValue="percentage"><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent><SelectItem value="percentage">Persentase (%)</SelectItem><SelectItem value="nominal">Nominal (Rp)</SelectItem></SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label>Nilai Diskon</Label><Input type="number" placeholder="10" className="mt-1" /></div>
                    <div><Label>Min. Belanja</Label><Input type="number" placeholder="100000" className="mt-1" /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label>Kuota</Label><Input type="number" placeholder="100" className="mt-1" /></div>
                    <div><Label>Berlaku Sampai</Label><Input type="date" className="mt-1" /></div>
                  </div>
                </div>
                <DialogFooter><Button onClick={() => { toast.success("Voucher berhasil dibuat (mock)"); setVoucherDialog(false); }}>Simpan</Button></DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Kode</TableHead><TableHead>Diskon</TableHead><TableHead>Min. Belanja</TableHead>
                <TableHead>Kuota</TableHead><TableHead>Status</TableHead><TableHead>Berlaku</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {vouchers.map(v => (
                <TableRow key={v.id}>
                  <TableCell className="font-mono font-bold">{v.code}</TableCell>
                  <TableCell>{v.type === "percentage" ? `${v.value}%` : formatRp(v.value)}</TableCell>
                  <TableCell>{formatRp(v.minPurchase)}</TableCell>
                  <TableCell>{v.used}/{v.quota}</TableCell>
                  <TableCell><Badge className={v.status === "active" ? "bg-green-500/20 text-green-400" : v.status === "depleted" ? "bg-red-500/20 text-red-400" : "bg-gray-500/20 text-gray-400"}>{v.status}</Badge></TableCell>
                  <TableCell className="text-xs">{v.validTo}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Flash Sale */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2"><Zap className="h-4 w-4 text-yellow-400" /><h3 className="text-sm font-semibold">Flash Sale</h3></div>
            <Button size="sm" variant="outline" onClick={() => toast.info("Form flash sale akan segera hadir")}><Plus className="h-4 w-4 mr-2" />Tambah Flash Sale</Button>
          </div>
          <div className="grid gap-3">
            {flashSales.map(fs => (
              <div key={fs.id} className="flex items-center gap-4 p-3 border rounded-lg">
                <div className="flex-1">
                  <p className="font-medium">{fs.product}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="line-through text-sm text-muted-foreground">{formatRp(fs.originalPrice)}</span>
                    <span className="font-bold text-red-400">{formatRp(fs.flashPrice)}</span>
                  </div>
                </div>
                <div className="text-right text-sm">
                  <p className="text-muted-foreground">{fs.sold}/{fs.stock} terjual</p>
                  <Badge variant="outline" className="text-[10px] mt-1">{new Date(fs.endTime) > new Date() ? "Active" : "Ended"}</Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Bundles */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2"><Package className="h-4 w-4 text-muted-foreground" /><h3 className="text-sm font-semibold">Bundle</h3></div>
            <Button size="sm" variant="outline" onClick={() => toast.info("Form bundle akan segera hadir")}><Plus className="h-4 w-4 mr-2" />Buat Bundle</Button>
          </div>
          <div className="grid gap-3">
            {bundles.map(b => (
              <div key={b.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="font-medium">{b.name}</p>
                  <p className="text-xs text-muted-foreground mt-1">{b.items.join(" + ")}</p>
                </div>
                <Badge className="bg-purple-500/20 text-purple-400">{b.type === "percentage" ? `${b.discount}% OFF` : "Free Item"}</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Loyalty Points */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2"><Gift className="h-4 w-4 text-muted-foreground" /><h3 className="text-sm font-semibold">Loyalty Points</h3></div>
            <Switch checked={loyaltyEnabled} onCheckedChange={setLoyaltyEnabled} />
          </div>
          {loyaltyEnabled && (
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Poin per Rp pembelian</Label><Input value={pointsPerRp} onChange={e => setPointsPerRp(e.target.value)} className="mt-1" placeholder="1 poin per Rp 1.000" /><p className="text-xs text-muted-foreground mt-1">1 poin per Rp {Number(pointsPerRp).toLocaleString()}</p></div>
              <div><Label>Poin → Diskon</Label><Input value={pointsToDiscount} onChange={e => setPointsToDiscount(e.target.value)} className="mt-1" placeholder="100 poin = Rp 10.000" /><p className="text-xs text-muted-foreground mt-1">{pointsToDiscount} poin = Rp 10.000</p></div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
