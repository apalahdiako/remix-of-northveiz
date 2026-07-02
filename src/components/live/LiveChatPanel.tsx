import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Send, LogIn } from "lucide-react";
import { Link } from "react-router-dom";

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

const LiveChatPanel = ({ streamId, canModerate }: Props) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data } = await supabase
        .from("live_stream_messages")
        .select("*")
        .eq("stream_id", streamId)
        .order("created_at", { ascending: true })
        .limit(200);
      if (mounted && data) setMessages(data as Msg[]);
    })();

    const ch = supabase
      .channel(`live_msg:${streamId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "live_stream_messages", filter: `stream_id=eq.${streamId}` },
        (payload) => setMessages((prev) => [...prev, payload.new as Msg].slice(-300))
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

  const send = async () => {
    if (!input.trim() || !user || sending) return;
    setSending(true);
    const name =
      (user.user_metadata as any)?.full_name ||
      user.email?.split("@")[0] ||
      "User";
    const content = input.trim().slice(0, 300);
    setInput("");
    await supabase.from("live_stream_messages").insert({
      stream_id: streamId,
      user_id: user.id,
      display_name: name,
      content,
      type: "chat",
    });
    setSending(false);
  };

  const deleteMsg = async (id: string) => {
    if (!canModerate) return;
    await supabase.from("live_stream_messages").delete().eq("id", id);
  };

  return (
    <div className="flex flex-col h-full min-h-0">
      <div
        ref={listRef}
        className="flex-1 overflow-y-auto px-3 py-2 space-y-1.5 scrollbar-thin"
      >
        {messages.length === 0 && (
          <p className="text-xs text-white/50 text-center py-4">Belum ada komentar. Sapa dulu!</p>
        )}
        {messages.map((m) => (
          <div key={m.id} className="group text-sm text-white/95 leading-snug">
            <span className="font-semibold text-accent mr-1.5">{m.display_name}</span>
            <span className="break-words">{m.content}</span>
            {canModerate && (
              <button
                onClick={() => deleteMsg(m.id)}
                className="ml-2 text-[10px] uppercase text-red-400 opacity-0 group-hover:opacity-100"
              >
                hapus
              </button>
            )}
          </div>
        ))}
      </div>

      <div className="border-t border-white/10 p-2 bg-black/40">
        {user ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              send();
            }}
            className="flex items-center gap-2"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              maxLength={300}
              placeholder="Tulis komentar..."
              className="flex-1 bg-white/10 border border-white/15 rounded-full px-3.5 py-2 text-sm text-white placeholder:text-white/40 focus:outline-none focus:border-accent"
            />
            <button
              type="submit"
              disabled={!input.trim() || sending}
              className="h-9 w-9 grid place-items-center rounded-full bg-accent text-accent-foreground disabled:opacity-40"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        ) : (
          <Link
            to="/auth"
            className="flex items-center justify-center gap-2 text-sm text-white/80 bg-white/10 rounded-full py-2"
          >
            <LogIn className="h-4 w-4" /> Login untuk komentar
          </Link>
        )}
      </div>
    </div>
  );
};

export default LiveChatPanel;
