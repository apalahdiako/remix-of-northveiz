import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Package, Truck, CheckCircle, XCircle, RotateCcw, Clock } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Order {
  id: string;
  order_number: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  shipping_address: string;
  product_name: string;
  product_image: string;
  product_price: string;
  size: string;
  quantity: number;
  total_amount: number;
  order_status: string;
  tracking_number?: string;
  return_reason?: string;
  cancelled_reason?: string;
  created_at: string;
}

const statusConfig = {
  pending_payment: { label: "Belum Bayar", icon: Clock, color: "bg-yellow-500" },
  processing: { label: "Dikemas", icon: Package, color: "bg-blue-500" },
  in_transit: { label: "Dikirim", icon: Truck, color: "bg-purple-500" },
  completed: { label: "Selesai", icon: CheckCircle, color: "bg-green-500" },
  return_requested: { label: "Pengembalian", icon: RotateCcw, color: "bg-orange-500" },
  cancelled: { label: "Dibatalkan", icon: XCircle, color: "bg-red-500" },
};

export const OrderManagement = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [trackingNumber, setTrackingNumber] = useState("");
  const [selectedOrderId, setSelectedOrderId] = useState<string>("");

  useEffect(() => {
    fetchOrders();

    // Subscribe to realtime updates
    const channel = supabase
      .channel('admin-orders')
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
      const { data, error } = await supabase
        .from('orders')
        .select('*')
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

  const handleStatusChange = async (orderId: string, newStatus: string) => {
    try {
      const updateData: any = { order_status: newStatus };

      // If changing to completed, set completed_at
      if (newStatus === 'completed') {
        updateData.completed_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('orders')
        .update(updateData)
        .eq('id', orderId);

      if (error) throw error;

      toast({
        title: "Status Diperbarui",
        description: "Status pesanan berhasil diubah",
      });
    } catch (error) {
      console.error('Error updating status:', error);
      toast({
        title: "Error",
        description: "Gagal mengubah status pesanan",
        variant: "destructive",
      });
    }
  };

  const handleAddTracking = async () => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({
          tracking_number: trackingNumber,
          order_status: 'in_transit',
        })
        .eq('id', selectedOrderId);

      if (error) throw error;

      toast({
        title: "Nomor Resi Ditambahkan",
        description: "Status berubah menjadi Dikirim",
      });
      setTrackingNumber("");
      setSelectedOrderId("");
    } catch (error) {
      console.error('Error adding tracking:', error);
      toast({
        title: "Error",
        description: "Gagal menambahkan nomor resi",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Order Management</h2>
        <Badge variant="outline">Total: {orders.length} pesanan</Badge>
      </div>

      <div className="grid gap-4">
        {orders.map((order) => {
          const status = statusConfig[order.order_status as keyof typeof statusConfig];
          const StatusIcon = status.icon;

          return (
            <Card key={order.id} className="p-6">
              <div className="grid md:grid-cols-2 gap-6">
                {/* Order Info */}
                <div className="space-y-3">
                  <div className="flex items-start gap-4">
                    <img
                      src={order.product_image}
                      alt={order.product_name}
                      className="w-20 h-20 object-cover rounded"
                    />
                    <div className="flex-1">
                      <h3 className="font-bold text-lg">{order.product_name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {order.order_number}
                      </p>
                      <p className="text-sm">
                        Size {order.size} • Qty {order.quantity}
                      </p>
                      <p className="font-bold mt-1">{order.product_price}</p>
                    </div>
                  </div>

                  <div className="space-y-1 text-sm">
                    <p><span className="font-medium">Pelanggan:</span> {order.customer_name}</p>
                    <p><span className="font-medium">Email:</span> {order.customer_email}</p>
                    <p><span className="font-medium">Telepon:</span> {order.customer_phone}</p>
                    <p><span className="font-medium">Alamat:</span> {order.shipping_address}</p>
                  </div>

                  {order.return_reason && (
                    <div className="p-3 bg-orange-50 rounded">
                      <p className="text-sm font-medium">Alasan Pengembalian:</p>
                      <p className="text-sm">{order.return_reason}</p>
                    </div>
                  )}

                  {order.cancelled_reason && (
                    <div className="p-3 bg-red-50 rounded">
                      <p className="text-sm font-medium">Alasan Pembatalan:</p>
                      <p className="text-sm">{order.cancelled_reason}</p>
                    </div>
                  )}
                </div>

                {/* Admin Controls */}
                <div className="space-y-4">
                  <div>
                    <Label>Status Pesanan</Label>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge className={status.color}>
                        <StatusIcon className="w-3 h-3 mr-1" />
                        {status.label}
                      </Badge>
                    </div>
                  </div>

                  <div>
                    <Label>Ubah Status</Label>
                    <Select
                      value={order.order_status}
                      onValueChange={(value) => handleStatusChange(order.id, value)}
                    >
                      <SelectTrigger className="mt-2">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending_payment">Belum Bayar</SelectItem>
                        <SelectItem value="processing">Dikemas</SelectItem>
                        <SelectItem value="in_transit">Dikirim</SelectItem>
                        <SelectItem value="completed">Selesai</SelectItem>
                        <SelectItem value="return_requested">Pengembalian</SelectItem>
                        <SelectItem value="cancelled">Dibatalkan</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {order.tracking_number ? (
                    <div>
                      <Label>Nomor Resi</Label>
                      <Input
                        value={order.tracking_number}
                        readOnly
                        className="mt-2"
                      />
                    </div>
                  ) : (
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full"
                          onClick={() => setSelectedOrderId(order.id)}
                        >
                          <Truck className="w-4 h-4 mr-2" />
                          Tambah Nomor Resi
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Tambah Nomor Resi</DialogTitle>
                          <DialogDescription>
                            Status akan otomatis berubah menjadi "Dikirim"
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <Label>Nomor Resi</Label>
                            <Input
                              placeholder="Masukkan nomor resi"
                              value={trackingNumber}
                              onChange={(e) => setTrackingNumber(e.target.value)}
                              className="mt-2"
                            />
                          </div>
                        </div>
                        <DialogFooter>
                          <Button onClick={handleAddTracking} disabled={!trackingNumber.trim()}>
                            Simpan
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  )}

                  <div className="text-xs text-muted-foreground">
                    <p>Dibuat: {new Date(order.created_at).toLocaleString('id-ID')}</p>
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
};