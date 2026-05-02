import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Store, CreditCard, Receipt, Shield, Link2, Plus, Settings } from "lucide-react";

const paymentGateways = [
  { id: "bank", name: "Transfer Bank", enabled: true },
  { id: "qris", name: "QRIS", enabled: true },
  { id: "ovo", name: "OVO", enabled: false },
  { id: "gopay", name: "GoPay", enabled: true },
  { id: "dana", name: "Dana", enabled: false },
  { id: "cc", name: "Kartu Kredit (Midtrans)", enabled: true },
  { id: "cod", name: "COD", enabled: false },
];

const mockAdmins = [
  { id: "1", name: "Admin Owner", email: "northveiz@gmail.com", role: "Owner", lastActive: "2026-05-02" },
  { id: "2", name: "CS Team", email: "cs@northveiz.com", role: "CS", lastActive: "2026-05-01" },
];

const marketplaces = [
  { name: "Tokopedia", connected: false, logo: "🟢" },
  { name: "Shopee", connected: false, logo: "🟠" },
  { name: "TikTok Shop", connected: false, logo: "⬛" },
];

export default function AdminSettings() {
  const [storeName, setStoreName] = useState("NORTHVEIZ");
  const [storeEmail, setStoreEmail] = useState("northveiz@gmail.com");
  const [storePhone, setStorePhone] = useState("+62 812-3456-7890");
  const [storeAddress, setStoreAddress] = useState("Jakarta, Indonesia");
  const [storeDesc, setStoreDesc] = useState("Premium Streetwear Brand");
  const [gateways, setGateways] = useState(paymentGateways);
  const [taxEnabled, setTaxEnabled] = useState(true);
  const [taxRate, setTaxRate] = useState("11");
  const [taxInclusive, setTaxInclusive] = useState(true);
  const [adminDialog, setAdminDialog] = useState(false);

  const toggleGateway = (id: string) => {
    setGateways(prev => prev.map(g => g.id === id ? { ...g, enabled: !g.enabled } : g));
    toast.success("Payment gateway diperbarui");
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Settings</h2>

      <Tabs defaultValue="store">
        <TabsList className="flex flex-wrap">
          <TabsTrigger value="store"><Store className="h-3.5 w-3.5 mr-1.5" />Info Toko</TabsTrigger>
          <TabsTrigger value="payment"><CreditCard className="h-3.5 w-3.5 mr-1.5" />Payment</TabsTrigger>
          <TabsTrigger value="tax"><Receipt className="h-3.5 w-3.5 mr-1.5" />Pajak</TabsTrigger>
          <TabsTrigger value="roles"><Shield className="h-3.5 w-3.5 mr-1.5" />Role Admin</TabsTrigger>
          <TabsTrigger value="marketplace"><Link2 className="h-3.5 w-3.5 mr-1.5" />Marketplace</TabsTrigger>
        </TabsList>

        <TabsContent value="store">
          <Card>
            <CardContent className="p-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><Label>Nama Toko</Label><Input value={storeName} onChange={e => setStoreName(e.target.value)} className="mt-1" /></div>
                <div><Label>Email</Label><Input value={storeEmail} onChange={e => setStoreEmail(e.target.value)} className="mt-1" /></div>
                <div><Label>Telepon</Label><Input value={storePhone} onChange={e => setStorePhone(e.target.value)} className="mt-1" /></div>
                <div><Label>Alamat</Label><Input value={storeAddress} onChange={e => setStoreAddress(e.target.value)} className="mt-1" /></div>
              </div>
              <div><Label>Deskripsi Toko</Label><Textarea value={storeDesc} onChange={e => setStoreDesc(e.target.value)} className="mt-1" /></div>
              <div><Label>Logo Toko</Label><Input type="file" accept="image/*" className="mt-1" /></div>
              <Button onClick={() => toast.success("Info toko disimpan (mock)")}>Simpan</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payment">
          <Card>
            <CardContent className="p-4">
              <div className="space-y-3">
                {gateways.map(g => (
                  <div key={g.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <span className="font-medium">{g.name}</span>
                    <Switch checked={g.enabled} onCheckedChange={() => toggleGateway(g.id)} />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tax">
          <Card>
            <CardContent className="p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div><Label>PPN Aktif</Label><p className="text-xs text-muted-foreground">Aktifkan Pajak Pertambahan Nilai</p></div>
                <Switch checked={taxEnabled} onCheckedChange={setTaxEnabled} />
              </div>
              {taxEnabled && (
                <>
                  <div><Label>Tarif PPN (%)</Label><Input value={taxRate} onChange={e => setTaxRate(e.target.value)} className="mt-1 w-32" type="number" /></div>
                  <div className="flex items-center justify-between">
                    <div><Label>Harga Sudah Termasuk Pajak</Label><p className="text-xs text-muted-foreground">Jika aktif, harga yang ditampilkan sudah termasuk PPN</p></div>
                    <Switch checked={taxInclusive} onCheckedChange={setTaxInclusive} />
                  </div>
                </>
              )}
              <Button onClick={() => toast.success("Pengaturan pajak disimpan (mock)")}>Simpan</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="roles">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold">Role & Akses Admin</h3>
                <Dialog open={adminDialog} onOpenChange={setAdminDialog}>
                  <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-2" />Tambah Admin</Button></DialogTrigger>
                  <DialogContent>
                    <DialogHeader><DialogTitle>Tambah Admin Baru</DialogTitle></DialogHeader>
                    <div className="space-y-4">
                      <div><Label>Nama</Label><Input className="mt-1" /></div>
                      <div><Label>Email</Label><Input type="email" className="mt-1" /></div>
                      <div><Label>Role</Label>
                        <Select defaultValue="cs"><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="owner">Owner (Akses Semua)</SelectItem>
                            <SelectItem value="cs">CS (Pesanan & Customer)</SelectItem>
                            <SelectItem value="gudang">Gudang (Produk & Pengiriman)</SelectItem>
                            <SelectItem value="marketing">Marketing (Promo & Konten)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <DialogFooter><Button onClick={() => { toast.success("Admin ditambahkan (mock)"); setAdminDialog(false); }}>Simpan</Button></DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
              <Table>
                <TableHeader><TableRow><TableHead>Nama</TableHead><TableHead>Email</TableHead><TableHead>Role</TableHead><TableHead>Terakhir Aktif</TableHead></TableRow></TableHeader>
                <TableBody>
                  {mockAdmins.map(a => (
                    <TableRow key={a.id}>
                      <TableCell className="font-medium">{a.name}</TableCell>
                      <TableCell>{a.email}</TableCell>
                      <TableCell><Badge variant="outline">{a.role}</Badge></TableCell>
                      <TableCell className="text-xs text-muted-foreground">{a.lastActive}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="marketplace">
          <Card>
            <CardContent className="p-4">
              <h3 className="text-sm font-semibold mb-4">Integrasi Marketplace</h3>
              <div className="space-y-3">
                {marketplaces.map(m => (
                  <div key={m.name} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{m.logo}</span>
                      <div>
                        <p className="font-medium">{m.name}</p>
                        <Badge className={`text-[10px] mt-1 ${m.connected ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}`}>
                          {m.connected ? "Terhubung" : "Belum Terhubung"}
                        </Badge>
                      </div>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => toast.info(`Integrasi ${m.name} membutuhkan API key`)}>
                      {m.connected ? "Sync" : "Hubungkan"}
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
