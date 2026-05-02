import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Clock, Package, Truck, CheckCircle, XCircle, TrendingUp, Users, Eye } from "lucide-react";

interface OverviewEnhancementsProps {
  isDark: boolean;
  onNavigateToOrders?: () => void;
}

type Period = "today" | "week" | "month";

interface OrderStatusBreakdown {
  pending: number;
  processing: number;
  shipped: number;
  completed: number;
  cancelled: number;
}

interface LowStockProduct {
  id: string;
  name: string;
  image: string;
  stock: number;
}

export default function OverviewEnhancements({ isDark, onNavigateToOrders }: OverviewEnhancementsProps) {
  const [period, setPeriod] = useState<Period>("month");
  const [revenue, setRevenue] = useState(0);
  const [orderCount, setOrderCount] = useState(0);
  const [statusBreakdown, setStatusBreakdown] = useState<OrderStatusBreakdown>({ pending: 0, processing: 0, shipped: 0, completed: 0, cancelled: 0 });
  const [lowStock, setLowStock] = useState<LowStockProduct[]>([]);
  const [visitorCount, setVisitorCount] = useState(0);
  const [conversionRate, setConversionRate] = useState(0);
  const [revenueHistory, setRevenueHistory] = useState<number[]>([]);

  const cardBg = isDark ? "bg-[#1a1d27] border-[#2a2d37]" : "bg-white border-gray-200";
  const textPrimary = isDark ? "text-white" : "text-gray-900";
  const textSecondary = isDark ? "text-gray-400" : "text-gray-500";

  useEffect(() => {
    fetchData();
  }, [period]);

  const getDateRange = (p: Period) => {
    const now = new Date();
    if (p === "today") {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      return start.toISOString();
    } else if (p === "week") {
      const start = new Date(now);
      start.setDate(start.getDate() - 7);
      return start.toISOString();
    } else {
      const start = new Date(now);
      start.setDate(start.getDate() - 30);
      return start.toISOString();
    }
  };

  const fetchData = async () => {
    const since = getDateRange(period);

    // Revenue & orders in period
    const { data: orders } = await supabase.from("orders").select("total_amount, order_status, created_at").gte("created_at", since);
    const totalRev = orders?.reduce((sum, o: any) => sum + (Number(o.total_amount) || 0), 0) || 0;
    setRevenue(totalRev);
    setOrderCount(orders?.length || 0);

    // Status breakdown (all time)
    const { data: allOrders } = await supabase.from("orders").select("order_status");
    const breakdown: OrderStatusBreakdown = { pending: 0, processing: 0, shipped: 0, completed: 0, cancelled: 0 };
    allOrders?.forEach((o: any) => {
      if (o.order_status === "pending" || o.order_status === "paid") breakdown.pending++;
      else if (o.order_status === "processing" || o.order_status === "packed") breakdown.processing++;
      else if (o.order_status === "shipped" || o.order_status === "delivered") breakdown.shipped++;
      else if (o.order_status === "completed") breakdown.completed++;
      else if (o.order_status === "cancelled") breakdown.cancelled++;
    });
    setStatusBreakdown(breakdown);

    // Low stock products
    const { data: products } = await supabase.from("products").select("id, name, image, stock, stock_s, stock_m, stock_l, stock_xl, stock_xxl");
    const low = (products || []).filter((p: any) => {
      const total = (p.stock_s || 0) + (p.stock_m || 0) + (p.stock_l || 0) + (p.stock_xl || 0) + (p.stock_xxl || 0);
      return total < 10;
    }).map((p: any) => ({
      id: p.id,
      name: p.name,
      image: p.image,
      stock: (p.stock_s || 0) + (p.stock_m || 0) + (p.stock_l || 0) + (p.stock_xl || 0) + (p.stock_xxl || 0),
    }));
    setLowStock(low);

    // Visitors
    const { count: vCount } = await supabase.from("visitor_sessions").select("id", { count: "exact", head: true }).gte("created_at", since);
    setVisitorCount(vCount || 0);

    // Conversion rate
    const totalV = vCount || 1;
    const totalO = orders?.length || 0;
    setConversionRate(Number(((totalO / totalV) * 100).toFixed(1)));

    // Revenue history (last 7 data points)
    const hist: number[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate()).toISOString();
      const dayEnd = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1).toISOString();
      const dayRev = orders?.filter((o: any) => o.created_at >= dayStart && o.created_at < dayEnd).reduce((s, o: any) => s + (Number(o.total_amount) || 0), 0) || 0;
      hist.push(dayRev);
    }
    setRevenueHistory(hist);
  };

  function MiniSparkline({ data, color }: { data: number[]; color: string }) {
    if (!data.length) return null;
    const max = Math.max(...data, 1);
    const min = Math.min(...data);
    const range = max - min || 1;
    const w = 60; const h = 20;
    const points = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - ((v - min) / range) * h}`).join(" ");
    return (
      <svg width={w} height={h}><polyline points={points} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" /></svg>
    );
  }

  const statusItems = [
    { key: "pending", label: "Pending", count: statusBreakdown.pending, icon: Clock, color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" },
    { key: "processing", label: "Processing", count: statusBreakdown.processing, icon: Package, color: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
    { key: "shipped", label: "Shipped", count: statusBreakdown.shipped, icon: Truck, color: "bg-purple-500/20 text-purple-400 border-purple-500/30" },
    { key: "completed", label: "Done", count: statusBreakdown.completed, icon: CheckCircle, color: "bg-green-500/20 text-green-400 border-green-500/30" },
  ];

  return (
    <div className="space-y-4">
      {/* Revenue Toggle */}
      <Card className={`${cardBg} border`}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <TrendingUp className={`h-4 w-4 ${textSecondary}`} />
              <span className={`text-xs font-semibold uppercase tracking-wider ${textSecondary}`}>Revenue</span>
            </div>
            <div className="flex gap-1">
              {(["today", "week", "month"] as Period[]).map(p => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={`px-2.5 py-1 rounded-md text-[10px] font-medium transition-colors ${
                    period === p
                      ? isDark ? "bg-white/15 text-white" : "bg-gray-900 text-white"
                      : isDark ? "text-gray-500 hover:text-gray-300" : "text-gray-400 hover:text-gray-600"
                  }`}
                >
                  {p === "today" ? "Hari Ini" : p === "week" ? "Minggu Ini" : "Bulan Ini"}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-end justify-between">
            <div>
              <div className={`text-2xl font-bold ${textPrimary}`}>
                Rp {revenue >= 1_000_000 ? `${(revenue / 1_000_000).toFixed(1)}Jt` : revenue >= 1_000 ? `${(revenue / 1_000).toFixed(0)}K` : revenue}
              </div>
              <p className={`text-xs ${textSecondary}`}>{orderCount} pesanan</p>
            </div>
            <MiniSparkline data={revenueHistory} color="#00d97e" />
          </div>
        </CardContent>
      </Card>

      {/* Visitor & Conversion */}
      <div className="grid grid-cols-2 gap-3">
        <Card className={`${cardBg} border`}>
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-1">
              <Eye className={`h-3.5 w-3.5 ${textSecondary}`} />
              <span className={`text-[10px] font-semibold uppercase ${textSecondary}`}>Visitors</span>
            </div>
            <div className={`text-xl font-bold ${textPrimary}`}>{visitorCount.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card className={`${cardBg} border`}>
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className={`h-3.5 w-3.5 ${textSecondary}`} />
              <span className={`text-[10px] font-semibold uppercase ${textSecondary}`}>Conversion</span>
            </div>
            <div className={`text-xl font-bold ${textPrimary}`}>{conversionRate}%</div>
          </CardContent>
        </Card>
      </div>

      {/* Order Status Breakdown */}
      <Card className={`${cardBg} border`}>
        <CardContent className="p-4">
          <h3 className={`text-xs font-semibold uppercase tracking-wider mb-3 ${textSecondary}`}>Status Order</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {statusItems.map(s => (
              <button
                key={s.key}
                onClick={onNavigateToOrders}
                className={`flex items-center gap-2 p-2.5 rounded-lg border transition-colors hover:opacity-80 ${s.color}`}
              >
                <s.icon className="h-4 w-4" />
                <div className="text-left">
                  <div className="text-lg font-bold">{s.count}</div>
                  <div className="text-[10px] opacity-80">{s.label}</div>
                </div>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Low Stock Alert */}
      {lowStock.length > 0 && (
        <Card className={`${cardBg} border border-red-500/20`}>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="h-4 w-4 text-red-400" />
              <h3 className={`text-xs font-semibold uppercase tracking-wider text-red-400`}>Low Stock Alert</h3>
              <Badge variant="destructive" className="text-[10px] h-5">{lowStock.length}</Badge>
            </div>
            <div className="space-y-2 max-h-[200px] overflow-y-auto">
              {lowStock.map(p => (
                <div key={p.id} className={`flex items-center gap-3 p-2 rounded-lg ${isDark ? "bg-white/5" : "bg-gray-50"}`}>
                  <img src={p.image} alt={p.name} className="w-8 h-8 rounded object-cover" />
                  <span className={`text-sm flex-1 truncate ${textPrimary}`}>{p.name}</span>
                  <Badge variant="destructive" className="text-[10px]">{p.stock} left</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
