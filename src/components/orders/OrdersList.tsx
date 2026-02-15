import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Package, Truck, CheckCircle, XCircle, RotateCcw, Clock, CreditCard, PackageCheck, Star } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { OrderTrackingStepper } from "./OrderTrackingStepper";

interface Order {
  id: string;
  order_number: string;
  product_name: string;
  product_image: string;
  product_price: string;
  size: string;
  quantity: number;
  total_amount: number;
  order_status: string;
  tracking_number?: string;
  created_at: string;
  updated_at: string;
}

const statusConfig: Record<string, { label: string; icon: any; color: string }> = {
  pending: { label: "Menunggu Bayar", icon: Clock, color: "bg-yellow-500" },
  paid: { label: "Dibayar", icon: CreditCard, color: "bg-emerald-500" },
  processing: { label: "Diproses", icon: Package, color: "bg-blue-500" },
  packed: { label: "Dikemas", icon: PackageCheck, color: "bg-indigo-500" },
  shipped: { label: "Dikirim", icon: Truck, color: "bg-purple-500" },
  delivered: { label: "Sampai", icon: CheckCircle, color: "bg-teal-500" },
  completed: { label: "Selesai", icon: Star, color: "bg-green-500" },
  return_requested: { label: "Pengembalian", icon: RotateCcw, color: "bg-orange-500" },
  cancelled: { label: "Dibatalkan", icon: XCircle, color: "bg-red-500" },
};

export const OrdersList = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all");
  const [cancelReason, setCancelReason] = useState("");
  const [returnReason, setReturnReason] = useState("");
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);

  useEffect(() => {
    fetchOrders();
    const channel = supabase
      .channel('user-orders')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, (payload) => {
        fetchOrders();
        // Toast on status change
        if (payload.eventType === 'UPDATE' && payload.new) {
          const newStatus = (payload.new as any).order_status;
          const config = statusConfig[newStatus];
          if (config) {
            toast({ title: "Status Pesanan Berubah", description: `Pesanan diperbarui ke: ${config.label}` });
          }
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const fetchOrders = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data, error } = await supabase.from('orders').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
      if (error) throw error;
      setOrders(data || []);
    } catch (error) {
      console.error('Error fetching orders:', error);
      toast({ title: "Error", description: "Gagal memuat pesanan", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleCancelOrder = async (orderId: string) => {
    try {
      const { error } = await supabase.from('orders').update({ order_status: 'cancelled', cancelled_reason: cancelReason, cancelled_at: new Date().toISOString() }).eq('id', orderId);
      if (error) throw error;
      toast({ title: "Pesanan Dibatalkan", description: "Pesanan berhasil dibatalkan" });
      setCancelReason("");
    } catch (error) {
      console.error('Error cancelling order:', error);
      toast({ title: "Error", description: "Gagal membatalkan pesanan", variant: "destructive" });
    }
  };

  const handleRequestReturn = async (orderId: string) => {
    try {
      const { error } = await supabase.from('orders').update({ order_status: 'return_requested', return_reason: returnReason }).eq('id', orderId);
      if (error) throw error;
      toast({ title: "Pengembalian Diajukan", description: "Permintaan pengembalian telah dikirim" });
      setReturnReason("");
    } catch (error) {
      console.error('Error requesting return:', error);
      toast({ title: "Error", description: "Gagal mengajukan pengembalian", variant: "destructive" });
    }
  };

  const handleConfirmDelivery = async (orderId: string) => {
    try {
      const { error } = await supabase.from('orders').update({ order_status: 'completed', completed_at: new Date().toISOString() }).eq('id', orderId);
      if (error) throw error;
      toast({ title: "Pesanan Diterima!", description: "Terima kasih! Anda sekarang bisa memberikan ulasan." });
    } catch (error) {
      console.error('Error confirming delivery:', error);
      toast({ title: "Error", description: "Gagal mengkonfirmasi penerimaan", variant: "destructive" });
    }
  };

  const filteredOrders = orders.filter(order => activeTab === "all" || order.order_status === activeTab);
  const counts = {
    all: orders.length,
    pending: orders.filter(o => o.order_status === 'pending').length,
    paid: orders.filter(o => o.order_status === 'paid').length,
    processing: orders.filter(o => o.order_status === 'processing').length,
    shipped: orders.filter(o => o.order_status === 'shipped').length,
    delivered: orders.filter(o => o.order_status === 'delivered').length,
    completed: orders.filter(o => o.order_status === 'completed').length,
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <Card key={i} className="p-4">
            <div className="flex gap-4">
              <Skeleton className="w-20 h-20 rounded" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-4 w-1/3" />
              </div>
            </div>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full grid grid-cols-4 lg:grid-cols-7 gap-2">
          <TabsTrigger value="all" className="text-xs">Semua ({counts.all})</TabsTrigger>
          <TabsTrigger value="pending" className="text-xs">Belum Bayar ({counts.pending})</TabsTrigger>
          <TabsTrigger value="processing" className="text-xs">Diproses ({counts.processing})</TabsTrigger>
          <TabsTrigger value="shipped" className="text-xs">Dikirim ({counts.shipped})</TabsTrigger>
          <TabsTrigger value="delivered" className="text-xs">Sampai ({counts.delivered})</TabsTrigger>
          <TabsTrigger value="completed" className="text-xs">Selesai ({counts.completed})</TabsTrigger>
          <TabsTrigger value="cancelled" className="text-xs">Batal</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="space-y-4 mt-6">
          {filteredOrders.length === 0 ? (
            <Card className="p-8 text-center"><p className="text-muted-foreground">Tidak ada pesanan</p></Card>
          ) : (
            filteredOrders.map((order) => {
              const status = statusConfig[order.order_status] || statusConfig.pending;
              const StatusIcon = status.icon;
              const isExpanded = expandedOrder === order.id;

              return (
                <Card key={order.id} className="p-4 transition-all duration-300">
                  <div
                    className="flex gap-4 cursor-pointer"
                    onClick={() => setExpandedOrder(isExpanded ? null : order.id)}
                  >
                    <img src={order.product_image} alt={order.product_name} className="w-20 h-20 object-cover rounded" />
                    <div className="flex-1 space-y-2">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-bold">{order.product_name}</h3>
                          <p className="text-sm text-muted-foreground">{order.order_number} • Size {order.size} • Qty {order.quantity}</p>
                        </div>
                        <Badge className={status.color}>
                          <StatusIcon className="w-3 h-3 mr-1" />{status.label}
                        </Badge>
                      </div>
                      <div className="text-sm">
                        <p className="font-bold">Total: {order.product_price}</p>
                        <p className="text-muted-foreground">
                          {new Date(order.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Expanded: Tracking Stepper */}
                  {isExpanded && (
                    <div className="mt-4 pt-4 border-t animate-fade-in">
                      <h4 className="font-semibold mb-2 text-sm">Status Pengiriman</h4>
                      <OrderTrackingStepper currentStatus={order.order_status} trackingNumber={order.tracking_number} />

                      <div className="flex gap-2 mt-4 flex-wrap">
                        {order.order_status === 'pending' && (
                          <Button size="sm" className="bg-primary" onClick={(e) => { e.stopPropagation(); window.location.href = `/payment?orderId=${order.id}&orderNumber=${order.order_number}`; }}>
                            <CreditCard className="w-4 h-4 mr-1" /> Bayar Sekarang
                          </Button>
                        )}

                        {(order.order_status === 'pending' || order.order_status === 'processing') && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="destructive" size="sm">Batalkan Pesanan</Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Batalkan Pesanan?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  <Textarea placeholder="Alasan pembatalan (opsional)" value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} className="mt-4" />
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Batal</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleCancelOrder(order.id)}>Ya, Batalkan</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}

                        {order.order_status === 'delivered' && (
                          <Button size="sm" className="bg-primary" onClick={() => handleConfirmDelivery(order.id)}>
                            <CheckCircle className="w-4 h-4 mr-1" /> Pesanan Diterima
                          </Button>
                        )}

                        {order.order_status === 'completed' && (
                          <>
                            <Button variant="outline" size="sm" onClick={() => window.location.href = `/product/${order.product_name.toLowerCase().replace(/\s+/g, '-')}`}>
                              <Star className="w-4 h-4 mr-1" /> Beri Ulasan
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="outline" size="sm">Ajukan Pengembalian</Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Ajukan Pengembalian</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    <Textarea placeholder="Alasan pengembalian (wajib)" value={returnReason} onChange={(e) => setReturnReason(e.target.value)} className="mt-4" required />
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Batal</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleRequestReturn(order.id)} disabled={!returnReason.trim()}>Ajukan</AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </Card>
              );
            })
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};
