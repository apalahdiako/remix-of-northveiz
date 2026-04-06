import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Phone, PhoneIncoming, PhoneOutgoing, PhoneMissed } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "sonner";

interface CallLog {
  id: string;
  session_id: string;
  role: string;
  content: string | null;
  created_at: string;
}

interface CallHistoryProps {
  onCallBack: (sessionId: string) => void;
  activeCallSessionId?: string | null;
}

export default function CallHistory({ onCallBack, activeCallSessionId }: CallHistoryProps) {
  const [callLogs, setCallLogs] = useState<CallLog[]>([]);

  const fetchCallLogs = useCallback(async () => {
    const { data } = await supabase
      .from("chat_messages")
      .select("id, session_id, role, content, created_at")
      .eq("message_type", "call_log")
      .order("created_at", { ascending: false })
      .limit(100);
    if (data) setCallLogs(data);
  }, []);

  useEffect(() => {
    fetchCallLogs();
    const channel = supabase
      .channel("call-history-realtime")
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "chat_messages",
        filter: "message_type=eq.call_log",
      }, () => {
        fetchCallLogs();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchCallLogs]);

  const getCallType = (log: CallLog): "incoming" | "outgoing" | "missed" => {
    if (log.content?.includes("tidak dijawab") || log.content?.includes("ditolak")) return "missed";
    if (log.role === "admin") return "outgoing";
    return "incoming";
  };

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const isYesterday = d.toDateString() === yesterday.toDateString();

    const time = d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
    if (isToday) return time;
    if (isYesterday) return `Kemarin ${time}`;
    return `${d.toLocaleDateString("id-ID", { day: "2-digit", month: "short" })} ${time}`;
  };

  const getAvatarLabel = (sessionId: string) => sessionId.slice(0, 2).toUpperCase();

  // Group by session to show latest call per session with count
  const grouped = callLogs.reduce((acc, log) => {
    if (!acc.has(log.session_id)) {
      acc.set(log.session_id, { latest: log, count: 1 });
    } else {
      acc.get(log.session_id)!.count += 1;
    }
    return acc;
  }, new Map<string, { latest: CallLog; count: number }>());

  const groupedEntries = Array.from(grouped.values()).sort(
    (a, b) => new Date(b.latest.created_at).getTime() - new Date(a.latest.created_at).getTime()
  );

  return (
    <div className="flex flex-col h-[calc(100vh-220px)] min-h-[500px] rounded-xl overflow-hidden border border-border bg-background shadow-lg">
      {/* Header */}
      <div className="px-4 py-4 border-b border-border bg-muted/30">
        <h2 className="text-lg font-bold text-foreground">Riwayat Panggilan</h2>
        <p className="text-xs text-muted-foreground mt-1">Semua riwayat panggilan VoIP</p>
      </div>

      {/* Call List */}
      <ScrollArea className="flex-1">
        {groupedEntries.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <Phone className="h-12 w-12 mb-3 opacity-30" />
            <p className="text-sm">Belum ada riwayat panggilan</p>
          </div>
        )}
        {groupedEntries.map(({ latest, count }) => {
          const callType = getCallType(latest);
          const isMissed = callType === "missed";

          return (
            <div
              key={latest.session_id}
              className="flex items-center gap-3 px-4 py-3 border-b border-border/30 hover:bg-muted/40 transition-colors"
            >
              <Avatar className="h-12 w-12 shrink-0">
                <AvatarFallback className={`font-semibold text-sm ${isMissed ? "bg-red-500/10 text-red-500" : "bg-primary/10 text-primary"}`}>
                  {getAvatarLabel(latest.session_id)}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1 min-w-0">
                <p className={`text-sm font-semibold truncate ${isMissed ? "text-red-500" : "text-foreground"}`}>
                  User {latest.session_id.slice(0, 8)}
                </p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  {callType === "incoming" && <PhoneIncoming size={12} className="text-green-500" />}
                  {callType === "outgoing" && <PhoneOutgoing size={12} className="text-blue-500" />}
                  {callType === "missed" && <PhoneMissed size={12} className="text-red-500" />}
                  <span className="text-xs text-muted-foreground">
                    {callType === "incoming" && "Masuk"}
                    {callType === "outgoing" && "Keluar"}
                    {callType === "missed" && "Tak Terjawab"}
                    {count > 1 && ` (${count})`}
                  </span>
                  <span className="text-[10px] text-muted-foreground/70 ml-1">
                    {formatTime(latest.created_at)}
                  </span>
                </div>
                {latest.content && !isMissed && (
                  <p className="text-[11px] text-muted-foreground/60 mt-0.5 truncate">{latest.content}</p>
                )}
              </div>

              {/* Call Back Button */}
              <button
                onClick={() => {
                  if (activeCallSessionId) {
                    toast.error("Sedang dalam panggilan aktif");
                    return;
                  }
                  onCallBack(latest.session_id);
                }}
                disabled={!!activeCallSessionId}
                className="p-2.5 text-green-500 hover:bg-green-500/10 rounded-full transition-colors disabled:opacity-30 shrink-0"
                title="Telepon Balik"
              >
                <Phone size={20} />
              </button>
            </div>
          );
        })}
      </ScrollArea>
    </div>
  );
}

// Hook to count missed calls for badge
export function useMissedCallCount() {
  const [count, setCount] = useState(0);

  const fetchCount = useCallback(async () => {
    const { data } = await supabase
      .from("chat_messages")
      .select("id", { count: "exact", head: true })
      .eq("message_type", "call_log")
      .eq("role", "user")
      .is("read_at", null);
    // We count unread call_log entries from users as "missed"
    // Actually let's count entries containing "tidak dijawab"
    const { count: missedCount } = await supabase
      .from("chat_messages")
      .select("id", { count: "exact", head: true })
      .eq("message_type", "call_log")
      .is("read_at", null)
      .ilike("content", "%tidak dijawab%");
    setCount(missedCount || 0);
  }, []);

  useEffect(() => {
    fetchCount();
    const channel = supabase
      .channel("missed-call-badge")
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "chat_messages",
        filter: "message_type=eq.call_log",
      }, () => fetchCount())
      .on("postgres_changes", {
        event: "UPDATE",
        schema: "public",
        table: "chat_messages",
        filter: "message_type=eq.call_log",
      }, () => fetchCount())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchCount]);

  return count;
}
