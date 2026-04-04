import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

interface MonthlyStatsChartProps {
  isDark: boolean;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function generateData() {
  return MONTHS.map((m) => ({
    name: m,
    sales: Math.floor(100000 + Math.random() * 200000),
    profit: Math.floor(50000 + Math.random() * 150000),
  }));
}

const data = generateData();

export default function MonthlyStatsChart({ isDark }: MonthlyStatsChartProps) {
  const cardBg = isDark ? "bg-[#1a1d27] border-[#2a2d37]" : "bg-white border-gray-200";
  const textSecondary = isDark ? "text-gray-400" : "text-gray-500";
  const gridColor = isDark ? "#2a2d37" : "#e5e7eb";
  const textColor = isDark ? "#9ca3af" : "#6b7280";

  return (
    <div className={`rounded-xl border p-5 ${cardBg}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className={`text-sm font-semibold uppercase tracking-wider ${textSecondary}`}>Monthly Stats</h3>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm bg-[#00d97e]" />
            <span className={`text-xs ${textSecondary}`}>Sales ($K)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm bg-[#007bff]" />
            <span className={`text-xs ${textSecondary}`}>Profit ($K)</span>
          </div>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
          <XAxis dataKey="name" tick={{ fontSize: 11, fill: textColor }} axisLine={{ stroke: gridColor }} tickLine={false} />
          <YAxis tick={{ fontSize: 11, fill: textColor }} axisLine={{ stroke: gridColor }} tickLine={false} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}K`} />
          <Tooltip
            contentStyle={{
              backgroundColor: isDark ? "#1a1d27" : "#fff",
              border: `1px solid ${isDark ? "#2a2d37" : "#e5e7eb"}`,
              borderRadius: "8px",
              color: isDark ? "#fff" : "#111",
              fontSize: "12px",
            }}
            formatter={(value: number) => [`Rp ${value.toLocaleString()}`, undefined]}
          />
          <Line type="monotone" dataKey="sales" stroke="#00d97e" strokeWidth={2} dot={{ r: 4, fill: "#00d97e" }} activeDot={{ r: 6 }} />
          <Line type="monotone" dataKey="profit" stroke="#007bff" strokeWidth={2} dot={{ r: 4, fill: "#007bff" }} activeDot={{ r: 6 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
