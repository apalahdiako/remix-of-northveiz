
import { useState, useEffect, useRef } from "react";
import { X, Send, ImageIcon, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface ChatMessage {
  id: string;
  session_id: string;
  role: string;
  content: string | null;
  image_url: string | null;
  created_at: string;
}

interface Session {
  session_id: string;
  last_message: string | null;
  last_at: string;
  unread: number;
}

interface AdminChatPanelProps {
  open: boolean;
  onClose: () => void;
}

const AdminChatPanel = ({ open, onClose }: AdminChatPanelProps) => {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [uploading, setUploading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Load sessions
  useEffect(() => {
    if (!open) return;
    const loadSessions = async () => {
      const { data } = await supabase
        .from("chat_messages")
        .select("session_id, content, created_at")
        .order("created_at", { ascending: false });
      if (!data) return;
      const map = new Map<string, Session>();
      for (const row of data) {
        if (!map.has(row.session_id)) {
          map.set(row.session_id, {
            session_id: row.session_id,
            last_message: row.content,
            last_at: row.created_at,
            unread: 0,
          });
        }
      }
      setSessions(Array.from(map.values()));
    };
    loadSessions();

    // Listen for new messages globally
    const channel = supabase
      .channel("admin-chat-all")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "chat_messages" }, () => {
        loadSessions();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [open]);

  // Load messages for selected session
  useEffect(() => {
    if (!selected) return;
    const load = async () => {
      const { data } = await supabase
        .from("chat_messages")
        .select("*")
        .eq("session_id", selected)
        .order("created_at", { ascending: true });
      if (data) setMessages(data);
    };
    load();

    const channel = supabase
      .channel(`admin-chat-${selected}`)
      .on("postgres_changes", {
        event: "INSERT", schema: "public", table: "chat_messages",
        filter: `session_id=eq.${selected}`,
      }, (payload) => {
        setMessages((prev) => {
          if (prev.find((m) => m.id === (payload.new as ChatMessage).id)) return prev;
          return [...prev, payload.new as ChatMessage];
        });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [selected]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async (content?: string, imageUrl?: string) => {
    if (!selected || (!content?.trim() && !imageUrl)) return;
    await supabase.from("chat_messages").insert({
      session_id: selected,
      role: "admin",
      content: content?.trim() || null,
      image_url: imageUrl || null,
    });
    setInput("");
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selected) return;
    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `admin/${selected}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("chat-images").upload(path, file);
    if (!error) {
      const { data: urlData } = supabase.storage.from("chat-images").getPublicUrl(path);
      await sendMessage(undefined, urlData.publicUrl);
    }
    setUploading(false);
    if (fileRef.current) fileRef.current.value = "";
  };

  if (!open) return null;

  return (
    <div className="fixed bottom-0 right-0 z-[60] flex flex-col items-end p-4 pointer-events-none">
      <div className="pointer-events-auto w-[380px] max-w-[calc(100vw-2rem)] h-[520px] max-h-[75vh] bg-white/90 backdrop-blur-xl rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-gray-200/50">
        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-3">
          {selected && (
            <button onClick={() => { setSelected(null); setMessages([]); }} className="text-gray-500 hover:text-gray-800">
              <ArrowLeft size={18} />
            </button>
          )}
          <h3 className="text-sm font-bold tracking-wide text-gray-900 uppercase flex-1 text-center">
            {selected ? `Chat: ${selected.slice(0, 8)}...` : "Admin Inbox"}
          </h3>
        </div>

        {!selected ? (
          /* Session list */
          <div className="flex-1 overflow-y-auto">
            {sessions.length === 0 && (
              <p className="text-center text-xs text-gray-400 mt-8">Belum ada pesan masuk</p>
            )}
            {sessions.map((s) => (
              <button
                key={s.session_id}
                onClick={() => setSelected(s.session_id)}
                className="w-full px-5 py-4 border-b border-gray-50 hover:bg-gray-50 text-left transition-colors"
              >
                <p className="text-xs font-mono text-gray-500 mb-1">{s.session_id.slice(0, 12)}...</p>
                <p className="text-sm text-gray-700 truncate">{s.last_message || "📷 Gambar"}</p>
                <p className="text-[10px] text-gray-400 mt-1">
                  {new Date(s.last_at).toLocaleString("id-ID")}
                </p>
              </button>
            ))}
          </div>
        ) : (
          <>
            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
              {messages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.role === "admin" ? "justify-end" : "justify-start"}`}>
                  <div className="max-w-[75%] rounded-2xl px-4 py-2.5 bg-white border border-gray-100 shadow-sm">
                    {msg.image_url && (
                      <img src={msg.image_url} alt="shared" className="rounded-lg max-w-full mb-1.5 max-h-40 object-cover" />
                    )}
                    {msg.content && <p className="text-sm text-gray-800 leading-relaxed">{msg.content}</p>}
                    <p className="text-[10px] text-gray-400 mt-1">
                      {msg.role === "admin" ? "Admin • " : "User • "}
                      {new Date(msg.created_at).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                </div>
              ))}
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div className="px-3 py-3 border-t border-gray-100 flex items-center gap-2">
              <input type="file" ref={fileRef} accept="image/*" className="hidden" onChange={handleImageUpload} />
              <button onClick={() => fileRef.current?.click()} disabled={uploading} className="p-2 text-red-500 hover:bg-red-50 rounded-full transition-colors">
                <ImageIcon size={20} />
              </button>
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendMessage(input)}
                placeholder="Balas pesan..."
                className="flex-1 text-sm bg-gray-50 rounded-full px-4 py-2.5 outline-none border border-gray-100 focus:border-gray-300 transition-colors text-gray-800 placeholder:text-gray-400"
              />
              <button onClick={() => sendMessage(input)} className="p-2.5 bg-pink-100 hover:bg-pink-200 text-pink-600 rounded-full transition-colors">
                <Send size={18} />
              </button>
            </div>
          </>
        )}
      </div>

      {/* Close */}
      <button onClick={onClose} className="pointer-events-auto mt-3 w-12 h-12 bg-red-600 hover:bg-red-700 text-white rounded-full flex items-center justify-center shadow-lg transition-colors">
        <X size={22} />
      </button>
    </div>
  );
};

export default AdminChatPanel;
