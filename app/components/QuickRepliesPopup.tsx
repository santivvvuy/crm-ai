"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { QuickReply } from "@/lib/types";

interface Props {
  onSelect: (text: string) => void;
  onClose: () => void;
}

type Mode = "list" | "add" | { edit: QuickReply };

export function QuickRepliesPopup({ onSelect, onClose }: Props) {
  const [replies, setReplies] = useState<QuickReply[]>([]);
  const [mode, setMode] = useState<Mode>("list");

  // Form fields (shared for add and edit)
  const [formTitle, setFormTitle] = useState("");
  const [formBody, setFormBody] = useState("");
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

  function openAdd() {
    setFormTitle("");
    setFormBody("");
    setMode("add");
  }

  function openEdit(reply: QuickReply) {
    setFormTitle(reply.title);
    setFormBody(reply.body);
    setMode({ edit: reply });
  }

  function cancelForm() {
    setMode("list");
    setFormTitle("");
    setFormBody("");
  }

  async function saveForm() {
    if (!formTitle.trim() || !formBody.trim()) return;
    setSaving(true);

    if (mode === "add") {
      const { data } = await supabase
        .from("quick_replies")
        .insert({ title: formTitle.trim(), body: formBody.trim() })
        .select()
        .single();
      if (data) setReplies((prev) => [...prev, data]);
    } else if (typeof mode === "object" && "edit" in mode) {
      const { data } = await supabase
        .from("quick_replies")
        .update({ title: formTitle.trim(), body: formBody.trim() })
        .eq("id", mode.edit.id)
        .select()
        .single();
      if (data) {
        setReplies((prev) => prev.map((r) => (r.id === data.id ? data : r)));
      }
    }

    setSaving(false);
    cancelForm();
  }

  async function deleteReply(id: string) {
    await supabase.from("quick_replies").delete().eq("id", id);
    setReplies((prev) => prev.filter((r) => r.id !== id));
  }

  const isEditing = typeof mode === "object" && "edit" in mode;
  const showForm = mode === "add" || isEditing;

  return (
    <div className="absolute bottom-full left-0 right-0 mb-2 rounded-2xl bg-[#0a1628] border border-[#1a2d4a] shadow-2xl shadow-black/60 overflow-hidden z-40">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-[#1a2d4a]">
        <span className="text-xs font-semibold text-[#e2e8f0]">
          {mode === "add" ? "Nueva respuesta" : isEditing ? "Editar respuesta" : "Respuestas rápidas"}
        </span>
        <div className="flex items-center gap-1.5">
          {mode === "list" ? (
            <>
              <button
                onClick={openAdd}
                className="rounded-lg px-2.5 py-1 text-[10px] font-semibold bg-blue-600 text-white hover:bg-blue-500 transition-colors"
              >
                + Nueva
              </button>
              <button onClick={onClose} className="rounded-lg p-1 text-[#4a6fa5] hover:text-[#60a5fa] transition-colors">
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </>
          ) : (
            <button onClick={cancelForm} className="rounded-lg p-1 text-[#4a6fa5] hover:text-[#60a5fa] transition-colors">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Add / Edit form */}
      {showForm && (
        <div className="px-3 py-2.5 space-y-2">
          <input
            type="text"
            placeholder="Título (ej: Saludo inicial)"
            value={formTitle}
            onChange={(e) => setFormTitle(e.target.value)}
            autoFocus
            className="w-full rounded-lg bg-[#0d1f35] border border-[#1a2d4a] px-3 py-1.5 text-sm text-[#e2e8f0] placeholder-[#2d4a6e] outline-none focus:border-blue-500/50"
          />
          <textarea
            placeholder="Texto del mensaje..."
            value={formBody}
            onChange={(e) => setFormBody(e.target.value)}
            rows={3}
            onKeyDown={(e) => {
              if (e.key === "Enter" && e.metaKey) saveForm();
            }}
            className="w-full rounded-lg bg-[#0d1f35] border border-[#1a2d4a] px-3 py-1.5 text-sm text-[#e2e8f0] placeholder-[#2d4a6e] outline-none focus:border-blue-500/50 resize-none"
          />
          <div className="flex gap-2">
            <button
              onClick={cancelForm}
              className="flex-1 rounded-lg bg-[#0d1f35] border border-[#1a2d4a] py-1.5 text-xs font-semibold text-[#4a6fa5] hover:bg-[#112240] transition-all"
            >
              Cancelar
            </button>
            <button
              onClick={saveForm}
              disabled={saving || !formTitle.trim() || !formBody.trim()}
              className="flex-1 rounded-lg bg-blue-600 py-1.5 text-xs font-semibold text-white hover:bg-blue-500 disabled:opacity-40 transition-all"
            >
              {saving ? "Guardando..." : isEditing ? "Guardar cambios" : "Agregar"}
            </button>
          </div>
        </div>
      )}

      {/* Reply list */}
      {mode === "list" && (
        <div className="max-h-56 overflow-y-auto">
          {replies.length === 0 && (
            <p className="px-4 py-4 text-xs text-[#2d4a6e] text-center">
              No hay respuestas. Creá una con &quot;+ Nueva&quot;.
            </p>
          )}
          {replies.map((reply) => (
            <div
              key={reply.id}
              className="flex items-start gap-1 px-3 py-2.5 hover:bg-[#0d1f35] group transition-colors border-b border-[#0d1f35] last:border-0"
            >
              {/* Click to use */}
              <button
                onClick={() => { onSelect(reply.body); onClose(); }}
                className="flex-1 text-left min-w-0"
              >
                <p className="text-xs font-semibold text-blue-400">{reply.title}</p>
                <p className="text-xs text-[#94a3b8] line-clamp-2 mt-0.5">{reply.body}</p>
              </button>

              {/* Edit button */}
              <button
                onClick={(e) => { e.stopPropagation(); openEdit(reply); }}
                title="Editar"
                className="opacity-0 group-hover:opacity-100 shrink-0 mt-0.5 rounded p-1 text-[#2d4a6e] hover:text-blue-400 transition-all"
              >
                <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                </svg>
              </button>

              {/* Delete button */}
              <button
                onClick={(e) => { e.stopPropagation(); deleteReply(reply.id); }}
                title="Eliminar"
                className="opacity-0 group-hover:opacity-100 shrink-0 mt-0.5 rounded p-1 text-[#2d4a6e] hover:text-red-400 transition-all"
              >
                <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
