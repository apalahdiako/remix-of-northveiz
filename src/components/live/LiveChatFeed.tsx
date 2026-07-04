import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface Msg {
  id: string;
  display_name: string;
  content: string;
  type: string;
  user_id: string | null;
  created_at: string;
}

interface Props {
  streamId: string;
  canModerate?: boolean;
}

/**
 * TikTok-style chat feed: transparent, anchored bottom-left,
 * messages stack upward, top fades out. No input.
 */
const LiveChatFeed = ({ streamId, canModerate }: Props) => {
  const [messages, setMessages] = useState<Msg[]>([]);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data } = await supabase
        .from("live_stream_messages")
        .select("*")
        .eq("stream_id", streamId)
        .order("created_at", { ascending: true })
        .limit(80);
      if (mounted && data) setMessages(data as Msg[]);
    })();

    const ch = supabase
      .channel(`live_feed:${streamId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "live_stream_messages", filter: `stream_id=eq.${streamId}` },
        (payload) => setMessages((prev) => [...prev, payload.new as Msg].slice(-60))
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "live_stream_messages", filter: `stream_id=eq.${streamId}` },
        (payload) => setMessages((prev) => prev.filter((m) => m.id !== (payload.old as Msg).id))
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(ch);
    };
  }, [streamId]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const deleteMsg = async (id: string) => {
    if (!canModerate) return;
    await supabase.from("live_stream_messages").delete().eq("id", id);
  };

  return (
    <div
      ref={listRef}
      className="h-full w-full overflow-y-auto scrollbar-none pr-1 pb-1 flex flex-col justify-end gap-1.5"
      style={{
        maskImage: "linear-gradient(to bottom, transparent 0%, black 40%)",
        WebkitMaskImage: "linear-gradient(to bottom, transparent 0%, black 40%)",
      }}
    >
      {messages.map((m) => {
        const isJoin = m.type === "join" || m.type === "system";
        if (isJoin) {
          return (
            <div key={m.id} className="inline-flex items-center gap-1.5 self-start bg-black/45 backdrop-blur-sm rounded-full px-2.5 py-1 text-[11px] text-white/90">
              <span aria-hidden>👋</span>
              <span className="truncate max-w-[75vw]">{m.content}</span>
            </div>
          );
        }
        return (
          <div
            key={m.id}
            className="group inline-flex items-start gap-2 self-start bg-black/45 backdrop-blur-sm rounded-2xl px-2.5 py-1.5 max-w-[80%]"
          >
            <div className="h-6 w-6 shrink-0 rounded-full bg-gradient-to-br from-pink-500 to-orange-400 grid place-items-center text-[10px] font-bold text-white">
              {m.display_name.slice(0, 1).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-[10.5px] leading-none text-white/60 font-medium truncate">{m.display_name}</p>
              <p className="text-[13px] leading-snug text-white break-words">{m.content}</p>
            </div>
            {canModerate && (
              <button
                onClick={() => deleteMsg(m.id)}
                className="ml-1 text-[9px] uppercase text-red-300 opacity-0 group-hover:opacity-100"
              >
                x
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default LiveChatFeed;
