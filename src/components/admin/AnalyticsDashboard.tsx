import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Sun, Moon, Download, TrendingUp, TrendingDown, ShoppingBag, Users, Percent, DollarSign, Activity } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell } from "recharts";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import InteractiveGlobe from "./InteractiveGlobe";

interface AnalyticsData {
  totalVisitors: number;
  activeVisitors: number;
  totalOrders: number;
  totalRevenue: number;
  topCountries: Array<{ country: string; count: number }>;
}

interface AnalyticsDashboardProps {
  analyticsData: AnalyticsData;
  locations: any[];
}

// Animated counter hook
function useAnimatedNumber(target: number, duration = 800) {
  const [current, setCurrent] = useState(0);
  useEffect(() => {
    if (target === 0) { setCurrent(0); return; }
    const start = performance.now();
    const from = current;
    const animate = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCurrent(Math.round(from + (target - from) * eased));
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [target]);
  return current;
}

function MetricCard({ title, value, subtitle, icon, trend, color, isDark }: {
  title: string; value: string; subtitle: string; icon: React.ReactNode;
  trend?: { value: string; positive: boolean }; color: string; isDark: boolean;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={`relative overflow-hidden rounded-2xl border p-5 transition-all duration-300 ${
        hovered ? "shadow-xl -translate-y-1" : "shadow-sm"
      } ${isDark ? "bg-[#141722]/80 border-[#1e2235] backdrop-blur-xl" : "bg-white/80 border-gray-200 backdrop-blur-xl"}`}
    >
      {/* Gradient accent */}
      <div className="absolute top-0 left-0 right-0 h-[2px]" style={{ background: `linear-gradient(90deg, ${color}, transparent)` }} />
      
      <div className="flex items-start justify-between mb-3">
        <span className={`text-xs font-medium uppercase tracking-widest ${isDark ? "text-gray-500" : "text-gray-400"}`}>{title}</span>
        <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${color}15` }}>
          {icon}
        </div>
      </div>
      
      <div className="text-3xl font-bold tracking-tight mb-1" style={{ color: isDark ? "#fff" : "#111" }}>{value}</div>
      
      <div className="flex items-center justify-between">
        <span className={`text-xs ${isDark ? "text-gray-500" : "text-gray-400"}`}>{subtitle}</span>
        {trend && (
          <div className={`flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${
            trend.positive ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"
          }`}>
            {trend.positive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {trend.value}
          </div>
        )}
      </div>
    </div>
  );
}

function RecentOrdersTable({ isDark }: { isDark: boolean }) {
  const [orders, setOrders] = useState<any[]>([]);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase.from("orders").select("id, order_number, customer_name, product_name, total_amount, order_status, created_at").order("created_at", { ascending: false }).limit(10);
      setOrders(data || []);
    };
    fetch();
    const ch = supabase.channel("recent-orders-dash").on("postgres_changes", { event: "INSERT", schema: "public", table: "orders" }, fetch).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const statusColor = (s: string) => {
    if (s === "completed" || s === "delivered") return "bg-emerald-500/10 text-emerald-400";
    if (s === "processing" || s === "shipped") return "bg-blue-500/10 text-blue-400";
    if (s === "cancelled") return "bg-red-500/10 text-red-400";
    return "bg-yellow-500/10 text-yellow-400";
  };

  const timeAgo = (t: string) => {
    const diff = (Date.now() - new Date(t).getTime()) / 1000;
    if (diff < 60) return `${Math.floor(diff)}s`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
    return `${Math.floor(diff / 86400)}d`;
  };

  const bg = isDark ? "bg-[#141722]/80 border-[#1e2235]" : "bg-white/80 border-gray-200";
  const textSec = isDark ? "text-gray-500" : "text-gray-400";

  return (
    <div className={`rounded-2xl border backdrop-blur-xl overflow-hidden ${bg}`}>
      <div className="px-5 py-4 border-b" style={{ borderColor: isDark ? "#1e2235" : "#e5e7eb" }}>
        <h3 className={`text-sm font-semibold uppercase tracking-wider ${textSec}`}>Pesanan Terbaru</h3>
      </div>
      <ScrollArea className="h-[320px]">
        <Table>
          <TableHeader>
            <TableRow className={isDark ? "border-[#1e2235]" : ""}>
              <TableHead className={`text-xs ${textSec}`}>Order</TableHead>
              <TableHead className={`text-xs ${textSec}`}>Customer</TableHead>
              <TableHead className={`text-xs ${textSec}`}>Produk</TableHead>
              <TableHead className={`text-xs text-right ${textSec}`}>Total</TableHead>
              <TableHead className={`text-xs ${textSec}`}>Status</TableHead>
              <TableHead className={`text-xs text-right ${textSec}`}>Waktu</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.map((o) => (
              <TableRow key={o.id} className={`${isDark ? "border-[#1e2235] hover:bg-white/[0.02]" : "hover:bg-gray-50"} transition-colors`}>
                <TableCell className="text-xs font-mono">{o.order_number?.slice(-8) || o.id.slice(0, 8)}</TableCell>
                <TableCell className="text-xs font-medium">{o.customer_name}</TableCell>
                <TableCell className={`text-xs ${textSec} max-w-[120px] truncate`}>{o.product_name}</TableCell>
                <TableCell className="text-xs text-right font-medium">Rp {Number(o.total_amount || 0).toLocaleString()}</TableCell>
                <TableCell><span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${statusColor(o.order_status)}`}>{o.order_status}</span></TableCell>
                <TableCell className={`text-xs text-right ${textSec}`}>{timeAgo(o.created_at)}</TableCell>
              </TableRow>
            ))}
            {orders.length === 0 && (
              <TableRow><TableCell colSpan={6} className={`text-center py-8 text-sm ${textSec}`}>Belum ada pesanan</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </ScrollArea>
    </div>
  );
}

function RevenueChart({ isDark }: { isDark: boolean }) {
  const [data, setData] = useState<any[]>([]);
  const [range, setRange] = useState<"7d" | "30d">("7d");

  useEffect(() => {
    const fetch = async () => {
      const days = range === "7d" ? 7 : 30;
      const now = new Date();
      const buckets: Record<string, { date: string; revenue: number; orders: number }> = {};
      for (let i = days - 1; i >= 0; i--) {
        const d = new Date(now); d.setDate(d.getDate() - i);
        const key = d.toISOString().slice(0, 10);
        buckets[key] = { date: `${d.getDate()}/${d.getMonth() + 1}`, revenue: 0, orders: 0 };
      }
      const since = new Date(now); since.setDate(since.getDate() - days);
      const { data: orders } = await supabase.from("orders").select("total_amount, created_at").gte("created_at", since.toISOString());
      orders?.forEach((o: any) => {
        const key = new Date(o.created_at).toISOString().slice(0, 10);
        if (buckets[key]) { buckets[key].revenue += Number(o.total_amount) || 0; buckets[key].orders++; }
      });
      setData(Object.values(buckets));
    };
    fetch();
  }, [range]);

  const bg = isDark ? "bg-[#141722]/80 border-[#1e2235]" : "bg-white/80 border-gray-200";
  const textSec = isDark ? "text-gray-500" : "text-gray-400";
  const gridColor = isDark ? "#1e2235" : "#e5e7eb";

  return (
    <div className={`rounded-2xl border backdrop-blur-xl p-5 ${bg}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className={`text-sm font-semibold uppercase tracking-wider ${textSec}`}>Revenue Trend</h3>
        <div className="flex gap-1">
          {(["7d", "30d"] as const).map((r) => (
            <button key={r} onClick={() => setRange(r)} className={`px-3 py-1 rounded-lg text-[11px] font-medium transition-colors ${range === r ? (isDark ? "bg-emerald-500/20 text-emerald-400" : "bg-emerald-500/10 text-emerald-600") : (isDark ? "text-gray-500 hover:bg-white/5" : "text-gray-400 hover:bg-gray-100")}`}>
              {r === "7d" ? "7 Hari" : "30 Hari"}
            </button>
          ))}
        </div>
      </div>
      <div className="h-[240px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
            <defs>
              <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10b981" stopOpacity={0.3} />
                <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
            <XAxis dataKey="date" tick={{ fontSize: 10, fill: isDark ? "#4b5563" : "#9ca3af" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: isDark ? "#4b5563" : "#9ca3af" }} axisLine={false} tickLine={false} tickFormatter={(v) => v >= 1e6 ? `${(v / 1e6).toFixed(0)}Jt` : v >= 1e3 ? `${(v / 1e3).toFixed(0)}K` : `${v}`} width={45} />
            <Tooltip contentStyle={{ backgroundColor: isDark ? "#141722" : "#fff", border: `1px solid ${isDark ? "#1e2235" : "#e5e7eb"}`, borderRadius: "12px", fontSize: "12px", color: isDark ? "#fff" : "#111" }} formatter={(v: number) => [`Rp ${v.toLocaleString()}`, "Revenue"]} />
            <Area type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={2} fill="url(#revenueGrad)" dot={false} activeDot={{ r: 4, fill: "#10b981" }} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function OrderStatusChart({ isDark }: { isDark: boolean }) {
  const [data, setData] = useState<any[]>([]);

  useEffect(() => {
    const fetch = async () => {
      const { data: orders } = await supabase.from("orders").select("order_status");
      const counts: Record<string, number> = {};
      orders?.forEach((o: any) => { counts[o.order_status] = (counts[o.order_status] || 0) + 1; });
      const COLORS_MAP: Record<string, string> = { pending: "#f59e0b", processing: "#3b82f6", shipped: "#8b5cf6", delivered: "#10b981", completed: "#10b981", cancelled: "#ef4444" };
      setData(Object.entries(counts).map(([name, value]) => ({ name, value, color: COLORS_MAP[name] || "#6b7280" })));
    };
    fetch();
  }, []);

  const bg = isDark ? "bg-[#141722]/80 border-[#1e2235]" : "bg-white/80 border-gray-200";
  const textSec = isDark ? "text-gray-500" : "text-gray-400";

  return (
    <div className={`rounded-2xl border backdrop-blur-xl p-5 ${bg}`}>
      <h3 className={`text-sm font-semibold uppercase tracking-wider mb-4 ${textSec}`}>Status Pesanan</h3>
      <div className="h-[200px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={3} dataKey="value" stroke="none">
              {data.map((d, i) => <Cell key={i} fill={d.color} />)}
            </Pie>
            <Tooltip contentStyle={{ backgroundColor: isDark ? "#141722" : "#fff", border: `1px solid ${isDark ? "#1e2235" : "#e5e7eb"}`, borderRadius: "12px", fontSize: "12px", color: isDark ? "#fff" : "#111" }} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="flex flex-wrap gap-3 mt-2 justify-center">
        {data.map((d, i) => (
          <div key={i} className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: d.color }} />
            <span className={`text-[10px] capitalize ${textSec}`}>{d.name} ({d.value})</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function LiveFeed({ isDark }: { isDark: boolean }) {
  const [feed, setFeed] = useState<any[]>([]);

  useEffect(() => {
    const fetchFeed = async () => {
      const [{ data: visitors }, { data: orders }] = await Promise.all([
        supabase.from("visitor_sessions").select("id, session_id, user_id, country_name, city, created_at, page_path").order("created_at", { ascending: false }).limit(10),
        supabase.from("orders").select("id, customer_name, city, created_at, total_amount").order("created_at", { ascending: false }).limit(5),
      ]);
      const items: any[] = [];
      visitors?.forEach((v) => items.push({ id: `v-${v.id}`, name: `Tamu ${v.session_id?.slice(-4)}`, action: v.page_path || "/", location: v.city || v.country_name || "—", time: v.created_at, type: "visit" }));
      orders?.forEach((o: any) => items.push({ id: `o-${o.id}`, name: o.customer_name, action: `Rp ${Number(o.total_amount || 0).toLocaleString()}`, location: o.city || "—", time: o.created_at, type: "order" }));
      items.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
      setFeed(items.slice(0, 12));
    };
    fetchFeed();
    const ch = supabase.channel("live-dash-feed").on("postgres_changes", { event: "INSERT", schema: "public", table: "visitor_sessions" }, fetchFeed).on("postgres_changes", { event: "INSERT", schema: "public", table: "orders" }, fetchFeed).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const bg = isDark ? "bg-[#141722]/80 border-[#1e2235]" : "bg-white/80 border-gray-200";
  const textSec = isDark ? "text-gray-500" : "text-gray-400";

  const timeAgo = (t: string) => {
    const diff = (Date.now() - new Date(t).getTime()) / 1000;
    if (diff < 60) return `${Math.floor(diff)}s`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m`;
    return `${Math.floor(diff / 3600)}h`;
  };

  return (
    <div className={`rounded-2xl border backdrop-blur-xl overflow-hidden ${bg}`}>
      <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: isDark ? "#1e2235" : "#e5e7eb" }}>
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-emerald-400" />
          <h3 className={`text-sm font-semibold uppercase tracking-wider ${textSec}`}>Live Feed</h3>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className={`text-[10px] ${textSec}`}>Real-time</span>
        </div>
      </div>
      <ScrollArea className="h-[280px]">
        <div className="divide-y" style={{ borderColor: isDark ? "#1e2235" : "#e5e7eb" }}>
          {feed.map((item) => (
            <div key={item.id} className={`px-4 py-3 flex items-center gap-3 ${isDark ? "hover:bg-white/[0.02]" : "hover:bg-gray-50"} transition-colors`}>
              <div className={`w-7 h-7 rounded-full flex items-center justify-center ${item.type === "order" ? "bg-emerald-500/10" : "bg-blue-500/10"}`}>
                {item.type === "order" ? <ShoppingBag className="h-3 w-3 text-emerald-400" /> : <Users className="h-3 w-3 text-blue-400" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className={`text-xs font-medium truncate ${isDark ? "text-white" : "text-gray-900"}`}>{item.name}</div>
                <div className={`text-[10px] truncate ${textSec}`}>{item.action}</div>
              </div>
              <div className="text-right shrink-0">
                <div className={`text-[10px] ${textSec}`}>{item.location}</div>
                <div className={`text-[10px] ${textSec}`}>{timeAgo(item.time)} ago</div>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}

export default function AnalyticsDashboard({ analyticsData, locations }: AnalyticsDashboardProps) {
  const [isDark, setIsDark] = useState(true);

  const animatedRevenue = useAnimatedNumber(analyticsData.totalRevenue);
  const animatedOrders = useAnimatedNumber(analyticsData.totalOrders);
  const animatedVisitors = useAnimatedNumber(analyticsData.activeVisitors);

  const conversionRate = analyticsData.totalVisitors > 0
    ? ((analyticsData.totalOrders / analyticsData.totalVisitors) * 100).toFixed(1)
    : "0.0";

  const formatRp = (v: number) => {
    if (v >= 1e9) return `Rp ${(v / 1e9).toFixed(1)}M`;
    if (v >= 1e6) return `Rp ${(v / 1e6).toFixed(1)}Jt`;
    if (v >= 1e3) return `Rp ${(v / 1e3).toFixed(0)}K`;
    return `Rp ${v}`;
  };

  const bgMain = isDark
    ? "bg-gradient-to-b from-[#0a0d14] via-[#0d1117] to-[#0a0d14]"
    : "bg-gradient-to-b from-[#f8f9fb] via-[#f0f2f5] to-[#f8f9fb]";

  return (
    <div className={`rounded-2xl p-4 md:p-8 space-y-8 transition-colors duration-500 overflow-hidden max-w-full ${bgMain}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h2 className={`text-2xl font-bold tracking-tight ${isDark ? "text-white" : "text-gray-900"}`}>Analytics Dashboard</h2>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[10px] font-semibold text-emerald-400 uppercase tracking-wider">Live</span>
            </div>
          </div>
          <p className={`text-xs ${isDark ? "text-gray-500" : "text-gray-400"}`}>Real-time tracking pengunjung & pesanan</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsDark(!isDark)}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-medium transition-all border ${
              isDark ? "bg-white/5 border-white/10 text-gray-400 hover:bg-white/10" : "bg-gray-100 border-gray-200 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {isDark ? <><Sun className="h-3.5 w-3.5" /> Light</> : <><Moon className="h-3.5 w-3.5" /> Dark</>}
          </button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Total Revenue"
          value={formatRp(animatedRevenue)}
          subtitle="All time"
          icon={<DollarSign className="h-4 w-4 text-emerald-400" />}
          trend={{ value: "+12.5%", positive: true }}
          color="#10b981"
          isDark={isDark}
        />
        <MetricCard
          title="Total Orders"
          value={animatedOrders.toLocaleString()}
          subtitle="All time"
          icon={<ShoppingBag className="h-4 w-4 text-blue-400" />}
          trend={{ value: "+8.2%", positive: true }}
          color="#3b82f6"
          isDark={isDark}
        />
        <MetricCard
          title="Active Users"
          value={animatedVisitors.toLocaleString()}
          subtitle={`${analyticsData.totalVisitors.toLocaleString()} total`}
          icon={<Users className="h-4 w-4 text-violet-400" />}
          trend={{ value: "+15%", positive: true }}
          color="#8b5cf6"
          isDark={isDark}
        />
        <MetricCard
          title="Conversion Rate"
          value={`${conversionRate}%`}
          subtitle="Visitors → Buyers"
          icon={<Percent className="h-4 w-4 text-amber-400" />}
          trend={Number(conversionRate) > 2 ? { value: "+3.1%", positive: true } : { value: "-0.5%", positive: false }}
          color="#f59e0b"
          isDark={isDark}
        />
      </div>

      {/* Globe Section - Centered */}
      <div className="relative">
        <div className={`rounded-2xl border overflow-hidden ${isDark ? "bg-[#080b11] border-[#1a2332]" : "bg-[#0d1117] border-gray-700"}`}>
          {/* Globe header */}
          <div className="px-6 py-4 flex items-center justify-between" style={{ borderBottom: "1px solid rgba(16, 185, 129, 0.1)" }}>
            <div>
              <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Global Customer Map</h3>
              <p className="text-[10px] text-gray-600 mt-0.5">{locations.length} lokasi aktif</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-emerald-400" />
                <span className="text-[10px] text-gray-500">Orders</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-cyan-400" />
                <span className="text-[10px] text-gray-500">Visitors</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[10px] text-gray-500">Live</span>
              </div>
            </div>
          </div>

          {/* Globe - always dark for best effect */}
          <InteractiveGlobe locations={locations} isDark={true} />

          {/* Bottom stats overlay */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-px" style={{ borderTop: "1px solid rgba(16, 185, 129, 0.1)" }}>
            {analyticsData.topCountries.slice(0, 4).map((c, i) => (
              <div key={i} className="px-4 py-3 bg-[#0d1117]/50">
                <div className="text-xs text-gray-500">{c.country}</div>
                <div className="text-sm font-bold text-white">{c.count} <span className="text-[10px] text-gray-600 font-normal">visits</span></div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <RevenueChart isDark={isDark} />
        </div>
        <OrderStatusChart isDark={isDark} />
      </div>

      {/* Recent Orders + Live Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div className="lg:col-span-3">
          <RecentOrdersTable isDark={isDark} />
        </div>
        <div className="lg:col-span-2">
          <LiveFeed isDark={isDark} />
        </div>
      </div>
    </div>
  );
}
