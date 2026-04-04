import { Progress } from "@/components/ui/progress";

interface RegionalStatsProps {
  topCountries: Array<{ country: string; count: number }>;
  isDark: boolean;
}

const COLORS = ["#ff3d71", "#007bff", "#00d97e", "#ffaa00"];

export default function RegionalStats({ topCountries, isDark }: RegionalStatsProps) {
  const maxCount = topCountries[0]?.count || 1;
  const textPrimary = isDark ? "text-white" : "text-gray-900";
  const textSecondary = isDark ? "text-gray-400" : "text-gray-500";
  const cardBg = isDark ? "bg-[#1a1d27] border-[#2a2d37]" : "bg-white border-gray-200";

  return (
    <div className={`rounded-xl border p-5 h-full ${cardBg}`}>
      <h3 className={`text-sm font-semibold mb-5 uppercase tracking-wider ${textSecondary}`}>Regional Stats</h3>
      <div className="space-y-5">
        {topCountries.slice(0, 4).map((item, i) => {
          const pct = Math.round((item.count / maxCount) * 100);
          return (
            <div key={i}>
              <div className="flex items-baseline justify-between mb-1.5">
                <div>
                  <div className={`text-xl font-bold ${textPrimary}`}>
                    {item.count >= 1000000 ? `${(item.count / 1000000).toFixed(0)}M` : 
                     item.count >= 1000 ? `${(item.count / 1000).toFixed(0)}k` : 
                     item.count}
                  </div>
                  <div className={`text-xs ${textSecondary}`}>Visitors From {item.country}</div>
                </div>
                <span className={`text-sm font-medium ${textSecondary}`}>{pct}%</span>
              </div>
              <div className={`h-1.5 rounded-full ${isDark ? "bg-white/10" : "bg-gray-100"} overflow-hidden`}>
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${pct}%`, backgroundColor: COLORS[i % COLORS.length] }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Donut Stats */}
      <div className="flex items-center justify-around mt-6 pt-5 border-t" style={{ borderColor: isDark ? "#2a2d37" : "#e5e7eb" }}>
        {[
          { label: "New Users", pct: 75, color: "#00d97e" },
          { label: "Purchases", pct: 50, color: "#007bff" },
          { label: "Bounce Rate", pct: 90, color: "#ff3d71" },
        ].map((stat) => (
          <div key={stat.label} className="flex flex-col items-center">
            <div className="relative w-14 h-14">
              <svg className="w-14 h-14 -rotate-90" viewBox="0 0 56 56">
                <circle cx="28" cy="28" r="22" fill="none" stroke={isDark ? "#2a2d37" : "#e5e7eb"} strokeWidth="4" />
                <circle
                  cx="28" cy="28" r="22" fill="none"
                  stroke={stat.color} strokeWidth="4"
                  strokeDasharray={`${(stat.pct / 100) * 138.2} 138.2`}
                  strokeLinecap="round"
                />
              </svg>
              <span className={`absolute inset-0 flex items-center justify-center text-[10px] font-bold ${textPrimary}`}>
                {stat.pct}%
              </span>
            </div>
            <span className={`text-[10px] mt-1 ${textSecondary}`}>{stat.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
