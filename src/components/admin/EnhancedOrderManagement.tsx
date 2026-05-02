import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { toast } from "sonner";
import { Search, Filter, Eye, FileText, Truck, Clock, Package, CheckCircle, XCircle, CreditCard, PackageCheck, Star, RotateCcw, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface Order {
  id: string;
  order_number: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  shipping_address: string;
  city: string;
  postal_code: string;
  product_name: string;
  product_image: string;
  product_price: string;
  size: string;
  quantity: number;
  total_amount: number;
  order_status: string;
  payment_status: string;
  payment_method: string;
  tracking_number?: string;
  return_reason?: string;
  cancelled_reason?: string;
  created_at: string;
}

const statusConfig: Record<string, { label: string; icon: any; color: string; badge: string }> = {
  pending: { label: "Pending", icon: Clock, color: "bg-yellow-500", badge: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" },
  paid: { label: "Dibayar", icon: CreditCard, color: "bg-emerald-500", badge: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" },
  processing: { label: "Processing", icon: Package, color: "bg-blue-500", badge: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
  packed: { label: "Dikemas", icon: PackageCheck, color: "bg-indigo-500", badge: "bg-indigo-500/20 text-indigo-400 border-indigo-500/30" },
  shipped: { label: "Shipped", icon: Truck, color: "bg-purple-500", badge: "bg-purple-500/20 text-purple-400 border-purple-500/30" },
  delivered: { label: "Sampai", icon: CheckCircle, color: "bg-teal-500", badge: "bg-teal-500/20 text-teal-400 border-teal-500/30" },
  completed: { label: "Done", icon: Star, color: "bg-green-500", badge: "bg-green-500/20 text-green-400 border-green-500/30" },
  return_requested: { label: "Return", icon: RotateCcw, color: "bg-orange-500", badge: "bg-orange-500/20 text-orange-400 border-orange-500/30" },
  cancelled: { label: "Cancelled", icon: XCircle, color: "bg-red-500", badge: "bg-red-500/20 text-red-400 border-red-500/30" },
};

const ITEMS_PER_PAGE = 10;

export default function EnhancedOrderManagement() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();
  const [page, setPage] = useState(1);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [trackingInput, setTrackingInput] = useState("");

  useEffect(() => {
    fetchOrders();
    const ch = supabase.channel("admin-orders-enhanced")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => fetchOrders())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const fetchOrders = async () => {
    const { data, error } = await supabase.from("orders").select("*").order("created_at", { ascending: false });
    if (error) { console.error(error); toast.error("Gagal memuat pesanan"); }
    else setOrders((data || []) as Order[]);
    setLoading(false);
  };

  const filtered = useMemo(() => {
    return orders.filter(o => {
      if (search) {
        const q = search.toLowerCase();
        if (!o.order_number.toLowerCase().includes(q) && !o.customer_name.toLowerCase().includes(q)) return false;
      }
      if (statusFilter !== "all" && o.order_status !== statusFilter) return false;
      if (paymentFilter !== "all" && o.payment_method !== paymentFilter) return false;
      if (dateFrom && new Date(o.created_at) < dateFrom) return false;
      if (dateTo) {
        const end = new Date(dateTo);
        end.setDate(end.getDate() + 1);
        if (new Date(o.created_at) > end) return false;
      }
      return true;
    });
  }, [orders, search, statusFilter, paymentFilter, dateFrom, dateTo]);

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginated = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  const paymentMethods = useMemo(() => [...new Set(orders.map(o => o.payment_method).filter(Boolean))], [orders]);

  const handleStatusChange = async (orderId: string, newStatus: string) => {
    const updateData: any = { order_status: newStatus };
    if (newStatus === "completed") updateData.completed_at = new Date().toISOString();
    if (newStatus === "paid") { updateData.payment_status = "paid"; updateData.paid_at = new Date().toISOString(); }
    const { error } = await supabase.from("orders").update(updateData).eq("id", orderId);
    if (error) toast.error("Gagal mengubah status");
    else toast.success(`Status diperbarui ke ${statusConfig[newStatus]?.label}`);
  };

  const handleAddTracking = async (orderId: string) => {
    if (!trackingInput.trim()) return;
    const { error } = await supabase.from("orders").update({ tracking_number: trackingInput, order_status: "shipped" }).eq("id", orderId);
    if (error) toast.error("Gagal menambahkan resi");
    else { toast.success("Nomor resi ditambahkan"); setTrackingInput(""); }
  };

  const formatCurrency = (n: number) => `Rp ${n.toLocaleString("id-ID")}`;

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Order Management</h2>
        <Badge variant="outline">{filtered.length} pesanan</Badge>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-3">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Cari ID Order atau nama customer..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} className="pl-10" />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={v => { setStatusFilter(v); setPage(1); }}>
              <SelectTrigger className="w-[150px]"><Filter className="h-3.5 w-3.5 mr-2" /><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Status</SelectItem>
                {Object.entries(statusConfig).map(([k, v]) => (<SelectItem key={k} value={k}>{v.label}</SelectItem>))}
              </SelectContent>
            </Select>
            <Select value={paymentFilter} onValueChange={v => { setPaymentFilter(v); setPage(1); }}>
              <SelectTrigger className="w-[150px]"><SelectValue placeholder="Payment" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Payment</SelectItem>
                {paymentMethods.map(m => (<SelectItem key={m} value={m}>{m}</SelectItem>))}
              </SelectContent>
            </Select>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="text-xs">
                  {dateFrom ? format(dateFrom, "dd/MM/yy") : "Dari"} — {dateTo ? format(dateTo, "dd/MM/yy") : "Sampai"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar mode="range" selected={{ from: dateFrom, to: dateTo }} onSelect={(range: any) => { setDateFrom(range?.from); setDateTo(range?.to); setPage(1); }} className="p-3 pointer-events-auto" />
              </PopoverContent>
            </Popover>
            {(search || statusFilter !== "all" || paymentFilter !== "all" || dateFrom) && (
              <Button variant="ghost" size="sm" onClick={() => { setSearch(""); setStatusFilter("all"); setPaymentFilter("all"); setDateFrom(undefined); setDateTo(undefined); setPage(1); }}>Reset</Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID Order</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Produk</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Tanggal</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginated.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-12 text-muted-foreground">Tidak ada pesanan ditemukan</TableCell></TableRow>
              ) : paginated.map(order => {
                const st = statusConfig[order.order_status] || statusConfig.pending;
                return (
                  <TableRow key={order.id} className="cursor-pointer hover:bg-muted/50" onClick={() => { setSelectedOrder(order); setDrawerOpen(true); }}>
                    <TableCell className="font-mono text-xs">{order.order_number}</TableCell>
                    <TableCell>
                      <div className="text-sm font-medium">{order.customer_name}</div>
                      <div className="text-xs text-muted-foreground">{order.customer_email}</div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <img src={order.product_image} alt="" className="w-8 h-8 rounded object-cover" />
                        <span className="text-sm truncate max-w-[120px]">{order.product_name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-medium">{formatCurrency(order.total_amount)}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{format(new Date(order.created_at), "dd MMM yyyy", { locale: localeId })}</TableCell>
                    <TableCell>
                      <Badge className={`text-[10px] ${st.badge} border`}>{st.label}</Badge>
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" onClick={e => { e.stopPropagation(); setSelectedOrder(order); setDrawerOpen(true); }}>
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <Pagination>
          <PaginationContent>
            <PaginationItem><PaginationPrevious onClick={() => setPage(p => Math.max(1, p - 1))} /></PaginationItem>
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
              const p = i + 1;
              return <PaginationItem key={p}><PaginationLink isActive={page === p} onClick={() => setPage(p)}>{p}</PaginationLink></PaginationItem>;
            })}
            <PaginationItem><PaginationNext onClick={() => setPage(p => Math.min(totalPages, p + 1))} /></PaginationItem>
          </PaginationContent>
        </Pagination>
      )}

      {/* Order Detail Drawer */}
      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          {selectedOrder && (
            <>
              <SheetHeader>
                <SheetTitle>Detail Pesanan #{selectedOrder.order_number}</SheetTitle>
              </SheetHeader>
              <div className="space-y-6 mt-6">
                {/* Product Info */}
                <div>
                  <h4 className="text-sm font-semibold mb-3">Info Produk</h4>
                  <div className="flex gap-3 p-3 bg-muted/30 rounded-lg">
                    <img src={selectedOrder.product_image} alt="" className="w-16 h-16 rounded object-cover" />
                    <div>
                      <p className="font-medium">{selectedOrder.product_name}</p>
                      <p className="text-sm text-muted-foreground">Size: {selectedOrder.size} • Qty: {selectedOrder.quantity}</p>
                      <p className="font-bold mt-1">{selectedOrder.product_price}</p>
                    </div>
                  </div>
                </div>

                {/* Customer Info */}
                <div>
                  <h4 className="text-sm font-semibold mb-3">Info Customer</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between"><span className="text-muted-foreground">Nama</span><span>{selectedOrder.customer_name}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Email</span><span>{selectedOrder.customer_email}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Telepon</span><span>{selectedOrder.customer_phone}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Alamat</span><span className="text-right max-w-[200px]">{selectedOrder.shipping_address}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Kota</span><span>{selectedOrder.city}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Kode Pos</span><span>{selectedOrder.postal_code}</span></div>
                  </div>
                </div>

                {/* Shipping Info */}
                <div>
                  <h4 className="text-sm font-semibold mb-3">Info Pengiriman</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between"><span className="text-muted-foreground">Payment</span><span>{selectedOrder.payment_method}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Resi</span><span>{selectedOrder.tracking_number || "—"}</span></div>
                  </div>
                  {!selectedOrder.tracking_number && (
                    <div className="flex gap-2 mt-3">
                      <Input placeholder="Masukkan nomor resi" value={trackingInput} onChange={e => setTrackingInput(e.target.value)} className="flex-1" />
                      <Button size="sm" onClick={() => handleAddTracking(selectedOrder.id)}>Simpan</Button>
                    </div>
                  )}
                </div>

                {/* Status Change */}
                <div>
                  <h4 className="text-sm font-semibold mb-3">Ubah Status</h4>
                  <Select value={selectedOrder.order_status} onValueChange={v => handleStatusChange(selectedOrder.id, v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(statusConfig).map(([k, v]) => (<SelectItem key={k} value={k}>{v.label}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1" onClick={() => toast.info("Fitur cetak invoice akan segera hadir")}>
                    <FileText className="h-4 w-4 mr-2" />Cetak Invoice
                  </Button>
                  <Button variant="outline" className="flex-1" onClick={() => toast.info("Fitur cetak label akan segera hadir")}>
                    <Truck className="h-4 w-4 mr-2" />Cetak Label
                  </Button>
                </div>

                {selectedOrder.return_reason && (
                  <div className="p-3 bg-orange-50 dark:bg-orange-950 rounded-lg">
                    <p className="text-sm font-medium">Alasan Pengembalian:</p>
                    <p className="text-sm">{selectedOrder.return_reason}</p>
                  </div>
                )}
                {selectedOrder.cancelled_reason && (
                  <div className="p-3 bg-red-50 dark:bg-red-950 rounded-lg">
                    <p className="text-sm font-medium">Alasan Pembatalan:</p>
                    <p className="text-sm">{selectedOrder.cancelled_reason}</p>
                  </div>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
