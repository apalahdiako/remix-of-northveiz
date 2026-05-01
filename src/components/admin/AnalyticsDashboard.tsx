import { useState } from "react";
import { Sun, Moon } from "lucide-react";
import AnalyticsCards from "./AnalyticsCards";
import InteractiveGlobe from "./InteractiveGlobe";
import RegionalStats from "./RegionalStats";
import MonthlyStatsChart from "./MonthlyStatsChart";
import AdminTodoList from "./AdminTodoList";
import LiveActivityFeed from "./LiveActivityFeed";

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

export default function AnalyticsDashboard({ analyticsData, locations }: AnalyticsDashboardProps) {
  const [isDark, setIsDark] = useState(true);

  const bgMain = isDark ? "bg-[#0f111a]" : "bg-[#f8f9fa]";
  const textPrimary = isDark ? "text-white" : "text-gray-900";
  const textSecondary = isDark ? "text-gray-400" : "text-gray-500";

  return (
    <div className={`rounded-2xl p-3 md:p-6 space-y-5 transition-colors duration-300 overflow-hidden max-w-full ${bgMain}`}>
      {/* Header with theme toggle */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className={`text-xl font-bold ${textPrimary}`}>Analytics Dashboard</h2>
          <p className={`text-xs ${textSecondary}`}>Real-time user & order tracking</p>
        </div>
        <button
          onClick={() => setIsDark(!isDark)}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
            isDark ? "bg-white/10 text-white hover:bg-white/20" : "bg-gray-200 text-gray-700 hover:bg-gray-300"
          }`}
        >
          {isDark ? (
            <>LIGHT <Sun className="h-3.5 w-3.5" /></>
          ) : (
            <>DARK <Moon className="h-3.5 w-3.5" /></>
          )}
        </button>
      </div>

      {/* KPI Cards */}
      <AnalyticsCards data={analyticsData} isDark={isDark} />

      {/* Globe + Regional Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-10 gap-4">
        <div className="lg:col-span-7">
          <div className={`rounded-xl border p-3 ${isDark ? "bg-[#1a1d27] border-[#2a2d37]" : "bg-white border-gray-200"}`}>
            <div className="flex items-center justify-between mb-2 px-2">
              <h3 className={`text-sm font-semibold uppercase tracking-wider ${textSecondary}`}>Site Visits</h3>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-[#007bff] animate-pulse" />
                <span className={`text-[10px] ${textSecondary}`}>Live</span>
              </div>
            </div>
            <InteractiveGlobe locations={locations} isDark={isDark} />
          </div>
        </div>
        <div className="lg:col-span-3">
          <RegionalStats topCountries={analyticsData.topCountries} isDark={isDark} />
        </div>
      </div>

      {/* Monthly Stats + Todo */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div className="lg:col-span-3">
          <MonthlyStatsChart isDark={isDark} />
        </div>
        <div className="lg:col-span-2">
          <AdminTodoList isDark={isDark} />
        </div>
      </div>

      {/* Live Activity Feed */}
      <LiveActivityFeed isDark={isDark} />
    </div>
  );
}
