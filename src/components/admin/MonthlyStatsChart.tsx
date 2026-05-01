import { useEffect, useState } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { supabase } from "@/integrations/supabase/client";

interface MonthlyStatsChartProps {
  isDark: boolean;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

interface MonthData { name: string; sales: number; orders: number; }

function formatRp(v: number) {
  if (v >= 1_000_000_000) return `Rp ${(v / 1_000_000_000).toFixed(1)}M`;
  if (v >= 1_000_000) return `Rp ${(v / 1_000_000).toFixed(1)}Jt`;
  if (v >= 1_000) return `Rp ${(v / 1_000).toFixed(0)}K`;
  return `Rp ${v.toFixed(0)}`;
}

export default function MonthlyStatsChart({ isDark }: MonthlyStatsChartProps) {
  const [data, setData] = useState<MonthData[]>(MONTHS.map((m) => ({ name: m, sales: 0, orders: 0 })));

  const fetchMonthly = async () => {
    const year = new Date().getFullYear();
    const start = `${year}-01-01`;
    const end = `${year + 1}-01-01`;

    const { data: orders, error } = await supabase
      .from("orders")
      .select("total_amount, created_at")
      .gte("created_at", start)
      .lt("created_at", end);
    if (error) { console.error(error); return; }

    const buckets: MonthData[] = MONTHS.map((m) => ({ name: m, sales: 0, orders: 0 }));
    orders?.forEach((o: any) => {
      const d = new Date(o.created_at);
      const idx = d.getMonth();
      buckets[idx].sales += Number(o.total_amount) || 0;
      buckets[idx].orders += 1;
    });
    setData(buckets);
  };

  useEffect(() => {
    fetchMonthly();
    const ch = supabase
      .channel("monthly-stats-orders")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => fetchMonthly())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const cardBg = isDark ? "bg-[#1a1d27] border-[#2a2d37]" : "bg-white border-gray-200";
  const textSecondary = isDark ? "text-gray-400" : "text-gray-500";
  const gridColor = isDark ? "#2a2d37" : "#e5e7eb";
  const textColor = isDark ? "#9ca3af" : "#6b7280";

  const maxSales = Math.max(...data.map((d) => d.sales), 1);
  // Pad axis 20% so line never clips
  const yMax = Math.ceil((maxSales * 1.2) / 1000) * 1000 || 1000;

  return (
    <div className={`rounded-xl border p-4 md:p-5 ${cardBg} overflow-hidden`}>
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <h3 className={`text-sm font-semibold uppercase tracking-wider ${textSecondary}`}>Monthly Stats</h3>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm bg-[#00d97e]" />
            <span className={`text-[11px] ${textSecondary}`}>Sales</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm bg-[#007bff]" />
            <span className={`text-[11px] ${textSecondary}`}>Orders</span>
          </div>
        </div>
      </div>
      <div className="w-full h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
            <XAxis dataKey="name" tick={{ fontSize: 10, fill: textColor }} axisLine={{ stroke: gridColor }} tickLine={false} />
            <YAxis
              yAxisId="left"
              domain={[0, yMax]}
              tick={{ fontSize: 10, fill: textColor }}
              axisLine={{ stroke: gridColor }}
              tickLine={false}
              tickFormatter={(v) => formatRp(v)}
              width={60}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              tick={{ fontSize: 10, fill: textColor }}
              axisLine={{ stroke: gridColor }}
              tickLine={false}
              width={30}
              allowDecimals={false}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: isDark ? "#1a1d27" : "#fff",
                border: `1px solid ${isDark ? "#2a2d37" : "#e5e7eb"}`,
                borderRadius: "8px",
                color: isDark ? "#fff" : "#111",
                fontSize: "12px",
              }}
              formatter={(value: number, name: string) =>
                name === "sales" ? [formatRp(value), "Sales"] : [value, "Orders"]
              }
            />
            <Line yAxisId="left" type="monotone" dataKey="sales" stroke="#00d97e" strokeWidth={2} dot={{ r: 3, fill: "#00d97e" }} activeDot={{ r: 5 }} />
            <Line yAxisId="right" type="monotone" dataKey="orders" stroke="#007bff" strokeWidth={2} dot={{ r: 3, fill: "#007bff" }} activeDot={{ r: 5 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
