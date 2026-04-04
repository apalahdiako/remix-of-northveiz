import { useState } from "react";
import { Check, Trash2 } from "lucide-react";

interface TodoItem {
  id: string;
  text: string;
  done: boolean;
  label?: { text: string; color: string };
}

const INITIAL_TODOS: TodoItem[] = [
  { id: "1", text: "Review pesanan baru", done: false, label: { text: "Urgent", color: "#ff3d71" } },
  { id: "2", text: "Update stok produk", done: false, label: { text: "2 Days", color: "#00d97e" } },
  { id: "3", text: "Balas chat pelanggan", done: false, label: { text: "3 Minutes", color: "#ffaa00" } },
  { id: "4", text: "Kirim broadcast email", done: false, label: { text: "not important", color: "#007bff" } },
  { id: "5", text: "Cek laporan bulanan", done: false, label: { text: "Tomorrow", color: "#00d97e" } },
];

export default function AdminTodoList({ isDark }: { isDark: boolean }) {
  const [todos, setTodos] = useState<TodoItem[]>(INITIAL_TODOS);

  const toggleTodo = (id: string) => {
    setTodos((prev) => prev.map((t) => t.id === id ? { ...t, done: !t.done } : t));
  };

  const removeTodo = (id: string) => {
    setTodos((prev) => prev.filter((t) => t.id !== id));
  };

  const cardBg = isDark ? "bg-[#1a1d27] border-[#2a2d37]" : "bg-white border-gray-200";
  const textPrimary = isDark ? "text-white" : "text-gray-900";
  const textSecondary = isDark ? "text-gray-400" : "text-gray-500";
  const rowHover = isDark ? "hover:bg-white/5" : "hover:bg-gray-50";
  const borderColor = isDark ? "#2a2d37" : "#e5e7eb";

  return (
    <div className={`rounded-xl border ${cardBg}`}>
      <div className="px-5 py-3 border-b" style={{ borderColor }}>
        <h3 className={`text-sm font-semibold uppercase tracking-wider ${textSecondary}`}>Todo List</h3>
      </div>
      <div className="divide-y" style={{ borderColor }}>
        {todos.map((todo) => (
          <div key={todo.id} className={`px-4 py-3 flex items-center gap-3 ${rowHover} transition-colors`}>
            <button
              onClick={() => toggleTodo(todo.id)}
              className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                todo.done
                  ? "bg-[#00d97e] border-[#00d97e]"
                  : isDark ? "border-gray-600" : "border-gray-300"
              }`}
            >
              {todo.done && <Check className="h-3 w-3 text-white" />}
            </button>
            <span className={`flex-1 text-sm ${todo.done ? "line-through opacity-50" : ""} ${textPrimary}`}>
              {todo.text}
            </span>
            {todo.label && (
              <span
                className="text-[10px] font-bold px-2 py-0.5 rounded-full text-white shrink-0"
                style={{ backgroundColor: todo.label.color }}
              >
                {todo.label.text}
              </span>
            )}
            <button onClick={() => removeTodo(todo.id)} className={`p-1 rounded ${textSecondary} hover:text-red-400 transition-colors`}>
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
