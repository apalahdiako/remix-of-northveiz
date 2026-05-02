import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Search, Users, Mail, Phone } from "lucide-react";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";

interface Customer {
  id: string;
  full_name: string | null;
  phone: string | null;
  birthday: string | null;
  created_at: string;
  orderCount: number;
  totalSpent: number;
  segment: string;
  lastOrder: string | null;
}

function getSegment(orderCount: number, lastOrderDate: string | null): string {
  if (orderCount === 0) return "New";
  if (lastOrderDate) {
    const daysSince = Math.floor((Date.now() - new Date(lastOrderDate).getTime()) / (1000 * 60 * 60 * 24));
    if (daysSince > 60) return "Dormant";
  }
  if (orderCount >= 5) return "Loyal";
  if (orderCount >= 2) return "Active";
  return "New";
}

const segmentColors: Record<string, string> = {
  New: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  Active: "bg-green-500/20 text-green-400 border-green-500/30",
  Loyal: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  Dormant: "bg-gray-500/20 text-gray-400 border-gray-500/30",
};

export default function AdminCustomerManagement() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerOrders, setCustomerOrders] = useState<any[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => { fetchCustomers(); }, []);

  const fetchCustomers = async () => {
    const [profilesRes, ordersRes] = await Promise.all([
      supabase.from("profiles").select("*").order("created_at", { ascending: false }),
      supabase.from("orders").select("user_id, total_amount, created_at").order("created_at", { ascending: false }),
    ]);
    const profiles = profilesRes.data || [];
    const orders = ordersRes.data || [];

    const orderMap: Record<string, { count: number; total: number; lastOrder: string | null }> = {};
    orders.forEach((o: any) => {
      if (!o.user_id) return;
      if (!orderMap[o.user_id]) orderMap[o.user_id] = { count: 0, total: 0, lastOrder: null };
      orderMap[o.user_id].count++;
      orderMap[o.user_id].total += Number(o.total_amount) || 0;
      if (!orderMap[o.user_id].lastOrder || o.created_at > orderMap[o.user_id].lastOrder!) {
        orderMap[o.user_id].lastOrder = o.created_at;
      }
    });

    const custs: Customer[] = profiles.map((p: any) => {
      const om = orderMap[p.id] || { count: 0, total: 0, lastOrder: null };
      return {
        id: p.id,
        full_name: p.full_name,
        phone: p.phone,
        birthday: p.birthday,
        created_at: p.created_at,
        orderCount: om.count,
        totalSpent: om.total,
        segment: getSegment(om.count, om.lastOrder),
        lastOrder: om.lastOrder,
      };
    });
    setCustomers(custs);
    setLoading(false);
  };

  const openCustomer = async (c: Customer) => {
    setSelectedCustomer(c);
    setDrawerOpen(true);
    const { data } = await supabase.from("orders").select("*").eq("user_id", c.id).order("created_at", { ascending: false });
    setCustomerOrders(data || []);
  };

  const filtered = useMemo(() => {
    if (!search) return customers;
    const q = search.toLowerCase();
    return customers.filter(c => (c.full_name || "").toLowerCase().includes(q) || (c.phone || "").includes(q));
  }, [customers, search]);

  const formatRp = (v: number) => `Rp ${v.toLocaleString("id-ID")}`;

  if (loading) return <div className="space-y-4">{[1,2,3].map(i => <Skeleton key={i} className="h-16 w-full" />)}</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Customer Management</h2>
        <Badge variant="outline">{customers.length} customer</Badge>
      </div>

      {/* Segment summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {(["New", "Active", "Loyal", "Dormant"] as const).map(seg => (
          <Card key={seg}>
            <CardContent className="p-3 text-center">
              <div className="text-2xl font-bold">{customers.filter(c => c.segment === seg).length}</div>
              <Badge className={`mt-1 text-[10px] ${segmentColors[seg]} border`}>{seg}</Badge>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Cari nama atau nomor HP..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
      </div>

      <Card>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nama</TableHead>
                <TableHead>Telepon</TableHead>
                <TableHead className="text-right">Orders</TableHead>
                <TableHead className="text-right">Total Belanja</TableHead>
                <TableHead>Segmen</TableHead>
                <TableHead>Terdaftar</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center py-12 text-muted-foreground">Tidak ada customer</TableCell></TableRow>
              ) : filtered.map(c => (
                <TableRow key={c.id} className="cursor-pointer hover:bg-muted/50" onClick={() => openCustomer(c)}>
                  <TableCell className="font-medium">{c.full_name || "—"}</TableCell>
                  <TableCell className="text-sm">{c.phone || "—"}</TableCell>
                  <TableCell className="text-right">{c.orderCount}</TableCell>
                  <TableCell className="text-right">{formatRp(c.totalSpent)}</TableCell>
                  <TableCell><Badge className={`text-[10px] ${segmentColors[c.segment]} border`}>{c.segment}</Badge></TableCell>
                  <TableCell className="text-xs text-muted-foreground">{format(new Date(c.created_at), "dd MMM yyyy", { locale: localeId })}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>

      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          {selectedCustomer && (
            <>
              <SheetHeader>
                <SheetTitle>{selectedCustomer.full_name || "Customer"}</SheetTitle>
              </SheetHeader>
              <div className="space-y-6 mt-6">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-muted-foreground">Telepon</span><span>{selectedCustomer.phone || "—"}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Segmen</span><Badge className={`text-[10px] ${segmentColors[selectedCustomer.segment]} border`}>{selectedCustomer.segment}</Badge></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Total Order</span><span>{selectedCustomer.orderCount}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Total Belanja</span><span className="font-bold">{formatRp(selectedCustomer.totalSpent)}</span></div>
                </div>

                <div>
                  <h4 className="text-sm font-semibold mb-3">Riwayat Pembelian</h4>
                  {customerOrders.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Belum ada pembelian</p>
                  ) : customerOrders.map((o: any) => (
                    <div key={o.id} className="flex items-center gap-3 p-2 border-b last:border-0">
                      <img src={o.product_image} alt="" className="w-10 h-10 rounded object-cover" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{o.product_name}</p>
                        <p className="text-xs text-muted-foreground">{format(new Date(o.created_at), "dd MMM yyyy", { locale: localeId })}</p>
                      </div>
                      <span className="text-sm font-medium">Rp {Number(o.total_amount).toLocaleString("id-ID")}</span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
