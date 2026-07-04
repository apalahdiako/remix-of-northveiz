import { useState, FormEvent } from "react";
import { Send, LogIn } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface Props {
  streamId: string;
  compact?: boolean;
}

/** TikTok-style pill chat input for the bottom action bar. */
const LiveChatInput = ({ streamId, compact }: Props) => {
  const { user } = useAuth();
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);

  if (!user) {
    return (
      <Link
        to="/auth"
        className="flex-1 flex items-center gap-2 bg-white/12 backdrop-blur-md text-white/80 rounded-full px-4 h-10 text-sm hover:bg-white/20 transition"
      >
        <LogIn className="h-4 w-4" />
        Login untuk chat
      </Link>
    );
  }

  const send = async (e: FormEvent) => {
    e.preventDefault();
    if (!input.trim() || sending) return;
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

  return (
    <form onSubmit={send} className="flex-1 relative flex items-center">
      <input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        maxLength={300}
        placeholder="Ketik komentar..."
        className={`w-full bg-white/12 backdrop-blur-md border border-white/15 rounded-full pl-4 pr-11 text-white placeholder:text-white/60 focus:outline-none focus:border-white/40 ${
          compact ? "h-9 text-[13px]" : "h-10 text-sm"
        }`}
      />
      <button
        type="submit"
        disabled={!input.trim() || sending}
        className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 grid place-items-center rounded-full bg-accent text-accent-foreground disabled:opacity-40"
        aria-label="Kirim"
      >
        <Send className="h-4 w-4" />
      </button>
    </form>
  );
};

export default LiveChatInput;
