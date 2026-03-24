"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Contact } from "@/lib/types";

interface SearchResult {
  contact: Contact;
  messageSnippet?: string;
  matchType: "contact" | "message";
}

interface Props {
  contacts: Contact[];
  onOpenChat: (contactId: string) => void;
  onClose: () => void;
}

export function GlobalSearch({ contacts, onOpenChat, onClose }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Close on Escape
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  // Debounced search
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    const timeout = setTimeout(async () => {
      setSearching(true);

      // Match contacts by name or phone
      const contactMatches: SearchResult[] = contacts
        .filter(
          (c) =>
            c.name.toLowerCase().includes(query.toLowerCase()) ||
            c.phone.includes(query)
        )
        .map((c) => ({ contact: c, matchType: "contact" as const }));

      // Match messages by text
      const { data: msgData } = await supabase
        .from("messages")
        .select("id, text, contact_id")
        .ilike("text", `%${query}%`)
        .order("created_at", { ascending: false })
        .limit(15);

      const seenIds = new Set(contactMatches.map((r) => r.contact.id));
      const messageMatches: SearchResult[] = [];

      for (const msg of msgData ?? []) {
        if (seenIds.has(msg.contact_id)) continue;
        const contact = contacts.find((c) => c.id === msg.contact_id);
        if (!contact) continue;
        seenIds.add(msg.contact_id);
        messageMatches.push({
          contact,
          messageSnippet: msg.text,
          matchType: "message",
        });
      }

      setResults([...contactMatches, ...messageMatches]);
      setSearching(false);
    }, 250);

    return () => clearTimeout(timeout);
  }, [query, contacts]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[12vh] bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg mx-4 rounded-2xl bg-[#0a1628] border border-[#1a2d4a] shadow-2xl shadow-black/80 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Input */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-[#1a2d4a]">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#4a6fa5" strokeWidth="2" className="shrink-0">
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            placeholder="Buscar contactos y mensajes..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 bg-transparent text-sm text-[#e2e8f0] placeholder-[#3d5a80] outline-none"
          />
          {searching ? (
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-500 border-t-transparent shrink-0" />
          ) : (
            <kbd className="text-[10px] text-[#2d4a6e] border border-[#1a2d4a] rounded px-1.5 py-0.5">ESC</kbd>
          )}
        </div>

        {/* Results */}
        <div className="max-h-[380px] overflow-y-auto">
          {!query.trim() && (
            <div className="flex flex-col items-center justify-center py-10 gap-2">
              <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="#1e3a5f" strokeWidth="1.5">
                <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
              </svg>
              <p className="text-sm text-[#2d4a6e]">Escribí para buscar...</p>
            </div>
          )}
          {query.trim() && results.length === 0 && !searching && (
            <p className="px-4 py-8 text-center text-sm text-[#2d4a6e]">
              Sin resultados para &ldquo;{query}&rdquo;
            </p>
          )}
          {results.map((result) => (
            <button
              key={result.contact.id}
              onClick={() => { onOpenChat(result.contact.id); onClose(); }}
              className="flex w-full items-center gap-3 px-4 py-3 hover:bg-[#0d1f35] transition-colors text-left border-b border-[#0d1f35] last:border-0"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#1e3a5f] to-[#0d2444] text-sm font-semibold text-white">
                {result.contact.avatar}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[#e2e8f0] truncate">{result.contact.name}</p>
                {result.messageSnippet ? (
                  <p className="text-xs text-[#3d5a80] truncate mt-0.5">
                    <span className="text-blue-400/70">en mensaje: </span>
                    {result.messageSnippet}
                  </p>
                ) : (
                  <p className="text-xs text-[#3d5a80] mt-0.5">{result.contact.phone}</p>
                )}
              </div>
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#2d4a6e" strokeWidth="2">
                <path d="M9 18l6-6-6-6" />
              </svg>
            </button>
          ))}
        </div>

        {/* Footer */}
        <div className="px-4 py-2 border-t border-[#1a2d4a] flex items-center gap-4">
          <span className="text-[10px] text-[#2d4a6e]">
            <kbd className="border border-[#1a2d4a] rounded px-1 mr-1">↵</kbd>abrir
          </span>
          <span className="text-[10px] text-[#2d4a6e]">
            <kbd className="border border-[#1a2d4a] rounded px-1 mr-1">ESC</kbd>cerrar
          </span>
        </div>
      </div>
    </div>
  );
}
