
import { useState, useEffect, useRef } from "react";
import { X, Send, ImageIcon, Phone, PhoneIncoming, Video } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import VoiceRecorder from "@/components/chat/VoiceRecorder";
import AudioPlayer from "@/components/chat/AudioPlayer";
import { UserCallingOverlay } from "@/components/chat/VoIPCall";
import { AnimatePresence, motion } from "framer-motion";

interface ChatMessage {
  id: string;
  session_id: string;
  role: string;
  content: string | null;
  image_url: string | null;
  file_url: string | null;
  message_type: string;
  created_at: string;
}

const getSessionId = () => {
  let id = localStorage.getItem("chat_session_id");
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem("chat_session_id", id);
  }
  return id;
};

interface ChatWindowProps {
  open: boolean;
  onClose: () => void;
}

const ChatWindow = ({ open, onClose }: ChatWindowProps) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [uploading, setUploading] = useState(false);
  const [showCallOverlay, setShowCallOverlay] = useState(false);
  const [incomingAdminCall, setIncomingAdminCall] = useState(false);
  const sessionId = useRef(getSessionId());
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Listen for admin-initiated calls (callback)
  useEffect(() => {
    const channel = supabase.channel(`user-call-notify-${sessionId.current}`, {
      config: { broadcast: { self: false } },
    });
    channel.on("broadcast", { event: "incoming_call" }, ({ payload }) => {
      if (payload?.type === "ADMIN_CALLING") {
        setIncomingAdminCall(true);
        setTimeout(() => setIncomingAdminCall(prev => prev ? false : prev), 30000);
      }
    });
    channel.subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  useEffect(() => {
    if (!open) return;
    const load = async () => {
      const { data } = await supabase
        .from("chat_messages")
        .select("*")
        .eq("session_id", sessionId.current)
        .order("created_at", { ascending: true });
      if (data) setMessages(data as ChatMessage[]);
    };
    load();

    const channel = supabase
      .channel(`chat-${sessionId.current}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_messages", filter: `session_id=eq.${sessionId.current}` },
        (payload) => {
          setMessages((prev) => {
            if (prev.find((m) => m.id === (payload.new as ChatMessage).id)) return prev;
            return [...prev, payload.new as ChatMessage];
          });
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [open]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async (content?: string, imageUrl?: string) => {
    if (!content?.trim() && !imageUrl) return;
    await supabase.from("chat_messages").insert({
      session_id: sessionId.current,
      role: "user",
      content: content?.trim() || null,
      image_url: imageUrl || null,
      message_type: imageUrl ? "image" : "text",
    });
    setInput("");
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `${sessionId.current}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("chat-images").upload(path, file);
    if (!error) {
      const { data: urlData } = supabase.storage.from("chat-images").getPublicUrl(path);
      await sendMessage(undefined, urlData.publicUrl);
    }
    setUploading(false);
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleVoiceRecorded = async (blob: Blob, _durationSec: number) => {
    setUploading(true);
    const ext = blob.type.includes("mp4") ? "mp4" : "webm";
    const path = `${sessionId.current}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("voice-notes").upload(path, blob, { contentType: blob.type || "audio/webm" });
    if (!error) {
      const { data: urlData } = supabase.storage.from("voice-notes").getPublicUrl(path);
      await supabase.from("chat_messages").insert({
        session_id: sessionId.current,
        role: "user",
        message_type: "voice",
        file_url: urlData.publicUrl,
      });
    }
    setUploading(false);
  };

  if (!open) return null;

  return (
    <>
      {showCallOverlay && (
        <UserCallingOverlay sessionId={sessionId.current} onClose={() => setShowCallOverlay(false)} />
      )}

      {/* Incoming call from admin notification */}
      <AnimatePresence>
        {incomingAdminCall && !showCallOverlay && open && (
          <motion.div
            initial={{ y: -80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -80, opacity: 0 }}
            className="fixed top-4 left-1/2 -translate-x-1/2 z-[70] bg-gray-900/95 backdrop-blur-xl rounded-2xl p-4 shadow-2xl border border-white/10 min-w-[260px]"
          >
            <div className="flex items-center gap-3 mb-3">
              <motion.div animate={{ scale: [1, 1.1, 1] }} transition={{ duration: 1, repeat: Infinity }} className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                <PhoneIncoming className="text-green-400" size={20} />
              </motion.div>
              <div>
                <p className="text-white font-semibold text-sm">Panggilan dari Admin</p>
                <p className="text-white/50 text-xs">NORTHVEIZ Support</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setIncomingAdminCall(false)}
                className="flex-1 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-medium transition-colors"
              >
                Tolak
              </button>
              <button
                onClick={() => { setIncomingAdminCall(false); setShowCallOverlay(true); }}
                className="flex-1 py-2 rounded-xl bg-green-600 hover:bg-green-700 text-white text-sm font-medium transition-colors"
              >
                Terima
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="fixed bottom-0 right-0 z-[60] flex flex-col items-end p-4 pointer-events-none">
        <div className="pointer-events-auto w-[340px] max-w-[calc(100vw-2rem)] h-[480px] max-h-[70vh] bg-white/90 backdrop-blur-xl rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-gray-200/50">
          {/* Header */}
          <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
            <div className="w-8" />
            <h3 className="text-sm font-bold tracking-wide text-gray-900 uppercase">Dukungan Chat</h3>
            <button
              onClick={() => setShowCallOverlay(true)}
              className="p-2 text-green-600 hover:bg-green-50 rounded-full transition-colors"
              title="Panggilan Suara"
            >
              <Phone size={18} />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
            {messages.length === 0 && (
              <p className="text-center text-xs text-gray-400 mt-8">Mulai percakapan...</p>
            )}
            {messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className="max-w-[75%] rounded-2xl px-4 py-2.5 bg-white border border-gray-100 shadow-sm">
                  {msg.message_type === "call_log" ? (
                    <div className="flex items-center gap-2 text-gray-500">
                      <Phone size={14} />
                      <p className="text-xs">{msg.content}</p>
                    </div>
                  ) : msg.message_type === "voice" && msg.file_url ? (
                    <AudioPlayer src={msg.file_url} />
                  ) : (
                    <>
                      {msg.image_url && (
                        <img src={msg.image_url} alt="shared" className="rounded-lg max-w-full mb-1.5 max-h-40 object-cover" />
                      )}
                      {msg.content && <p className="text-sm text-gray-800 leading-relaxed">{msg.content}</p>}
                    </>
                  )}
                  <p className="text-[10px] text-gray-400 mt-1">
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
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="p-2 text-red-500 hover:bg-red-50 rounded-full transition-colors"
            >
              <ImageIcon size={20} />
            </button>
            {input.trim() ? (
              <>
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && sendMessage(input)}
                  placeholder="Ketik pesan..."
                  className="flex-1 text-sm bg-gray-50 rounded-full px-4 py-2.5 outline-none border border-gray-100 focus:border-gray-300 transition-colors text-gray-800 placeholder:text-gray-400"
                />
                <button
                  onClick={() => sendMessage(input)}
                  className="p-2.5 bg-pink-100 hover:bg-pink-200 text-pink-600 rounded-full transition-colors"
                >
                  <Send size={18} />
                </button>
              </>
            ) : (
              <>
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ketik pesan..."
                  className="flex-1 text-sm bg-gray-50 rounded-full px-4 py-2.5 outline-none border border-gray-100 focus:border-gray-300 transition-colors text-gray-800 placeholder:text-gray-400"
                />
                <VoiceRecorder onRecorded={handleVoiceRecorded} disabled={uploading} />
              </>
            )}
          </div>
        </div>

        {/* Close button */}
        <button
          onClick={onClose}
          className="pointer-events-auto mt-3 w-12 h-12 bg-red-600 hover:bg-red-700 text-white rounded-full flex items-center justify-center shadow-lg transition-colors"
        >
          <X size={22} />
        </button>
      </div>
    </>
  );
};

export default ChatWindow;
