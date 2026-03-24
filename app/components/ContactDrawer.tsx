"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Contact, ContactNote, ConversationStatus } from "@/lib/types";

const STATUS_LABELS: Record<ConversationStatus, string> = {
  open: "Abierta",
  pending: "Pendiente",
  resolved: "Resuelta",
};

const STATUS_COLORS: Record<ConversationStatus, string> = {
  open: "#22c55e",
  pending: "#eab308",
  resolved: "#6b7280",
};

interface Props {
  contact: Contact;
  onClose: () => void;
  onStatusChange: (status: ConversationStatus) => void;
  onAIToggle: () => void;
}

export function ContactDrawer({ contact, onClose, onStatusChange, onAIToggle }: Props) {
  const [notes, setNotes] = useState<ContactNote[]>([]);
  const [newNote, setNewNote] = useState("");
  const [savingNote, setSavingNote] = useState(false);
  const [loadingNotes, setLoadingNotes] = useState(true);

  useEffect(() => {
    setLoadingNotes(true);
    supabase
      .from("contact_notes")
      .select("*")
      .eq("contact_id", contact.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        if (data) setNotes(data);
        setLoadingNotes(false);
      });
  }, [contact.id]);

  async function addNote() {
    const body = newNote.trim();
    if (!body) return;
    setSavingNote(true);
    const { data } = await supabase
      .from("contact_notes")
      .insert({ contact_id: contact.id, body })
      .select()
      .single();
    if (data) {
      setNotes((prev) => [data, ...prev]);
      setNewNote("");
    }
    setSavingNote(false);
  }

  async function deleteNote(id: string) {
    await supabase.from("contact_notes").delete().eq("id", id);
    setNotes((prev) => prev.filter((n) => n.id !== id));
  }

  function formatNoteDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString("es", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return (
    <>
      {/* Backdrop (mobile only) */}
      <div
        className="fixed inset-0 bg-black/40 z-30 md:hidden"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed right-0 top-0 bottom-0 w-full md:w-[320px] bg-[#0a1628] border-l border-[#1a2d4a] shadow-2xl z-40 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex h-16 items-center justify-between px-5 border-b border-[#1a2d4a] shrink-0">
          <span className="text-sm font-semibold text-[#e2e8f0]">Detalle del contacto</span>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-[#4a6fa5] hover:bg-[#112240] hover:text-[#60a5fa] transition-colors"
          >
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* Contact info */}
          <div className="flex flex-col items-center px-5 py-6 border-b border-[#1a2d4a]">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 text-xl font-bold text-white shadow-lg shadow-blue-900/30 mb-3">
              {contact.avatar}
            </div>
            <h3 className="text-base font-semibold text-[#e2e8f0]">{contact.name}</h3>
            <p className="text-sm text-[#3d5a80] mt-0.5">{contact.phone}</p>

            {/* Labels */}
            {contact.labels.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-3 justify-center">
                {contact.labels.map((label) => (
                  <span
                    key={label.id}
                    className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: label.color + "33", color: label.color }}
                  >
                    {label.name}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Status + AI */}
          <div className="px-5 py-4 border-b border-[#1a2d4a] space-y-3">
            {/* Conversation status */}
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[#2d4a6e] mb-2">
                Estado de conversación
              </p>
              <div className="flex gap-1.5">
                {(["open", "pending", "resolved"] as ConversationStatus[]).map((s) => (
                  <button
                    key={s}
                    onClick={() => onStatusChange(s)}
                    className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg py-1.5 text-[10px] font-semibold border transition-all ${
                      contact.conversationStatus === s
                        ? "text-white border-transparent"
                        : "bg-[#0d1f35] text-[#4a6fa5] border-[#1a2d4a] hover:border-[#2d4a6e]"
                    }`}
                    style={
                      contact.conversationStatus === s
                        ? { backgroundColor: STATUS_COLORS[s], borderColor: STATUS_COLORS[s] }
                        : {}
                    }
                  >
                    <span
                      className="h-1.5 w-1.5 rounded-full"
                      style={{
                        backgroundColor:
                          contact.conversationStatus === s ? "rgba(255,255,255,0.8)" : STATUS_COLORS[s],
                      }}
                    />
                    {STATUS_LABELS[s]}
                  </button>
                ))}
              </div>
            </div>

            {/* AI toggle */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[#e2e8f0] font-medium">Respuesta con IA</p>
                <p className="text-xs text-[#3d5a80]">
                  {contact.aiEnabled ? "El bot responde automáticamente" : "Modo manual activo"}
                </p>
              </div>
              <button
                onClick={onAIToggle}
                className={`relative h-6 w-11 rounded-full transition-colors ${
                  contact.aiEnabled ? "bg-blue-600" : "bg-[#1a2d4a]"
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
                    contact.aiEnabled ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Notes */}
          <div className="px-5 py-4">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[#2d4a6e] mb-3">
              Notas internas
            </p>

            {/* Add note */}
            <div className="space-y-2 mb-4">
              <textarea
                placeholder="Escribir nota interna..."
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                rows={2}
                className="w-full rounded-xl bg-[#0d1f35] border border-[#1a2d4a] px-3 py-2 text-sm text-[#e2e8f0] placeholder-[#2d4a6e] outline-none focus:border-blue-500/50 resize-none transition-colors"
              />
              <button
                onClick={addNote}
                disabled={savingNote || !newNote.trim()}
                className="w-full rounded-lg bg-[#112240] border border-[#1e3a5f] py-1.5 text-xs font-semibold text-[#60a5fa] hover:bg-[#1a2d4a] disabled:opacity-40 transition-all"
              >
                {savingNote ? "Guardando..." : "Agregar nota"}
              </button>
            </div>

            {/* Notes list */}
            {loadingNotes ? (
              <div className="flex justify-center py-4">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
              </div>
            ) : notes.length === 0 ? (
              <p className="text-xs text-[#2d4a6e] text-center py-3">Sin notas aún</p>
            ) : (
              <div className="space-y-2">
                {notes.map((note) => (
                  <div
                    key={note.id}
                    className="group rounded-xl bg-[#0d1f35] border border-[#1a2d4a] px-3 py-2.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-xs text-[#cbd5e1] leading-relaxed flex-1">{note.body}</p>
                      <button
                        onClick={() => deleteNote(note.id)}
                        className="opacity-0 group-hover:opacity-100 shrink-0 rounded p-0.5 text-[#2d4a6e] hover:text-red-400 transition-all"
                      >
                        <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M18 6L6 18M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                    <p className="text-[10px] text-[#2d4a6e] mt-1.5">{formatNoteDate(note.created_at)}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
