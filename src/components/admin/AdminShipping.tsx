import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Truck, Search, CheckCircle, XCircle, Clock, RefreshCcw, Package } from "lucide-react";

const couriers = [
  { name: "JNE", connected: true, logo: "📦" },
  { name: "J&T Express", connected: true, logo: "🚚" },
  { name: "SiCepat", connected: false, logo: "⚡" },
  { name: "Anteraja", connected: false, logo: "🏃" },
  { name: "Ninja Xpress", connected: false, logo: "🥷" },
];

const mockShipments = [
  { id: "1", orderNumber: "ORD-001", customer: "Budi Santoso", courier: "JNE", tracking: "JNE123456789", status: "In Transit", lastUpdate: "2026-05-01 14:30" },
  { id: "2", orderNumber: "ORD-002", customer: "Ani Wijaya", courier: "J&T Express", tracking: "JT987654321", status: "Delivered", lastUpdate: "2026-05-01 10:15" },
  { id: "3", orderNumber: "ORD-003", customer: "Cici Mulia", courier: "JNE", tracking: "JNE111222333", status: "Picked Up", lastUpdate: "2026-05-02 08:00" },
];

const mockReturns = [
  { id: "1", orderNumber: "ORD-010", customer: "Dedi Kurnia", product: "NORTHVEIZ Hoodie", reason: "Ukuran tidak sesuai", status: "Pending Review", photo: "📷" },
  { id: "2", orderNumber: "ORD-015", customer: "Eka Sari", product: "NORTHVEIZ Tee", reason: "Cacat produksi", status: "Approved", photo: "📷" },
];

export default function AdminShipping() {
  const [trackingInput, setTrackingInput] = useState("");
  const [returns, setReturns] = useState(mockReturns);

  const handleTrack = () => {
    if (!trackingInput.trim()) return;
    toast.info(`Tracking ${trackingInput}: Paket dalam perjalanan ke kota tujuan (mock data)`);
  };

  const handleReturn = (id: string, action: "approve" | "reject") => {
    setReturns(prev => prev.map(r => r.id === id ? { ...r, status: action === "approve" ? "Approved" : "Rejected" } : r));
    toast.success(action === "approve" ? "Return disetujui" : "Return ditolak");
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Shipping & Logistik</h2>

      {/* Courier Status */}
      <Card>
        <CardContent className="p-4">
          <h3 className="text-sm font-semibold mb-4">Status Koneksi Kurir</h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {couriers.map(c => (
              <div key={c.name} className="flex items-center gap-2 p-3 border rounded-lg">
                <span className="text-2xl">{c.logo}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{c.name}</p>
                  <Badge className={`text-[10px] mt-1 ${c.connected ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}`}>
                    {c.connected ? "Terhubung" : "Belum"}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Track */}
      <Card>
        <CardContent className="p-4">
          <h3 className="text-sm font-semibold mb-3">Lacak Pengiriman</h3>
          <div className="flex gap-2">
            <Input placeholder="Masukkan nomor resi..." value={trackingInput} onChange={e => setTrackingInput(e.target.value)} className="flex-1" />
            <Button onClick={handleTrack}><Search className="h-4 w-4 mr-2" />Lacak</Button>
          </div>
        </CardContent>
      </Card>

      {/* Active Shipments */}
      <Card>
        <CardContent className="p-4">
          <h3 className="text-sm font-semibold mb-4">Pengiriman Aktif</h3>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order</TableHead><TableHead>Customer</TableHead><TableHead>Kurir</TableHead>
                <TableHead>Resi</TableHead><TableHead>Status</TableHead><TableHead>Update</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mockShipments.map(s => (
                <TableRow key={s.id}>
                  <TableCell className="font-mono text-xs">{s.orderNumber}</TableCell>
                  <TableCell>{s.customer}</TableCell>
                  <TableCell>{s.courier}</TableCell>
                  <TableCell className="font-mono text-xs">{s.tracking}</TableCell>
                  <TableCell><Badge variant="outline">{s.status}</Badge></TableCell>
                  <TableCell className="text-xs text-muted-foreground">{s.lastUpdate}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Returns */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-4"><RefreshCcw className="h-4 w-4 text-muted-foreground" /><h3 className="text-sm font-semibold">Return & Refund</h3></div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order</TableHead><TableHead>Customer</TableHead><TableHead>Produk</TableHead>
                <TableHead>Alasan</TableHead><TableHead>Status</TableHead><TableHead>Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {returns.map(r => (
                <TableRow key={r.id}>
                  <TableCell className="font-mono text-xs">{r.orderNumber}</TableCell>
                  <TableCell>{r.customer}</TableCell>
                  <TableCell>{r.product}</TableCell>
                  <TableCell className="text-sm">{r.reason}</TableCell>
                  <TableCell>
                    <Badge className={r.status === "Approved" ? "bg-green-500/20 text-green-400" : r.status === "Rejected" ? "bg-red-500/20 text-red-400" : "bg-yellow-500/20 text-yellow-400"}>
                      {r.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {r.status === "Pending Review" && (
                      <div className="flex gap-1">
                        <Button size="sm" variant="outline" className="text-green-400 h-7 text-xs" onClick={() => handleReturn(r.id, "approve")}>✓</Button>
                        <Button size="sm" variant="outline" className="text-red-400 h-7 text-xs" onClick={() => handleReturn(r.id, "reject")}>✕</Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
