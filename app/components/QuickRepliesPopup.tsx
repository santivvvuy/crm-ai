"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { QuickReply } from "@/lib/types";

interface Props {
  onSelect: (text: string) => void;
  onClose: () => void;
}

export function QuickRepliesPopup({ onSelect, onClose }: Props) {
  const [replies, setReplies] = useState<QuickReply[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newBody, setNewBody] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase
      .from("quick_replies")
      .select("*")
      .order("created_at")
      .then(({ data }) => {
        if (data) setReplies(data);
      });
  }, []);

  async function addReply() {
    if (!newTitle.trim() || !newBody.trim()) return;
    setSaving(true);
    const { data } = await supabase
      .from("quick_replies")
      .insert({ title: newTitle.trim(), body: newBody.trim() })
      .select()
      .single();
    if (data) {
      setReplies((prev) => [...prev, data]);
      setNewTitle("");
      setNewBody("");
      setShowAdd(false);
    }
    setSaving(false);
  }

  async function deleteReply(id: string) {
    await supabase.from("quick_replies").delete().eq("id", id);
    setReplies((prev) => prev.filter((r) => r.id !== id));
  }

  return (
    <div className="absolute bottom-full left-0 right-0 mb-2 rounded-2xl bg-[#0a1628] border border-[#1a2d4a] shadow-2xl shadow-black/60 overflow-hidden z-40">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-[#1a2d4a]">
        <span className="text-xs font-semibold text-[#e2e8f0]">Respuestas rápidas</span>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setShowAdd((v) => !v)}
            className="rounded-lg px-2.5 py-1 text-[10px] font-semibold bg-blue-600 text-white hover:bg-blue-500 transition-colors"
          >
            + Nueva
          </button>
          <button onClick={onClose} className="rounded-lg p-1 text-[#4a6fa5] hover:text-[#60a5fa] transition-colors">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* New reply form */}
      {showAdd && (
        <div className="px-3 py-2.5 border-b border-[#1a2d4a] space-y-2">
          <input
            type="text"
            placeholder="Título (ej: Saludo inicial)"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            className="w-full rounded-lg bg-[#0d1f35] border border-[#1a2d4a] px-3 py-1.5 text-sm text-[#e2e8f0] placeholder-[#2d4a6e] outline-none focus:border-blue-500/50"
          />
          <textarea
            placeholder="Texto del mensaje..."
            value={newBody}
            onChange={(e) => setNewBody(e.target.value)}
            rows={2}
            className="w-full rounded-lg bg-[#0d1f35] border border-[#1a2d4a] px-3 py-1.5 text-sm text-[#e2e8f0] placeholder-[#2d4a6e] outline-none focus:border-blue-500/50 resize-none"
          />
          <button
            onClick={addReply}
            disabled={saving || !newTitle.trim() || !newBody.trim()}
            className="w-full rounded-lg bg-blue-600 py-1.5 text-xs font-semibold text-white hover:bg-blue-500 disabled:opacity-40 transition-all"
          >
            {saving ? "Guardando..." : "Guardar respuesta"}
          </button>
        </div>
      )}

      {/* Reply list */}
      <div className="max-h-56 overflow-y-auto">
        {replies.length === 0 && (
          <p className="px-4 py-4 text-xs text-[#2d4a6e] text-center">
            No hay respuestas. Creá una con &quot;+ Nueva&quot;.
          </p>
        )}
        {replies.map((reply) => (
          <div
            key={reply.id}
            className="flex items-start gap-2 px-3 py-2.5 hover:bg-[#0d1f35] group transition-colors border-b border-[#0d1f35] last:border-0"
          >
            <button
              onClick={() => { onSelect(reply.body); onClose(); }}
              className="flex-1 text-left min-w-0"
            >
              <p className="text-xs font-semibold text-blue-400">{reply.title}</p>
              <p className="text-xs text-[#94a3b8] line-clamp-2 mt-0.5">{reply.body}</p>
            </button>
            <button
              onClick={() => deleteReply(reply.id)}
              title="Eliminar"
              className="opacity-0 group-hover:opacity-100 shrink-0 mt-0.5 rounded p-0.5 text-[#2d4a6e] hover:text-red-400 transition-all"
            >
              <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
