import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Package, Truck, CheckCircle, XCircle, RotateCcw, Clock } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";

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

const statusConfig = {
  pending_payment: { label: "Belum Bayar", icon: Clock, color: "bg-yellow-500" },
  processing: { label: "Dikemas", icon: Package, color: "bg-blue-500" },
  in_transit: { label: "Dikirim", icon: Truck, color: "bg-purple-500" },
  completed: { label: "Selesai", icon: CheckCircle, color: "bg-green-500" },
  return_requested: { label: "Pengembalian", icon: RotateCcw, color: "bg-orange-500" },
  cancelled: { label: "Dibatalkan", icon: XCircle, color: "bg-red-500" },
};

export const OrdersList = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all");
  const [cancelReason, setCancelReason] = useState("");
  const [returnReason, setReturnReason] = useState("");

  useEffect(() => {
    fetchOrders();

    // Subscribe to realtime updates
    const channel = supabase
      .channel('user-orders')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
        },
        () => {
          fetchOrders();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchOrders = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOrders(data || []);
    } catch (error) {
      console.error('Error fetching orders:', error);
      toast({
        title: "Error",
        description: "Gagal memuat pesanan",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCancelOrder = async (orderId: string) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({
          order_status: 'cancelled',
          cancelled_reason: cancelReason,
          cancelled_at: new Date().toISOString(),
        })
        .eq('id', orderId);

      if (error) throw error;

      toast({
        title: "Pesanan Dibatalkan",
        description: "Pesanan berhasil dibatalkan",
      });
      setCancelReason("");
    } catch (error) {
      console.error('Error cancelling order:', error);
      toast({
        title: "Error",
        description: "Gagal membatalkan pesanan",
        variant: "destructive",
      });
    }
  };

  const handleRequestReturn = async (orderId: string) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({
          order_status: 'return_requested',
          return_reason: returnReason,
        })
        .eq('id', orderId);

      if (error) throw error;

      toast({
        title: "Pengembalian Diajukan",
        description: "Permintaan pengembalian telah dikirim",
      });
      setReturnReason("");
    } catch (error) {
      console.error('Error requesting return:', error);
      toast({
        title: "Error",
        description: "Gagal mengajukan pengembalian",
        variant: "destructive",
      });
    }
  };

  const filteredOrders = orders.filter(order => {
    if (activeTab === "all") return true;
    return order.order_status === activeTab;
  });

  const getOrderCounts = () => {
    return {
      all: orders.length,
      pending_payment: orders.filter(o => o.order_status === 'pending_payment').length,
      processing: orders.filter(o => o.order_status === 'processing').length,
      in_transit: orders.filter(o => o.order_status === 'in_transit').length,
      completed: orders.filter(o => o.order_status === 'completed').length,
      return_requested: orders.filter(o => o.order_status === 'return_requested').length,
      cancelled: orders.filter(o => o.order_status === 'cancelled').length,
    };
  };

  const counts = getOrderCounts();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full grid grid-cols-4 lg:grid-cols-7 gap-2">
          <TabsTrigger value="all" className="text-xs">
            Semua ({counts.all})
          </TabsTrigger>
          <TabsTrigger value="pending_payment" className="text-xs">
            Belum Bayar ({counts.pending_payment})
          </TabsTrigger>
          <TabsTrigger value="processing" className="text-xs">
            Dikemas ({counts.processing})
          </TabsTrigger>
          <TabsTrigger value="in_transit" className="text-xs">
            Dikirim ({counts.in_transit})
          </TabsTrigger>
          <TabsTrigger value="completed" className="text-xs">
            Selesai ({counts.completed})
          </TabsTrigger>
          <TabsTrigger value="return_requested" className="text-xs">
            Pengembalian ({counts.return_requested})
          </TabsTrigger>
          <TabsTrigger value="cancelled" className="text-xs">
            Dibatalkan ({counts.cancelled})
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="space-y-4 mt-6">
          {filteredOrders.length === 0 ? (
            <Card className="p-8 text-center">
              <p className="text-muted-foreground">Tidak ada pesanan</p>
            </Card>
          ) : (
            filteredOrders.map((order) => {
              const status = statusConfig[order.order_status as keyof typeof statusConfig];
              const StatusIcon = status.icon;

              return (
                <Card key={order.id} className="p-4">
                  <div className="flex gap-4">
                    <img
                      src={order.product_image}
                      alt={order.product_name}
                      className="w-20 h-20 object-cover rounded"
                    />
                    <div className="flex-1 space-y-2">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-bold">{order.product_name}</h3>
                          <p className="text-sm text-muted-foreground">
                            {order.order_number} • Size {order.size} • Qty {order.quantity}
                          </p>
                        </div>
                        <Badge className={status.color}>
                          <StatusIcon className="w-3 h-3 mr-1" />
                          {status.label}
                        </Badge>
                      </div>

                      <div className="text-sm">
                        <p className="font-bold">Total: {order.product_price}</p>
                        <p className="text-muted-foreground">
                          {new Date(order.created_at).toLocaleDateString('id-ID', {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric'
                          })}
                        </p>
                      </div>

                      {order.tracking_number && (
                        <div className="flex items-center gap-2 text-sm">
                          <Truck className="w-4 h-4" />
                          <span className="font-medium">Resi:</span>
                          <a
                            href={`https://cekresi.com/?noresi=${order.tracking_number}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary underline"
                          >
                            {order.tracking_number}
                          </a>
                        </div>
                      )}

                      <div className="flex gap-2 pt-2">
                        {(order.order_status === 'pending_payment' || order.order_status === 'processing') && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="destructive" size="sm">
                                Batalkan Produk
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Batalkan Pesanan?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  <Textarea
                                    placeholder="Alasan pembatalan (opsional)"
                                    value={cancelReason}
                                    onChange={(e) => setCancelReason(e.target.value)}
                                    className="mt-4"
                                  />
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Batal</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleCancelOrder(order.id)}>
                                  Ya, Batalkan
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}

                        {order.order_status === 'completed' && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="outline" size="sm">
                                Ajukan Pengembalian
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Ajukan Pengembalian</AlertDialogTitle>
                                <AlertDialogDescription>
                                  <Textarea
                                    placeholder="Alasan pengembalian (wajib)"
                                    value={returnReason}
                                    onChange={(e) => setReturnReason(e.target.value)}
                                    className="mt-4"
                                    required
                                  />
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Batal</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleRequestReturn(order.id)}
                                  disabled={!returnReason.trim()}
                                >
                                  Ajukan
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};