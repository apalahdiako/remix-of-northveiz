import { Card, CardContent } from "@/components/ui/card";
import { Users, ShoppingCart, TrendingUp, Globe } from "lucide-react";

interface AnalyticsData {
  totalVisitors: number;
  activeVisitors: number;
  totalOrders: number;
  totalRevenue: number;
  topCountries: Array<{ country: string; count: number }>;
}

interface KPICardProps {
  title: string;
  value: string;
  subtitle: string;
  icon: React.ReactNode;
  sparkData: number[];
  badge?: { value: string; positive: boolean };
  isDark: boolean;
}

function MiniSparkline({ data, color }: { data: number[]; color: string }) {
  if (!data.length) return null;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const w = 80;
  const h = 24;
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - ((v - min) / range) * h;
    return `${x},${y}`;
  }).join(" ");

  return (
    <svg width={w} height={h} className="shrink-0">
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {data.map((v, i) => {
        const x = (i / (data.length - 1)) * w;
        const y = h - ((v - min) / range) * h;
        return <circle key={i} cx={x} cy={y} r="2" fill={color} />;
      })}
    </svg>
  );
}

function KPICard({ title, value, subtitle, icon, sparkData, badge, isDark }: KPICardProps) {
  const cardBg = isDark ? "bg-[#1a1d27] border-[#2a2d37]" : "bg-white border-gray-200";
  const textPrimary = isDark ? "text-white" : "text-gray-900";
  const textSecondary = isDark ? "text-gray-400" : "text-gray-500";

  return (
    <Card className={`${cardBg} border shadow-sm`}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <span className={`text-xs font-medium uppercase tracking-wider ${textSecondary}`}>{title}</span>
          <div className={`p-1.5 rounded-lg ${isDark ? "bg-white/5" : "bg-gray-100"}`}>
            {icon}
          </div>
        </div>
        <div className="flex items-end justify-between">
          <div>
            <div className={`text-2xl font-bold ${textPrimary}`}>{value}</div>
            <p className={`text-xs mt-1 ${textSecondary}`}>{subtitle}</p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <MiniSparkline data={sparkData} color={badge?.positive ? "#00d97e" : "#ff3d71"} />
            {badge && (
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                badge.positive 
                  ? "bg-green-500/20 text-green-400" 
                  : "bg-red-500/20 text-red-400"
              }`}>
                {badge.value}
              </span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function AnalyticsCards({ data, isDark = true }: { data: AnalyticsData; isDark?: boolean }) {
  const iconColor = isDark ? "text-gray-400" : "text-gray-500";
  
  // Generate mock sparkline data based on actual values
  const genSparkline = (base: number) => {
    const points: number[] = [];
    for (let i = 0; i < 7; i++) {
      points.push(Math.max(0, base * (0.6 + Math.random() * 0.8)));
    }
    points.push(base);
    return points;
  };

  const topCountry = data.topCountries[0]?.country || "—";

  return (
    <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
      <KPICard
        title="Pengunjung Aktif"
        value={data.activeVisitors.toLocaleString()}
        subtitle={`Total: ${data.totalVisitors.toLocaleString()}`}
        icon={<Users className={`h-4 w-4 ${iconColor}`} />}
        sparkData={genSparkline(data.activeVisitors)}
        badge={{ value: "+10%", positive: true }}
        isDark={isDark}
      />
      <KPICard
        title="Total Pesanan"
        value={data.totalOrders.toLocaleString()}
        subtitle="Semua waktu"
        icon={<ShoppingCart className={`h-4 w-4 ${iconColor}`} />}
        sparkData={genSparkline(data.totalOrders)}
        badge={{ value: "-7%", positive: false }}
        isDark={isDark}
      />
      <KPICard
        title="Pendapatan"
        value={`Rp ${(data.totalRevenue / 1000).toFixed(0)}K`}
        subtitle="Total revenue"
        icon={<TrendingUp className={`h-4 w-4 ${iconColor}`} />}
        sparkData={genSparkline(data.totalRevenue)}
        badge={{ value: "+33%", positive: true }}
        isDark={isDark}
      />
      <KPICard
        title="Negara Teratas"
        value={topCountry}
        subtitle={`${data.topCountries.length} negara aktif`}
        icon={<Globe className={`h-4 w-4 ${iconColor}`} />}
        sparkData={genSparkline(data.topCountries.length * 10)}
        badge={{ value: "-12%", positive: false }}
        isDark={isDark}
      />
    </div>
  );
}
