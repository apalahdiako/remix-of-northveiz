import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Truck, RefreshCcw, MapPin, Wifi } from "lucide-react";
import CourierConnection from "./CourierConnection";
import LiveTrackingMap from "./LiveTrackingMap";
import { useTrackingSimulation } from "@/hooks/useTrackingSimulation";

const mockReturns = [
  { id: "1", orderNumber: "ORD-010", customer: "Dedi Kurnia", product: "NORTHVEIZ Hoodie", reason: "Ukuran tidak sesuai", status: "Pending Review", photo: "📷" },
  { id: "2", orderNumber: "ORD-015", customer: "Eka Sari", product: "NORTHVEIZ Tee", reason: "Cacat produksi", status: "Approved", photo: "📷" },
];

export default function AdminShipping() {
  const [returns, setReturns] = useState(mockReturns);
  const [simulationEnabled, setSimulationEnabled] = useState(false);

  useTrackingSimulation(simulationEnabled);

  const handleReturn = (id: string, action: "approve" | "reject") => {
    setReturns(prev => prev.map(r => r.id === id ? { ...r, status: action === "approve" ? "Approved" : "Rejected" } : r));
    toast.success(action === "approve" ? "Return disetujui" : "Return ditolak");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Shipping & Logistik</h2>
        <Button
          variant={simulationEnabled ? "destructive" : "outline"}
          size="sm"
          onClick={() => {
            setSimulationEnabled(!simulationEnabled);
            toast.info(simulationEnabled ? "Simulasi dihentikan" : "Simulasi tracking dimulai (update tiap 20 detik)");
          }}
        >
          <Wifi className="h-4 w-4 mr-2" />
          {simulationEnabled ? "Stop Simulasi" : "Mulai Simulasi"}
        </Button>
      </div>

      <Tabs defaultValue="courier" className="space-y-4">
        <TabsList>
          <TabsTrigger value="courier"><Truck className="mr-1.5 h-3.5 w-3.5" />Koneksi Kurir</TabsTrigger>
          <TabsTrigger value="tracking"><MapPin className="mr-1.5 h-3.5 w-3.5" />Live Tracking</TabsTrigger>
          <TabsTrigger value="returns"><RefreshCcw className="mr-1.5 h-3.5 w-3.5" />Return & Refund</TabsTrigger>
        </TabsList>

        <TabsContent value="courier">
          <CourierConnection />
        </TabsContent>

        <TabsContent value="tracking">
          <LiveTrackingMap />
        </TabsContent>

        <TabsContent value="returns">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-4">
                <RefreshCcw className="h-4 w-4 text-muted-foreground" />
                <h3 className="text-sm font-semibold">Return & Refund</h3>
              </div>
              {returns.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <RefreshCcw className="h-10 w-10 mx-auto mb-3 opacity-40" />
                  <p>Belum ada permintaan return</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Produk</TableHead>
                      <TableHead>Alasan</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Aksi</TableHead>
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
                          <Badge className={
                            r.status === "Approved" ? "bg-green-500/20 text-green-400" :
                            r.status === "Rejected" ? "bg-red-500/20 text-red-400" :
                            "bg-yellow-500/20 text-yellow-400"
                          }>{r.status}</Badge>
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
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
