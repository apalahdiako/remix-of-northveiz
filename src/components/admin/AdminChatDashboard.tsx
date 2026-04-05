import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Search, Send, Smile, ImageIcon, X, Phone } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import VoiceRecorder from "@/components/chat/VoiceRecorder";
import AudioPlayer from "@/components/chat/AudioPlayer";
import { useIncomingCall, useVoIPCall, AdminIncomingCall, AdminCallBar } from "@/components/chat/VoIPCall";
import { AnimatePresence } from "framer-motion";

interface ChatMessage {
  id: string;
  session_id: string;
  role: string;
  content: string | null;
  image_url: string | null;
  file_url: string | null;
  message_type: string;
  created_at: string;
  read_at: string | null;
}

interface ChatSession {
  session_id: string;
  last_message: string | null;
  last_at: string;
  unread: number;
}

const EMOJI_LIST = ["😀","😂","❤️","👍","🔥","🎉","😍","🙏","💯","✨","😊","👋","🤔","😎","💪","🥰","😢","🤩","👏","💕"];

const PING_SOUND_URL = "data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgipGQeWBUW3yOm5V/YUxKYIKSl4xzV0lOZH+RmpJ4WUVFXnyPm5Z+YExFT2qFl5yPdVhGQFZ0ipifk3RMNT1ff5SgnYFlRz5VdI2aoZB1TzY7XXqQoaCMb0czQWF/lqKfjG1CMkFhgJijoIxsQTBCYoKapKGMa0AvQGGBmaShjWtBL0BhgZmkoY1rQS9AYYGZpKGNa0EvQGGBmKShjGtBMEBhgZqkoY1qQC9AYYGapKKOa0EwQWKCm6WijmtALz9ggJijoI1rQjFCY4OcpqOPbEEuP2CAmKOfjGtCMUNkg52mo49sQS4/X3+Xop6La0IxQ2SDnaajj2xBLj9ff5ein4trQjFDZIOdpqOPbEEuP19/l6KfimtCMkRlhJ6no5BtQS0+Xn6Wop6Ka0IyRWaFn6ikkW1ALT1dfZWhnYlqQjJFZoWfp6SRbkEtPV19laCciGpCM0ZnhqCopZJuQCw8XHyUn5uHaUEzR2iHoammlG9ALDxcfJOfmoZoQTRIaYiiqaeVb0ArO1t7k56ZhWhBNUlqiKOqqJZwQCo6WnmSnZeEZ0E2SmyKpKuqlnBAKjpZeZGdlYNoQTdLbYumrKuXcD8pOVh4kJyTgmdBOExui6etq5hwPyg4V3eOmpKBZkE5Tm+Mqa6smXA/KDdWdo2ZkH9lQDpQcY2qr62acD8nNlV1jJiOfmRAO1Fyj6ywr5txPyc2VHSLl4x9Y0A8UnOQrbGwm3E/JjVTc4qVi3tiQD5UdZKvs7GdckAmNFJyiZSJeWFAPFN0ka6ysZ1yQCY0UnKJlIl5YEA+VXaUsbSzoHNAJTNQcIiSh3dgQD9WeJW0trWhc0AkMk9viJGFdV9AQFZ4l7W4t6N0QSQyTm6HkIN0XkBBV3qZt7q5pXVBIzFNbYaOgXJeQENZfJu5vLundkIjME1thI1/cV1ARFp9nbu+vKl3QiIvS2yDjH1vW0BGW3+fvb/ArHlDIi5KaoGKem5aQEdcgaHAwr+tekMhLUhogIh4bFlAS16Do8LEvq98RCEsSGd+hXZrWEBNYIWlxMbBsX5EICpGZXyDc2lXQE9ihqjHycK0gEYgKURjeoFxZ1ZAUWWJ";

export default function AdminChatDashboard() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [showEmoji, setShowEmoji] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [activeCallSession, setActiveCallSession] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const { incomingCall, dismiss: dismissIncoming } = useIncomingCall();

  const adminCall = useVoIPCall(
    activeCallSession || "none",
    "admin",
    () => setActiveCallSession(null)
  );

  const handleAcceptCall = () => {
    if (incomingCall) {
      setActiveCallSession(incomingCall.sessionId);
      dismissIncoming();
      setTimeout(() => adminCall.acceptCall(), 300);
    }
  };

  const handleRejectCall = () => {
    if (incomingCall) {
      // Setup signaling just to send reject
      const ch = supabase.channel(`voip-${incomingCall.sessionId}`, { config: { broadcast: { self: false } } });
      ch.subscribe((st) => {
        if (st === "SUBSCRIBED") {
          ch.send({ type: "broadcast", event: "call_signal", payload: { type: "CALL_REJECTED", from: "admin" } });
          setTimeout(() => supabase.removeChannel(ch), 1000);
        }
      });
      dismissIncoming();
    }
  };

  const loadSessions = useCallback(async () => {
    const { data } = await supabase
      .from("chat_messages")
      .select("session_id, content, created_at, role, read_at, message_type")
      .order("created_at", { ascending: false });
    if (!data) return;

    const map = new Map<string, ChatSession>();
    for (const row of data) {
      if (!map.has(row.session_id)) {
        let preview = row.content;
        if (row.message_type === "voice") preview = "🎤 Voice note";
        map.set(row.session_id, {
          session_id: row.session_id,
          last_message: preview,
          last_at: row.created_at,
          unread: 0,
        });
      }
      if (row.role === "user" && !row.read_at) {
        const s = map.get(row.session_id)!;
        s.unread += 1;
      }
    }
    const arr = Array.from(map.values()).sort(
      (a, b) => new Date(b.last_at).getTime() - new Date(a.last_at).getTime()
    );
    setSessions(arr);
  }, []);

  useEffect(() => {
    loadSessions();
    const channel = supabase
      .channel("admin-dashboard-chat")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "chat_messages" }, (payload) => {
        const msg = payload.new as ChatMessage;
        if (msg.role === "user") {
          try {
            const audio = new Audio(PING_SOUND_URL);
            audio.volume = 0.5;
            audio.play().catch(() => {});
          } catch {}
        }
        loadSessions();
        if (msg.session_id === selected) {
          setMessages((prev) => {
            if (prev.find((m) => m.id === msg.id)) return prev;
            return [...prev, msg];
          });
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [loadSessions, selected]);

  useEffect(() => {
    if (!selected) return;
    const load = async () => {
      const { data } = await supabase
        .from("chat_messages")
        .select("*")
        .eq("session_id", selected)
        .order("created_at", { ascending: true });
      if (data) setMessages(data as ChatMessage[]);

      await supabase
        .from("chat_messages")
        .update({ read_at: new Date().toISOString() })
        .eq("session_id", selected)
        .eq("role", "user")
        .is("read_at", null);
      loadSessions();
    };
    load();
  }, [selected, loadSessions]);

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
      message_type: imageUrl ? "image" : "text",
    });
    setInput("");
    setShowEmoji(false);
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
    } else {
      toast.error("Gagal upload gambar");
    }
    setUploading(false);
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleVoiceRecorded = async (blob: Blob, _durationSec: number) => {
    if (!selected) return;
    setUploading(true);
    const ext = blob.type.includes("mp4") ? "mp4" : "webm";
    const path = `admin/${selected}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("voice-notes").upload(path, blob, { contentType: blob.type || "audio/webm" });
    if (!error) {
      const { data: urlData } = supabase.storage.from("voice-notes").getPublicUrl(path);
      await supabase.from("chat_messages").insert({
        session_id: selected,
        role: "admin",
        message_type: "voice",
        file_url: urlData.publicUrl,
      });
    } else {
      toast.error("Gagal upload voice note");
    }
    setUploading(false);
  };

  const filteredSessions = sessions.filter((s) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return s.session_id.toLowerCase().includes(q) || s.last_message?.toLowerCase().includes(q);
  });

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    if (isToday) return d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
    return d.toLocaleDateString("id-ID", { day: "2-digit", month: "2-digit", year: "2-digit" });
  };

  const getAvatarLabel = (sessionId: string) => sessionId.slice(0, 2).toUpperCase();

  return (
    <>
      {/* Incoming Call Notification */}
      <AnimatePresence>
        {incomingCall && (
          <AdminIncomingCall
            sessionId={incomingCall.sessionId}
            onAccept={handleAcceptCall}
            onReject={handleRejectCall}
          />
        )}
      </AnimatePresence>

      {/* Remote audio element for active call */}
      <audio ref={adminCall.remoteAudioRef} autoPlay className="hidden" />

    <div className="flex h-[calc(100vh-220px)] min-h-[500px] rounded-xl overflow-hidden border border-border bg-background shadow-lg">
      {/* Sidebar */}
      <div className={`flex flex-col border-r border-border bg-card ${selected ? "hidden md:flex" : "flex"} w-full md:w-[35%] md:min-w-[300px]`}>
        <div className="px-4 py-4 border-b border-border bg-muted/30">
          <h2 className="text-lg font-bold text-foreground mb-3">Dukungan Chat</h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Cari percakapan..." className="pl-9 bg-background/50 border-border/50 h-9 text-sm" />
          </div>
        </div>
        <ScrollArea className="flex-1">
          {filteredSessions.length === 0 && (
            <p className="text-center text-sm text-muted-foreground py-12">Belum ada percakapan</p>
          )}
          {filteredSessions.map((s) => (
            <button
              key={s.session_id}
              onClick={() => setSelected(s.session_id)}
              className={`w-full flex items-center gap-3 px-4 py-3 border-b border-border/30 hover:bg-muted/40 transition-colors text-left ${selected === s.session_id ? "bg-muted/60" : ""}`}
            >
              <Avatar className="h-12 w-12 shrink-0">
                <AvatarFallback className="bg-primary/10 text-primary font-semibold text-sm">{getAvatarLabel(s.session_id)}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-foreground truncate">User {s.session_id.slice(0, 8)}</span>
                  <span className="text-[11px] text-muted-foreground shrink-0 ml-2">{formatTime(s.last_at)}</span>
                </div>
                <div className="flex items-center justify-between mt-0.5">
                  <p className="text-xs text-muted-foreground truncate pr-2">{s.last_message || "📷 Gambar"}</p>
                  {s.unread > 0 && (
                    <Badge className="bg-green-500 hover:bg-green-500 text-white text-[10px] h-5 min-w-5 flex items-center justify-center rounded-full px-1.5 shrink-0">{s.unread}</Badge>
                  )}
                </div>
              </div>
            </button>
          ))}
        </ScrollArea>
      </div>

      {/* Chat Window */}
      <div className={`flex flex-col flex-1 ${!selected ? "hidden md:flex" : "flex"}`}>
        {!selected ? (
          <div className="flex-1 flex items-center justify-center bg-muted/10">
            <div className="text-center">
              <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-muted/30 flex items-center justify-center">
                <Send className="h-8 w-8 text-muted-foreground/50" />
              </div>
              <h3 className="text-xl font-semibold text-muted-foreground mb-1">Dukungan Chat NORTHVEIZ</h3>
              <p className="text-sm text-muted-foreground/70">Pilih percakapan untuk mulai membalas</p>
            </div>
          </div>
        ) : (
          <>
            {/* Chat Header */}
            <div className="px-4 py-3 border-b border-border bg-muted/30 flex items-center gap-3">
              <button onClick={() => { setSelected(null); setMessages([]); }} className="md:hidden p-1 text-muted-foreground hover:text-foreground">
                <X size={20} />
              </button>
              <Avatar className="h-10 w-10">
                <AvatarFallback className="bg-primary/10 text-primary font-semibold text-sm">{getAvatarLabel(selected)}</AvatarFallback>
              </Avatar>
              <div>
                <p className="text-sm font-semibold text-foreground">User {selected.slice(0, 8)}</p>
                <p className="text-[11px] text-muted-foreground">Session: {selected.slice(0, 16)}...</p>
              </div>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 bg-[hsl(var(--muted)/0.15)]">
              <div className="px-4 py-3 space-y-2 min-h-full">
                {messages.map((msg) => {
                  const isAdmin = msg.role === "admin";
                  return (
                    <div key={msg.id} className={`flex ${isAdmin ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[75%] rounded-lg px-3 py-2 shadow-sm ${isAdmin ? "bg-green-600 text-white rounded-br-none" : "bg-card text-foreground border border-border/50 rounded-bl-none"}`}>
                        {msg.message_type === "voice" && msg.file_url ? (
                          <AudioPlayer src={msg.file_url} isAdmin={isAdmin} />
                        ) : (
                          <>
                            {msg.image_url && (
                              <img src={msg.image_url} alt="shared" className="rounded max-w-full mb-1.5 max-h-52 object-cover cursor-pointer" onClick={() => window.open(msg.image_url!, "_blank")} />
                            )}
                            {msg.content && <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>}
                          </>
                        )}
                        <p className={`text-[10px] mt-1 text-right ${isAdmin ? "text-green-200" : "text-muted-foreground"}`}>
                          {new Date(msg.created_at).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </div>
                    </div>
                  );
                })}
                <div ref={bottomRef} />
              </div>
            </ScrollArea>

            {/* Emoji Picker */}
            {showEmoji && (
              <div className="px-4 py-2 border-t border-border bg-card flex flex-wrap gap-1">
                {EMOJI_LIST.map((emoji) => (
                  <button key={emoji} onClick={() => setInput((prev) => prev + emoji)} className="text-xl hover:bg-muted rounded p-1 transition-colors">{emoji}</button>
                ))}
              </div>
            )}

            {/* Input Bar */}
            <div className="px-3 py-2 border-t border-border bg-card flex items-center gap-2">
              <input type="file" ref={fileRef} accept="image/*" className="hidden" onChange={handleImageUpload} />
              <button onClick={() => setShowEmoji(!showEmoji)} className="p-2 text-muted-foreground hover:text-foreground rounded-full hover:bg-muted transition-colors">
                <Smile size={22} />
              </button>
              <button onClick={() => fileRef.current?.click()} disabled={uploading} className="p-2 text-muted-foreground hover:text-foreground rounded-full hover:bg-muted transition-colors">
                <ImageIcon size={22} />
              </button>
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(input); } }}
                placeholder="Ketik pesan..."
                className="flex-1 bg-muted/30 border-border/50 rounded-full h-10 text-sm"
              />
              {input.trim() ? (
                <Button onClick={() => sendMessage(input)} size="icon" className="rounded-full bg-green-600 hover:bg-green-700 h-10 w-10 shrink-0">
                  <Send size={18} />
                </Button>
              ) : (
                <VoiceRecorder onRecorded={handleVoiceRecorded} disabled={uploading} />
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
