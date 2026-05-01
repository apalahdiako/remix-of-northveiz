import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Activity, ShoppingBag, LogIn, Eye } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface FeedItem {
  id: string;
  name: string;
  action: string;
  location: string;
  time: string;
  type: "visit" | "order" | "login";
}

export default function LiveActivityFeed({ isDark }: { isDark: boolean }) {
  const [feed, setFeed] = useState<FeedItem[]>([]);

  const fetchFeed = async () => {
    // Fetch recent visitor sessions (with user_id)
    const { data: visitors } = await supabase
      .from("visitor_sessions")
      .select("id, session_id, user_id, country_name, city, created_at, page_path")
      .order("created_at", { ascending: false })
      .limit(15);

    // Fetch recent orders
    const { data: orders } = await supabase
      .from("orders")
      .select("id, customer_name, city, created_at, order_status, total_amount")
      .order("created_at", { ascending: false })
      .limit(10);

    // Resolve visitor user_ids to profile names
    const userIds = Array.from(new Set((visitors || []).map((v) => v.user_id).filter(Boolean))) as string[];
    let profileMap = new Map<string, string>();
    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", userIds);
      profiles?.forEach((p) => profileMap.set(p.id, p.full_name || "User"));
    }

    const items: FeedItem[] = [];

    visitors?.forEach((v) => {
      const name = v.user_id ? (profileMap.get(v.user_id) || "User") : `Tamu ${v.session_id.slice(-4)}`;
      items.push({
        id: `v-${v.id}`,
        name,
        action: `Mengunjungi ${v.page_path || "/"}`,
        location: [v.city, v.country_name].filter(Boolean).join(", ") || "Lokasi tidak diketahui",
        time: v.created_at,
        type: v.user_id ? "login" : "visit",
      });
    });

    orders?.forEach((o: any) => {
      items.push({
        id: `o-${o.id}`,
        name: o.customer_name,
        action: `Transaksi ${o.order_status} - Rp ${Number(o.total_amount || 0).toLocaleString()}`,
        location: o.city || "Lokasi tidak diketahui",
        time: o.created_at,
        type: "order",
      });
    });

    items.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
    setFeed(items.slice(0, 20));
  };

  useEffect(() => {
    fetchFeed();
    const channel = supabase
      .channel("live-feed")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "visitor_sessions" }, () => fetchFeed())
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "orders" }, () => fetchFeed())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const cardBg = isDark ? "bg-[#1a1d27] border-[#2a2d37]" : "bg-white border-gray-200";
  const textPrimary = isDark ? "text-white" : "text-gray-900";
  const textSecondary = isDark ? "text-gray-400" : "text-gray-500";
  const rowHover = isDark ? "hover:bg-white/5" : "hover:bg-gray-50";

  const getIcon = (type: string) => {
    switch (type) {
      case "order": return <ShoppingBag className="h-3.5 w-3.5 text-[#00d97e]" />;
      case "login": return <LogIn className="h-3.5 w-3.5 text-[#007bff]" />;
      default: return <Eye className="h-3.5 w-3.5 text-[#ffaa00]" />;
    }
  };

  const timeAgo = (t: string) => {
    const diff = (Date.now() - new Date(t).getTime()) / 1000;
    if (diff < 60) return `${Math.floor(diff)}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  return (
    <div className={`rounded-xl border ${cardBg}`}>
      <div className="px-5 py-3 border-b flex items-center gap-2" style={{ borderColor: isDark ? "#2a2d37" : "#e5e7eb" }}>
        <Activity className="h-4 w-4 text-[#00d97e]" />
        <h3 className={`text-sm font-semibold uppercase tracking-wider ${textSecondary}`}>Live Feed</h3>
        <div className="ml-auto flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-[#00d97e] animate-pulse" />
          <span className={`text-[10px] ${textSecondary}`}>Real-time</span>
        </div>
      </div>
      <ScrollArea className="h-[280px]">
        <div className="divide-y" style={{ borderColor: isDark ? "#2a2d37" : "#e5e7eb" }}>
          {feed.map((item) => (
            <div key={item.id} className={`px-4 py-2.5 flex items-center gap-3 ${rowHover} transition-colors`}>
              <div className={`w-7 h-7 rounded-full flex items-center justify-center ${isDark ? "bg-white/5" : "bg-gray-100"}`}>
                {getIcon(item.type)}
              </div>
              <div className="flex-1 min-w-0">
                <div className={`text-xs font-medium truncate ${textPrimary}`}>{item.name}</div>
                <div className={`text-[10px] truncate ${textSecondary}`}>{item.action}</div>
              </div>
              <div className="text-right shrink-0">
                <div className={`text-[10px] ${textSecondary}`}>{item.location}</div>
                <div className={`text-[10px] ${textSecondary}`}>{timeAgo(item.time)}</div>
              </div>
            </div>
          ))}
          {feed.length === 0 && (
            <div className={`px-4 py-8 text-center text-sm ${textSecondary}`}>Belum ada aktivitas</div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
