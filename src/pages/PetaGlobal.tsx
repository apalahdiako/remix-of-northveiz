import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAdmin } from "@/hooks/useAdmin";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import InteractiveGlobe from "@/components/admin/InteractiveGlobe";

interface LocationData {
  country_code: string;
  country_name: string;
  latitude: number;
  longitude: number;
  visitor_count: number;
  order_count: number;
  total_sales: number;
}

export default function PetaGlobal() {
  const navigate = useNavigate();
  const { isAdmin, loading: adminLoading } = useAdmin();
  const [locations, setLocations] = useState<LocationData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!adminLoading && !isAdmin) {
      toast.error("Akses ditolak");
      navigate("/");
    }
  }, [isAdmin, adminLoading, navigate]);

  useEffect(() => {
    if (isAdmin) {
      fetchData();
      const ch = supabase.channel("globe-realtime")
        .on("postgres_changes", { event: "*", schema: "public", table: "visitor_sessions" }, () => fetchData())
        .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => fetchData())
        .subscribe();
      return () => { supabase.removeChannel(ch); };
    }
  }, [isAdmin]);

  const fetchData = async () => {
    const [visitorRes, ordersRes] = await Promise.all([
      supabase.from("visitor_sessions").select("country_code, country_name, city, latitude, longitude, is_active"),
      supabase.from("orders").select("total_amount, country_code, city, latitude, longitude"),
    ]);

    const locationMap = new Map<string, LocationData>();

    (visitorRes.data || []).forEach((s: any) => {
      if (s.latitude == null || s.longitude == null) return;
      const key = s.country_code || s.city || `${s.latitude},${s.longitude}`;
      if (!locationMap.has(key)) {
        locationMap.set(key, { country_code: s.country_code || "XX", country_name: s.country_name || s.city || "Unknown", latitude: Number(s.latitude), longitude: Number(s.longitude), visitor_count: 0, order_count: 0, total_sales: 0 });
      }
      locationMap.get(key)!.visitor_count++;
    });

    (ordersRes.data || []).forEach((o: any) => {
      if (o.latitude == null || o.longitude == null) return;
      const key = o.country_code || o.city || `${o.latitude},${o.longitude}`;
      if (!locationMap.has(key)) {
        locationMap.set(key, { country_code: o.country_code || "XX", country_name: o.city || "Unknown", latitude: Number(o.latitude), longitude: Number(o.longitude), visitor_count: 0, order_count: 0, total_sales: 0 });
      }
      const loc = locationMap.get(key)!;
      loc.order_count++;
      loc.total_sales += Number(o.total_amount) || 0;
    });

    setLocations(Array.from(locationMap.values()).sort((a, b) => (b.visitor_count + b.order_count) - (a.visitor_count + a.order_count)));
    setLoading(false);
  };

  const totalVisitors = locations.reduce((s, l) => s + l.visitor_count, 0);
  const totalOrders = locations.reduce((s, l) => s + l.order_count, 0);
  const totalRevenue = locations.reduce((s, l) => s + l.total_sales, 0);
  const formatRp = (v: number) => v >= 1e6 ? `Rp ${(v / 1e6).toFixed(1)}Jt` : v >= 1e3 ? `Rp ${(v / 1e3).toFixed(0)}K` : `Rp ${v}`;

  if (adminLoading || loading) return <div className="flex items-center justify-center min-h-screen pt-16"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  if (!isAdmin) return null;

  return (
    <div className="container mx-auto px-4 py-8 pt-24 max-w-7xl">
      <Button variant="ghost" onClick={() => navigate("/admin")} className="mb-6"><ArrowLeft className="mr-2 h-4 w-4" />Kembali ke Dashboard</Button>
      <h1 className="text-3xl font-bold mb-2">Peta Global</h1>
      <p className="text-muted-foreground text-sm mb-6">Real-time tracking pengunjung dan pesanan dari seluruh dunia</p>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <Card><CardContent className="p-4 text-center"><div className="text-2xl font-bold">{totalVisitors}</div><p className="text-xs text-muted-foreground">Pengunjung</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><div className="text-2xl font-bold">{totalOrders}</div><p className="text-xs text-muted-foreground">Pesanan</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><div className="text-2xl font-bold">{formatRp(totalRevenue)}</div><p className="text-xs text-muted-foreground">Revenue</p></CardContent></Card>
      </div>

      {/* Globe */}
      <Card className="mb-6">
        <CardContent className="p-0">
          <InteractiveGlobe locations={locations} isDark={true} />
        </CardContent>
      </Card>

      {/* Country Table */}
      <Card>
        <CardContent className="p-4">
          <h3 className="text-sm font-semibold mb-4">Detail per Negara/Lokasi</h3>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Negara/Lokasi</TableHead>
                <TableHead className="text-right">Pengunjung</TableHead>
                <TableHead className="text-right">Pesanan</TableHead>
                <TableHead className="text-right">Revenue</TableHead>
                <TableHead className="text-right">%</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {locations.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Belum ada data lokasi</TableCell></TableRow>
              ) : locations.map((loc, i) => {
                const pct = totalVisitors > 0 ? ((loc.visitor_count / totalVisitors) * 100).toFixed(1) : "0";
                return (
                  <TableRow key={i}>
                    <TableCell className="font-medium">{loc.country_name} <span className="text-xs text-muted-foreground">({loc.country_code})</span></TableCell>
                    <TableCell className="text-right">{loc.visitor_count}</TableCell>
                    <TableCell className="text-right">{loc.order_count}</TableCell>
                    <TableCell className="text-right">{formatRp(loc.total_sales)}</TableCell>
                    <TableCell className="text-right"><Badge variant="outline" className="text-[10px]">{pct}%</Badge></TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
