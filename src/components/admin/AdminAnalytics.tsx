import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { Download, TrendingUp, ShoppingBag, BarChart3, Users } from "lucide-react";
import { toast } from "sonner";
import html2canvas from "html2canvas";

type Period = "7d" | "30d" | "90d";
type ChartMode = "daily" | "monthly";

const COLORS = ["#007bff", "#00d97e", "#ffaa00", "#ff3d71", "#7c3aed", "#06b6d4"];

export default function AdminAnalytics() {
  const [orders, setOrders] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [visitors, setVisitors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [chartMode, setChartMode] = useState<ChartMode>("daily");
  const [topPeriod, setTopPeriod] = useState<Period>("30d");
  const chartRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    const [o, p, pr, v] = await Promise.all([
      supabase.from("orders").select("*").order("created_at", { ascending: false }),
      supabase.from("products").select("*"),
      supabase.from("profiles").select("*"),
      supabase.from("visitor_sessions").select("city, country_name, created_at"),
    ]);
    setOrders(o.data || []);
    setProducts(p.data || []);
    setProfiles(pr.data || []);
    setVisitors(v.data || []);
    setLoading(false);
  };

  // Sales chart data
  const salesData = (() => {
    if (chartMode === "daily") {
      const days: Record<string, { date: string; revenue: number; orders: number }> = {};
      const now = new Date();
      for (let i = 29; i >= 0; i--) {
        const d = new Date(now); d.setDate(d.getDate() - i);
        const key = d.toISOString().slice(0, 10);
        days[key] = { date: `${d.getDate()}/${d.getMonth() + 1}`, revenue: 0, orders: 0 };
      }
      orders.forEach((o: any) => {
        const key = new Date(o.created_at).toISOString().slice(0, 10);
        if (days[key]) { days[key].revenue += Number(o.total_amount) || 0; days[key].orders++; }
      });
      return Object.values(days);
    } else {
      const months: Record<number, { date: string; revenue: number; orders: number }> = {};
      for (let i = 0; i < 12; i++) months[i] = { date: ["Jan","Feb","Mar","Apr","Mei","Jun","Jul","Agu","Sep","Okt","Nov","Des"][i], revenue: 0, orders: 0 };
      orders.forEach((o: any) => {
        const m = new Date(o.created_at).getMonth();
        months[m].revenue += Number(o.total_amount) || 0;
        months[m].orders++;
      });
      return Object.values(months);
    }
  })();

  // Top products
  const topProducts = (() => {
    const daysAgo = topPeriod === "7d" ? 7 : topPeriod === "30d" ? 30 : 90;
    const since = new Date(); since.setDate(since.getDate() - daysAgo);
    const counts: Record<string, { name: string; qty: number; revenue: number }> = {};
    orders.filter((o: any) => new Date(o.created_at) >= since).forEach((o: any) => {
      const key = o.product_name || o.product_id;
      if (!counts[key]) counts[key] = { name: key, qty: 0, revenue: 0 };
      counts[key].qty += o.quantity || 1;
      counts[key].revenue += Number(o.total_amount) || 0;
    });
    return Object.values(counts).sort((a, b) => b.revenue - a.revenue).slice(0, 10);
  })();

  // Demographics - location
  const locationData = (() => {
    const cities: Record<string, number> = {};
    visitors.forEach((v: any) => {
      const city = v.city || v.country_name || "Unknown";
      cities[city] = (cities[city] || 0) + 1;
    });
    return Object.entries(cities).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count).slice(0, 8);
  })();

  // Return rate
  const returnRate = (() => {
    const total = orders.length || 1;
    const returns = orders.filter((o: any) => o.order_status === "return_requested").length;
    return ((returns / total) * 100).toFixed(1);
  })();

  const exportCSV = (data: any[], filename: string) => {
    if (!data.length) return;
    const keys = Object.keys(data[0]);
    const csv = [keys.join(","), ...data.map(row => keys.map(k => row[k]).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `${filename}.csv`; a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV berhasil diexport");
  };

  const exportPNG = async () => {
    if (!chartRef.current) return;
    try {
      const canvas = await html2canvas(chartRef.current);
      const url = canvas.toDataURL("image/png");
      const a = document.createElement("a"); a.href = url; a.download = "analytics-chart.png"; a.click();
      toast.success("Chart berhasil diexport sebagai PNG");
    } catch { toast.error("Gagal export chart"); }
  };

  const formatRp = (v: number) => v >= 1e6 ? `Rp ${(v / 1e6).toFixed(1)}Jt` : v >= 1e3 ? `Rp ${(v / 1e3).toFixed(0)}K` : `Rp ${v}`;

  if (loading) return <div className="space-y-4">{[1,2,3].map(i => <Skeleton key={i} className="h-[200px] w-full" />)}</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Analytics & Reports</h2>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={exportPNG}><Download className="h-4 w-4 mr-2" />Export PNG</Button>
          <Button variant="outline" size="sm" onClick={() => exportCSV(salesData, "sales-data")}><Download className="h-4 w-4 mr-2" />Export CSV</Button>
        </div>
      </div>

      {/* Sales Chart */}
      <Card>
        <CardContent className="p-4" ref={chartRef}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold">Grafik Penjualan</h3>
            </div>
            <div className="flex gap-1">
              {(["daily", "monthly"] as ChartMode[]).map(m => (
                <button key={m} onClick={() => setChartMode(m)} className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${chartMode === m ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}>
                  {m === "daily" ? "Harian" : "Bulanan"}
                </button>
              ))}
            </div>
          </div>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={salesData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} className="text-muted-foreground" />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={formatRp} width={65} />
                <Tooltip formatter={(v: number, n: string) => [n === "revenue" ? formatRp(v) : v, n === "revenue" ? "Revenue" : "Orders"]} />
                <Line type="monotone" dataKey="revenue" stroke="#00d97e" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="orders" stroke="#007bff" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Top Products & Return Rate */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <ShoppingBag className="h-4 w-4 text-muted-foreground" />
                <h3 className="text-sm font-semibold">Produk Terlaris</h3>
              </div>
              <Select value={topPeriod} onValueChange={(v: Period) => setTopPeriod(v)}>
                <SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="7d">7 Hari</SelectItem>
                  <SelectItem value="30d">30 Hari</SelectItem>
                  <SelectItem value="90d">3 Bulan</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Produk</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Revenue</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topProducts.length === 0 ? (
                  <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">Tidak ada data</TableCell></TableRow>
                ) : topProducts.map((p, i) => (
                  <TableRow key={i}>
                    <TableCell><Badge variant="outline">{i + 1}</Badge></TableCell>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell className="text-right">{p.qty}</TableCell>
                    <TableCell className="text-right">{formatRp(p.revenue)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <Button variant="ghost" size="sm" className="mt-2" onClick={() => exportCSV(topProducts, "top-products")}>Export CSV</Button>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <h3 className="text-sm font-semibold mb-4">Return Rate</h3>
            <div className="flex flex-col items-center justify-center py-8">
              <div className="relative w-24 h-24">
                <svg className="w-24 h-24 -rotate-90" viewBox="0 0 96 96">
                  <circle cx="48" cy="48" r="40" fill="none" className="stroke-muted" strokeWidth="6" />
                  <circle cx="48" cy="48" r="40" fill="none" stroke="#ff3d71" strokeWidth="6" strokeDasharray={`${(Number(returnRate) / 100) * 251.3} 251.3`} strokeLinecap="round" />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-xl font-bold">{returnRate}%</span>
              </div>
              <p className="text-xs text-muted-foreground mt-3">Tingkat pengembalian produk</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Demographics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-4">
              <Users className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold">Distribusi Lokasi Pelanggan</h3>
            </div>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={locationData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis type="number" tick={{ fontSize: 10 }} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={80} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#007bff" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <Button variant="ghost" size="sm" className="mt-2" onClick={() => exportCSV(locationData, "location-data")}>Export CSV</Button>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold">Distribusi Usia Pelanggan</h3>
            </div>
            <div className="h-[250px]">
              {(() => {
                const ageBuckets: Record<string, number> = { "< 18": 0, "18-24": 0, "25-34": 0, "35-44": 0, "45-54": 0, "55+": 0 };
                profiles.forEach((p: any) => {
                  if (!p.birthday) return;
                  const age = Math.floor((Date.now() - new Date(p.birthday).getTime()) / (365.25 * 24 * 60 * 60 * 1000));
                  if (age < 18) ageBuckets["< 18"]++;
                  else if (age <= 24) ageBuckets["18-24"]++;
                  else if (age <= 34) ageBuckets["25-34"]++;
                  else if (age <= 44) ageBuckets["35-44"]++;
                  else if (age <= 54) ageBuckets["45-54"]++;
                  else ageBuckets["55+"]++;
                });
                const ageData = Object.entries(ageBuckets).map(([range, count]) => ({ range, count }));
                return (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={ageData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="range" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                      <Tooltip />
                      <Bar dataKey="count" fill="#00d97e" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                );
              })()}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
