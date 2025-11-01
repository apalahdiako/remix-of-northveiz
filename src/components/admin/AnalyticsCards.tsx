import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, ShoppingCart, Globe, TrendingUp } from "lucide-react";

interface AnalyticsData {
  totalVisitors: number;
  activeVisitors: number;
  totalOrders: number;
  totalRevenue: number;
  topCountries: Array<{ country: string; count: number }>;
}

export default function AnalyticsCards({ data }: { data: AnalyticsData }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Pengunjung Aktif</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{data.activeVisitors}</div>
          <p className="text-xs text-muted-foreground">
            Total: {data.totalVisitors} pengunjung
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Pesanan</CardTitle>
          <ShoppingCart className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{data.totalOrders}</div>
          <p className="text-xs text-muted-foreground">
            Semua waktu
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Pendapatan</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            Rp {data.totalRevenue.toLocaleString()}
          </div>
          <p className="text-xs text-muted-foreground">
            Dari semua pesanan
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Negara Teratas</CardTitle>
          <Globe className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="space-y-1">
            {data.topCountries.slice(0, 3).map((country, index) => (
              <div key={index} className="flex justify-between text-sm">
                <span className="text-muted-foreground">{country.country}</span>
                <span className="font-medium">{country.count}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
