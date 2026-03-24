"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Contact, ContactNote, ConversationStatus, Label } from "@/lib/types";

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
  labels: Label[];
  onBack: () => void;
  onOpenChat: (contact: Contact) => void;
  onContactUpdated: (updated: Contact) => void;
}

export function ContactDetail({ contact, labels, onBack, onOpenChat, onContactUpdated }: Props) {
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(contact.name);
  const [editPhone, setEditPhone] = useState(contact.phone);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  // Notes
  const [notes, setNotes] = useState<ContactNote[]>([]);
  const [newNote, setNewNote] = useState("");
  const [savingNote, setSavingNote] = useState(false);
  const [loadingNotes, setLoadingNotes] = useState(true);

  useEffect(() => {
    setEditName(contact.name);
    setEditPhone(contact.phone);
    setEditing(false);
    setSaveError("");
  }, [contact.id, contact.name, contact.phone]);

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

  async function handleSave() {
    const name = editName.trim();
    const phone = editPhone.trim().replace(/[^0-9]/g, "");
    if (!name) { setSaveError("El nombre es obligatorio"); return; }
    if (!phone || phone.length < 8) { setSaveError("Teléfono inválido"); return; }

    setSaving(true);
    setSaveError("");

    const { error } = await supabase
      .from("contacts")
      .update({ name, phone })
      .eq("id", contact.id);

    setSaving(false);

    if (error) {
      setSaveError("Error al guardar");
      return;
    }

    onContactUpdated({ ...contact, name, phone });
    setEditing(false);
  }

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
    <div className="flex flex-col h-full bg-[#060d1a]">
      {/* Header */}
      <div className="flex h-16 items-center gap-3 border-b border-[#1a2d4a] bg-[#0a1628] px-4 shrink-0">
        <button
          onClick={onBack}
          className="rounded-lg p-1.5 text-[#4a6fa5] hover:bg-[#112240] hover:text-[#60a5fa] transition-colors"
        >
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M15 18l-6-6 6-6"/>
          </svg>
        </button>
        <span className="text-sm font-semibold text-[#e2e8f0] flex-1">Detalle del contacto</span>

        {/* Open chat button */}
        <button
          onClick={() => onOpenChat(contact)}
          className="flex items-center gap-2 rounded-xl bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-500 transition-all"
        >
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
          Abrir chat
        </button>

        {/* Edit toggle */}
        {!editing ? (
          <button
            onClick={() => setEditing(true)}
            className="rounded-xl p-2 text-[#4a6fa5] hover:bg-[#112240] hover:text-blue-400 transition-colors"
            title="Editar contacto"
          >
            <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
          </button>
        ) : (
          <button
            onClick={() => { setEditing(false); setEditName(contact.name); setEditPhone(contact.phone); setSaveError(""); }}
            className="rounded-xl p-2 text-[#4a6fa5] hover:bg-[#112240] hover:text-red-400 transition-colors"
            title="Cancelar edición"
          >
            <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">

        {/* Avatar + Name section */}
        <div className="flex flex-col items-center px-6 py-8 border-b border-[#1a2d4a]">
          <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 text-2xl font-bold text-white shadow-lg shadow-blue-900/30 mb-4">
            {contact.avatar}
          </div>

          {editing ? (
            <div className="w-full max-w-xs space-y-3">
              <div>
                <label className="text-[10px] font-semibold uppercase tracking-wider text-[#2d4a6e] block mb-1">
                  Nombre
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  autoFocus
                  className="w-full rounded-xl bg-[#0d1f35] border border-[#1a2d4a] px-4 py-2.5 text-sm text-[#e2e8f0] outline-none focus:border-blue-500/50 text-center"
                />
              </div>
              <div>
                <label className="text-[10px] font-semibold uppercase tracking-wider text-[#2d4a6e] block mb-1">
                  Teléfono
                </label>
                <input
                  type="tel"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") handleSave(); }}
                  className="w-full rounded-xl bg-[#0d1f35] border border-[#1a2d4a] px-4 py-2.5 text-sm text-[#e2e8f0] outline-none focus:border-blue-500/50 text-center"
                />
              </div>
              {saveError && <p className="text-[11px] text-red-400 text-center">{saveError}</p>}
              <button
                onClick={handleSave}
                disabled={saving}
                className="w-full rounded-xl bg-blue-600 py-2.5 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-50 transition-all"
              >
                {saving ? "Guardando..." : "Guardar cambios"}
              </button>
            </div>
          ) : (
            <>
              <h2 className="text-xl font-bold text-[#e2e8f0]">{contact.name}</h2>
              <p className="text-sm text-[#4a6fa5] mt-1">{contact.phone}</p>
            </>
          )}
        </div>

        {/* Info cards */}
        <div className="px-4 py-4 space-y-3">

          {/* Status */}
          <div className="rounded-xl bg-[#0a1628] border border-[#1a2d4a] px-4 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[#2d4a6e] mb-2">Estado</p>
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: STATUS_COLORS[contact.conversationStatus] }} />
              <span className="text-sm font-medium text-[#e2e8f0]">{STATUS_LABELS[contact.conversationStatus]}</span>
            </div>
          </div>

          {/* AI */}
          <div className="rounded-xl bg-[#0a1628] border border-[#1a2d4a] px-4 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[#2d4a6e] mb-2">Respuesta IA</p>
            <div className="flex items-center gap-2">
              <span className={`text-sm font-medium ${contact.aiEnabled ? "text-blue-400" : "text-[#4a6fa5]"}`}>
                {contact.aiEnabled ? "🤖 Activa — El bot responde automáticamente" : "👤 Manual — Modo manual activo"}
              </span>
            </div>
          </div>

          {/* Labels */}
          {labels.length > 0 && (
            <div className="rounded-xl bg-[#0a1628] border border-[#1a2d4a] px-4 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[#2d4a6e] mb-2">Etiquetas</p>
              {contact.labels.length === 0 ? (
                <p className="text-sm text-[#2d4a6e]">Sin etiquetas</p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {contact.labels.map((label) => (
                    <span
                      key={label.id}
                      className="text-[11px] font-semibold px-2.5 py-1 rounded-full"
                      style={{ backgroundColor: label.color + "33", color: label.color }}
                    >
                      {label.name}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Notes */}
          <div className="rounded-xl bg-[#0a1628] border border-[#1a2d4a] px-4 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[#2d4a6e] mb-3">Notas internas</p>

            {/* Add note */}
            <div className="space-y-2 mb-3">
              <textarea
                placeholder="Escribir nota interna..."
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                rows={2}
                onKeyDown={(e) => { if (e.key === "Enter" && e.metaKey) addNote(); }}
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
              <div className="flex justify-center py-3">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
              </div>
            ) : notes.length === 0 ? (
              <p className="text-xs text-[#2d4a6e] text-center py-2">Sin notas aún</p>
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
                          <path d="M18 6L6 18M6 6l12 12"/>
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
    </div>
  );
}
