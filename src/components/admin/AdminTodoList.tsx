import { useEffect, useState } from "react";
import { Check, Trash2, Plus, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface TodoItem {
  id: string;
  text: string;
  done: boolean;
  label_text: string | null;
  label_color: string | null;
}

const LABEL_COLORS = ["#ff3d71", "#00d97e", "#ffaa00", "#007bff"];

export default function AdminTodoList({ isDark }: { isDark: boolean }) {
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [newText, setNewText] = useState("");
  const [adding, setAdding] = useState(false);

  const fetchTodos = async () => {
    const { data, error } = await supabase
      .from("admin_todos")
      .select("id, text, done, label_text, label_color")
      .order("created_at", { ascending: false });
    if (error) {
      console.error(error);
    } else {
      setTodos(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchTodos();
    const channel = supabase
      .channel("admin-todos")
      .on("postgres_changes", { event: "*", schema: "public", table: "admin_todos" }, () => fetchTodos())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const toggleTodo = async (id: string, current: boolean) => {
    setTodos((prev) => prev.map((t) => t.id === id ? { ...t, done: !current } : t));
    const { error } = await supabase.from("admin_todos").update({ done: !current }).eq("id", id);
    if (error) toast.error("Gagal update");
  };

  const removeTodo = async (id: string) => {
    setTodos((prev) => prev.filter((t) => t.id !== id));
    const { error } = await supabase.from("admin_todos").delete().eq("id", id);
    if (error) toast.error("Gagal hapus");
  };

  const addTodo = async () => {
    if (!newText.trim()) return;
    setAdding(true);
    const color = LABEL_COLORS[Math.floor(Math.random() * LABEL_COLORS.length)];
    const { error } = await supabase.from("admin_todos").insert({
      text: newText.trim(),
      done: false,
      label_text: "New",
      label_color: color,
    });
    if (error) toast.error("Gagal menambah");
    else setNewText("");
    setAdding(false);
  };

  const cardBg = isDark ? "bg-[#1a1d27] border-[#2a2d37]" : "bg-white border-gray-200";
  const textPrimary = isDark ? "text-white" : "text-gray-900";
  const textSecondary = isDark ? "text-gray-400" : "text-gray-500";
  const rowHover = isDark ? "hover:bg-white/5" : "hover:bg-gray-50";
  const borderColor = isDark ? "#2a2d37" : "#e5e7eb";
  const inputBg = isDark ? "bg-white/5 text-white placeholder:text-gray-500" : "bg-gray-50 text-gray-900 placeholder:text-gray-400";

  return (
    <div className={`rounded-xl border ${cardBg} overflow-hidden`}>
      <div className="px-5 py-3 border-b flex items-center justify-between" style={{ borderColor }}>
        <h3 className={`text-sm font-semibold uppercase tracking-wider ${textSecondary}`}>Todo List</h3>
        <span className={`text-[10px] ${textSecondary}`}>{todos.filter(t => !t.done).length} aktif</span>
      </div>
      <div className="p-3 border-b flex gap-2" style={{ borderColor }}>
        <input
          type="text"
          value={newText}
          onChange={(e) => setNewText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addTodo()}
          placeholder="Tugas baru..."
          className={`flex-1 min-w-0 px-3 py-1.5 rounded-md text-xs outline-none border ${inputBg}`}
          style={{ borderColor }}
        />
        <button
          onClick={addTodo}
          disabled={adding || !newText.trim()}
          className="shrink-0 bg-[#00d97e] text-white p-1.5 rounded-md hover:opacity-90 disabled:opacity-50"
        >
          {adding ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
        </button>
      </div>
      <div className="divide-y max-h-[280px] overflow-y-auto" style={{ borderColor }}>
        {loading ? (
          <div className={`px-4 py-6 text-center text-xs ${textSecondary}`}>Memuat...</div>
        ) : todos.length === 0 ? (
          <div className={`px-4 py-6 text-center text-xs ${textSecondary}`}>Belum ada tugas</div>
        ) : (
          todos.map((todo) => (
            <div key={todo.id} className={`px-4 py-3 flex items-center gap-3 ${rowHover} transition-colors`}>
              <button
                onClick={() => toggleTodo(todo.id, todo.done)}
                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                  todo.done ? "bg-[#00d97e] border-[#00d97e]" : isDark ? "border-gray-600" : "border-gray-300"
                }`}
              >
                {todo.done && <Check className="h-3 w-3 text-white" />}
              </button>
              <span className={`flex-1 text-xs min-w-0 truncate ${todo.done ? "line-through opacity-50" : ""} ${textPrimary}`}>
                {todo.text}
              </span>
              {todo.label_text && (
                <span
                  className="text-[10px] font-bold px-2 py-0.5 rounded-full text-white shrink-0"
                  style={{ backgroundColor: todo.label_color || "#007bff" }}
                >
                  {todo.label_text}
                </span>
              )}
              <button onClick={() => removeTodo(todo.id)} className={`p-1 rounded shrink-0 ${textSecondary} hover:text-red-400 transition-colors`}>
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
