import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Image, Layout, Bell, Mail, Plus, GripVertical } from "lucide-react";

const mockBanners = [
  { id: "1", title: "Summer Collection 2026", image: "/placeholder.svg", link: "/catalog", order: 1, active: true, startDate: "2026-05-01", endDate: "2026-08-31" },
  { id: "2", title: "Flash Sale Weekend", image: "/placeholder.svg", link: "/catalog?sale=true", order: 2, active: true, startDate: "2026-05-02", endDate: "2026-05-04" },
];

const mockCampaigns = [
  { id: "1", title: "Koleksi Summer 2026", description: "Produk terbaru untuk musim panas", products: 8, status: "active" },
  { id: "2", title: "NORTHVEIZ Basics", description: "Essentials untuk sehari-hari", products: 5, status: "draft" },
];

const mockNotifications = [
  { id: "1", title: "Flash Sale Dimulai!", body: "Diskon hingga 50% untuk produk pilihan", target: "Semua User", scheduled: "2026-05-02 10:00", status: "sent" },
  { id: "2", title: "Koleksi Baru Tiba", body: "Lihat koleksi Summer 2026 sekarang", target: "Loyal", scheduled: "2026-05-03 09:00", status: "scheduled" },
];

export default function AdminContent() {
  const [bannerDialog, setBannerDialog] = useState(false);
  const [notifDialog, setNotifDialog] = useState(false);

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Content Management</h2>

      {/* Banner Manager */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2"><Image className="h-4 w-4 text-muted-foreground" /><h3 className="text-sm font-semibold">Banner Manager</h3></div>
            <Dialog open={bannerDialog} onOpenChange={setBannerDialog}>
              <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-2" />Tambah Banner</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Tambah Banner Baru</DialogTitle></DialogHeader>
                <div className="space-y-4">
                  <div><Label>Judul Banner</Label><Input className="mt-1" placeholder="Summer Collection" /></div>
                  <div><Label>Upload Gambar</Label><Input type="file" accept="image/*" className="mt-1" /></div>
                  <div><Label>Link Tujuan</Label><Input className="mt-1" placeholder="/catalog" /></div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label>Tanggal Mulai</Label><Input type="date" className="mt-1" /></div>
                    <div><Label>Tanggal Selesai</Label><Input type="date" className="mt-1" /></div>
                  </div>
                </div>
                <DialogFooter><Button onClick={() => { toast.success("Banner ditambahkan (mock)"); setBannerDialog(false); }}>Simpan</Button></DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
          <div className="grid gap-3">
            {mockBanners.map(b => (
              <div key={b.id} className="flex items-center gap-3 p-3 border rounded-lg">
                <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
                <div className="w-20 h-12 bg-muted rounded flex items-center justify-center text-xs text-muted-foreground">Banner</div>
                <div className="flex-1">
                  <p className="font-medium text-sm">{b.title}</p>
                  <p className="text-xs text-muted-foreground">{b.link} • {b.startDate} — {b.endDate}</p>
                </div>
                <Badge className={b.active ? "bg-green-500/20 text-green-400" : "bg-gray-500/20 text-gray-400"}>{b.active ? "Active" : "Inactive"}</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Lookbook / Campaign */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2"><Layout className="h-4 w-4 text-muted-foreground" /><h3 className="text-sm font-semibold">Lookbook / Campaign</h3></div>
            <Button size="sm" variant="outline" onClick={() => toast.info("Form campaign akan segera hadir")}><Plus className="h-4 w-4 mr-2" />Buat Campaign</Button>
          </div>
          <div className="grid gap-3">
            {mockCampaigns.map(c => (
              <div key={c.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="font-medium">{c.title}</p>
                  <p className="text-xs text-muted-foreground">{c.description} • {c.products} produk</p>
                </div>
                <Badge className={c.status === "active" ? "bg-green-500/20 text-green-400" : "bg-yellow-500/20 text-yellow-400"}>{c.status}</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Push Notification */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2"><Bell className="h-4 w-4 text-muted-foreground" /><h3 className="text-sm font-semibold">Push Notification</h3></div>
            <Dialog open={notifDialog} onOpenChange={setNotifDialog}>
              <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-2" />Buat Notifikasi</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Buat Push Notification</DialogTitle></DialogHeader>
                <div className="space-y-4">
                  <div><Label>Judul</Label><Input className="mt-1" placeholder="Judul notifikasi" /></div>
                  <div><Label>Isi</Label><Textarea className="mt-1" placeholder="Isi pesan..." /></div>
                  <div><Label>Target</Label>
                    <Select defaultValue="all"><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent><SelectItem value="all">Semua User</SelectItem><SelectItem value="new">New</SelectItem><SelectItem value="active">Active</SelectItem><SelectItem value="loyal">Loyal</SelectItem></SelectContent>
                    </Select>
                  </div>
                  <div><Label>Jadwal Kirim</Label><Input type="datetime-local" className="mt-1" /></div>
                </div>
                <DialogFooter><Button onClick={() => { toast.success("Notifikasi dijadwalkan (mock)"); setNotifDialog(false); }}>Jadwalkan</Button></DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
          <Table>
            <TableHeader>
              <TableRow><TableHead>Judul</TableHead><TableHead>Target</TableHead><TableHead>Jadwal</TableHead><TableHead>Status</TableHead></TableRow>
            </TableHeader>
            <TableBody>
              {mockNotifications.map(n => (
                <TableRow key={n.id}>
                  <TableCell><div><p className="font-medium text-sm">{n.title}</p><p className="text-xs text-muted-foreground">{n.body}</p></div></TableCell>
                  <TableCell>{n.target}</TableCell>
                  <TableCell className="text-xs">{n.scheduled}</TableCell>
                  <TableCell><Badge className={n.status === "sent" ? "bg-green-500/20 text-green-400" : "bg-blue-500/20 text-blue-400"}>{n.status}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
