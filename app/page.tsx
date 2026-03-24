"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";

// ─── Types ────────────────────────────────────────────────────────────────────

type Label = {
  id: string;
  name: string;
  color: string;
};

type Contact = {
  id: string;
  name: string;
  phone: string;
  avatar: string;
  lastMessage: string;
  time: string;
  unread: number;
  online: boolean;
  aiEnabled: boolean;
  labels: Label[];
};

type Message = {
  id: string;
  text: string;
  time: string;
  fromMe: boolean;
  status: "sent" | "delivered" | "read";
};

// ─── Constants ────────────────────────────────────────────────────────────────

const LABEL_COLORS = [
  "#ef4444", // rojo
  "#f97316", // naranja
  "#eab308", // amarillo
  "#22c55e", // verde
  "#3b82f6", // azul
  "#8b5cf6", // violeta
  "#ec4899", // rosa
  "#6b7280", // gris
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function formatTime(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit" });
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function Home() {
  // Core state
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);

  // Navigation
  const [mobileView, setMobileView] = useState<"list" | "chat">("list");
  const [sidebarTab, setSidebarTab] = useState<"chats" | "contactos">("chats");

  // Labels
  const [labels, setLabels] = useState<Label[]>([]);
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [showLabelDropdown, setShowLabelDropdown] = useState(false);
  const [newLabelName, setNewLabelName] = useState("");
  const [newLabelColor, setNewLabelColor] = useState(LABEL_COLORS[4]);
  const [savingLabel, setSavingLabel] = useState(false);
  const labelDropdownRef = useRef<HTMLDivElement>(null);

  // New contact form
  const [showNewContact, setShowNewContact] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [savingContact, setSavingContact] = useState(false);
  const [contactError, setContactError] = useState("");

  // Swipe gesture
  const [swipeDelta, setSwipeDelta] = useState(0);
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const isSwiping = useRef(false);

  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // ─── Touch handlers ─────────────────────────────────────────────────────────

  function handleTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    isSwiping.current = false;
  }

  function handleTouchMove(e: React.TouchEvent) {
    if (touchStartX.current === null || touchStartY.current === null) return;
    const dx = e.touches[0].clientX - touchStartX.current;
    const dy = e.touches[0].clientY - touchStartY.current;
    if (!isSwiping.current && Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
    if (!isSwiping.current) {
      if (Math.abs(dx) < Math.abs(dy)) return;
      isSwiping.current = true;
    }
    if (dx > 0) {
      e.preventDefault();
      setSwipeDelta(Math.min(dx, window.innerWidth));
    }
  }

  function handleTouchEnd() {
    if (swipeDelta > 80) setMobileView("list");
    setSwipeDelta(0);
    touchStartX.current = null;
    touchStartY.current = null;
    isSwiping.current = false;
  }

  // ─── AI toggle ──────────────────────────────────────────────────────────────

  async function toggleAI(contact: Contact) {
    const newValue = !contact.aiEnabled;
    setContacts((prev) =>
      prev.map((c) => (c.id === contact.id ? { ...c, aiEnabled: newValue } : c))
    );
    setSelectedContact((prev) =>
      prev?.id === contact.id ? { ...prev, aiEnabled: newValue } : prev
    );
    const { error } = await supabase
      .from("contacts")
      .update({ ai_enabled: newValue })
      .eq("id", contact.id);
    if (error) {
      setContacts((prev) =>
        prev.map((c) => (c.id === contact.id ? { ...c, aiEnabled: !newValue } : c))
      );
      setSelectedContact((prev) =>
        prev?.id === contact.id ? { ...prev, aiEnabled: !newValue } : prev
      );
    }
  }

  // ─── Label actions ──────────────────────────────────────────────────────────

  async function createLabel() {
    const name = newLabelName.trim();
    if (!name) return;
    setSavingLabel(true);
    const { data, error } = await supabase
      .from("labels")
      .insert({ name, color: newLabelColor })
      .select()
      .single();
    setSavingLabel(false);
    if (error || !data) return;
    const label: Label = { id: data.id, name: data.name, color: data.color };
    setLabels((prev) => [...prev, label]);
    setNewLabelName("");
    setNewLabelColor(LABEL_COLORS[4]);
  }

  async function toggleContactLabel(contact: Contact, label: Label) {
    const hasLabel = contact.labels.some((l) => l.id === label.id);

    // Optimistic update
    const updatedLabels = hasLabel
      ? contact.labels.filter((l) => l.id !== label.id)
      : [...contact.labels, label];

    const applyUpdate = (c: Contact) =>
      c.id === contact.id ? { ...c, labels: updatedLabels } : c;

    setContacts((prev) => prev.map(applyUpdate));
    setSelectedContact((prev) => (prev?.id === contact.id ? { ...prev, labels: updatedLabels } : prev));

    if (hasLabel) {
      await supabase
        .from("contact_labels")
        .delete()
        .eq("contact_id", contact.id)
        .eq("label_id", label.id);
    } else {
      await supabase
        .from("contact_labels")
        .insert({ contact_id: contact.id, label_id: label.id });
    }
  }

  async function deleteLabel(labelId: string) {
    await supabase.from("labels").delete().eq("id", labelId);
    setLabels((prev) => prev.filter((l) => l.id !== labelId));
    setContacts((prev) =>
      prev.map((c) => ({ ...c, labels: c.labels.filter((l) => l.id !== labelId) }))
    );
    setSelectedContact((prev) =>
      prev ? { ...prev, labels: prev.labels.filter((l) => l.id !== labelId) } : prev
    );
    if (activeFilter === labelId) setActiveFilter(null);
  }

  // ─── Add contact ────────────────────────────────────────────────────────────

  async function handleAddContact() {
    const name = newName.trim();
    const phone = newPhone.trim().replace(/[^0-9]/g, "");
    if (!name || !phone) { setContactError("Nombre y teléfono son obligatorios"); return; }
    if (phone.length < 8) { setContactError("Teléfono inválido"); return; }

    const existing = contacts.find((c) => c.phone === phone);
    if (existing) {
      setSelectedContact(existing);
      setSidebarTab("chats");
      setMobileView("chat");
      setShowNewContact(false);
      setNewName(""); setNewPhone(""); setContactError("");
      return;
    }

    setSavingContact(true);
    setContactError("");
    const { data, error } = await supabase
      .from("contacts")
      .insert({ name, phone, ai_enabled: true })
      .select()
      .single();
    setSavingContact(false);

    if (error || !data) { setContactError("Error al crear contacto"); return; }

    const newContact: Contact = {
      id: data.id, name: data.name, phone: data.phone,
      avatar: getInitials(data.name), lastMessage: "", time: "",
      unread: 0, online: false, aiEnabled: data.ai_enabled ?? true, labels: [],
    };

    setContacts((prev) => [...prev, newContact].sort((a, b) => a.name.localeCompare(b.name)));
    setSelectedContact(newContact);
    setSidebarTab("chats");
    setMobileView("chat");
    setShowNewContact(false);
    setNewName(""); setNewPhone(""); setContactError("");
  }

  // ─── Data loading ────────────────────────────────────────────────────────────

  // Load labels
  useEffect(() => {
    supabase.from("labels").select("*").order("created_at").then(({ data }) => {
      if (data) setLabels(data.map((l) => ({ id: l.id, name: l.name, color: l.color })));
    });
  }, []);

  // Load contacts (with their labels via join)
  useEffect(() => {
    async function fetchContacts() {
      const { data, error } = await supabase
        .from("contacts")
        .select(`
          id, name, phone, last_message, last_message_time, unread_count, online, ai_enabled,
          contact_labels ( label_id, labels ( id, name, color ) )
        `)
        .order("name");

      if (error) { setLoading(false); return; }

      const mapped: Contact[] = (data ?? []).map((row) => ({
        id: row.id,
        name: row.name ?? "",
        phone: row.phone ?? "",
        avatar: getInitials(row.name ?? ""),
        lastMessage: row.last_message ?? "",
        time: row.last_message_time ?? "",
        unread: row.unread_count ?? 0,
        online: row.online ?? false,
        aiEnabled: row.ai_enabled ?? true,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        labels: (row.contact_labels ?? [])
          .map((cl: any) => cl.labels)
          .filter(Boolean) as Label[],
      }));

      setContacts(mapped);
      if (mapped.length > 0) setSelectedContact(mapped[0]);
      setLoading(false);
    }
    fetchContacts();
  }, []);

  // Load messages + realtime
  useEffect(() => {
    if (!selectedContact) return;
    setMessages([]);
    let cancelled = false;

    async function fetchMessages() {
      setLoadingMessages(true);
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("contact_id", selectedContact!.id)
        .order("created_at", { ascending: true });

      if (cancelled) return;
      if (error) { setLoadingMessages(false); return; }

      setMessages(
        (data ?? []).map((row) => ({
          id: row.id,
          text: row.text ?? row.content ?? "",
          time: formatTime(row.created_at),
          fromMe: row.direction === "outbound",
          status: row.status ?? "delivered",
        }))
      );
      setLoadingMessages(false);
    }

    fetchMessages();

    const channel = supabase
      .channel(`messages:contact_id=eq.${selectedContact.id}`)
      .on("postgres_changes", {
        event: "INSERT", schema: "public", table: "messages",
        filter: `contact_id=eq.${selectedContact.id}`,
      }, (payload) => {
        if (cancelled) return;
        const row = payload.new;
        const incoming: Message = {
          id: row.id,
          text: row.text ?? row.content ?? "",
          time: formatTime(row.created_at),
          fromMe: row.direction === "outbound",
          status: row.status ?? "delivered",
        };
        setMessages((prev) => prev.some((m) => m.id === incoming.id) ? prev : [...prev, incoming]);
      })
      .subscribe();

    return () => { cancelled = true; supabase.removeChannel(channel); };
  }, [selectedContact?.id]);

  // Auto-scroll
  useEffect(() => {
    const c = messagesContainerRef.current;
    if (c) c.scrollTop = c.scrollHeight;
  }, [messages]);

  // Reset unread
  useEffect(() => {
    if (!selectedContact) return;
    setContacts((prev) =>
      prev.map((c) => (c.id === selectedContact.id ? { ...c, unread: 0 } : c))
    );
    supabase.from("contacts").update({ unread_count: 0 }).eq("id", selectedContact.id);
  }, [selectedContact?.id]);

  // Close label dropdown on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (labelDropdownRef.current && !labelDropdownRef.current.contains(e.target as Node)) {
        setShowLabelDropdown(false);
      }
    }
    if (showLabelDropdown) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showLabelDropdown]);

  // ─── Send message ────────────────────────────────────────────────────────────

  async function handleSend() {
    const text = inputValue.trim();
    if (!text || !selectedContact) return;
    setInputValue("");

    const optimisticMsg: Message = {
      id: crypto.randomUUID(), text,
      time: new Date().toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit" }),
      fromMe: true, status: "sent",
    };
    setMessages((prev) => [...prev, optimisticMsg]);

    const { data, error } = await supabase
      .from("messages")
      .insert({ contact_id: selectedContact.id, text, direction: "outbound" })
      .select()
      .single();

    if (error) { setMessages((prev) => prev.filter((m) => m.id !== optimisticMsg.id)); return; }

    setMessages((prev) =>
      prev.map((m) =>
        m.id === optimisticMsg.id
          ? { ...m, id: data.id, time: formatTime(data.created_at), status: "delivered" }
          : m
      )
    );

    try {
      await fetch("https://marketphone.app.n8n.cloud/webhook/send-message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: selectedContact.phone, text }),
      });
    } catch (err) {
      console.error("Error enviando WhatsApp:", err);
    }
  }

  // ─── Derived ─────────────────────────────────────────────────────────────────

  const filteredContacts = contacts.filter((c) => {
    const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = !activeFilter || c.labels.some((l) => l.id === activeFilter);
    return matchesSearch && matchesFilter;
  });

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="flex h-[100dvh] w-screen bg-[#060d1a]">
      <div className="flex h-full w-full overflow-hidden">

        {/* ── Sidebar ─────────────────────────────────────────────────────── */}
        <aside className={`flex flex-col bg-[#0a1628] border-r border-[#1a2d4a] ${
          mobileView === "chat" ? "hidden md:flex" : "flex"
        } w-full md:w-[320px] lg:w-[380px] shrink-0`}>

          {/* Header */}
          <div className="flex h-16 items-center justify-between px-5 border-b border-[#1a2d4a]">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 text-xs font-bold text-white shadow-lg shadow-blue-900/30">
                MP
              </div>
              <span className="text-sm font-semibold text-[#e2e8f0]">MarketPhone</span>
            </div>
          </div>

          {/* Search */}
          <div className="px-4 py-3">
            <div className="flex items-center gap-2 rounded-xl bg-[#0d1f35] border border-[#1a2d4a] px-3 py-2">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#4a6fa5" strokeWidth="2" className="shrink-0">
                <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
              </svg>
              <input
                type="text"
                placeholder={sidebarTab === "chats" ? "Buscar conversación..." : "Buscar contacto..."}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-transparent text-sm text-[#94a3b8] placeholder-[#2d4a6e] outline-none"
              />
            </div>
          </div>

          {/* Tabs */}
          <div className="flex px-4 pb-2 gap-1">
            <button
              onClick={() => setSidebarTab("chats")}
              className={`flex-1 py-1.5 rounded-lg text-[11px] font-semibold uppercase tracking-wider transition-all ${
                sidebarTab === "chats"
                  ? "bg-[#112240] text-blue-400 border border-[#1e3a5f]"
                  : "text-[#2d4a6e] hover:text-[#4a6fa5]"
              }`}
            >
              Chats
            </button>
            <button
              onClick={() => setSidebarTab("contactos")}
              className={`flex-1 py-1.5 rounded-lg text-[11px] font-semibold uppercase tracking-wider transition-all ${
                sidebarTab === "contactos"
                  ? "bg-[#112240] text-blue-400 border border-[#1e3a5f]"
                  : "text-[#2d4a6e] hover:text-[#4a6fa5]"
              }`}
            >
              Contactos ({contacts.length})
            </button>
            {sidebarTab === "contactos" && (
              <button
                onClick={() => setShowNewContact(true)}
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-white hover:bg-blue-500 transition-colors"
                title="Agregar contacto"
              >
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M12 5v14M5 12h14"/>
                </svg>
              </button>
            )}
          </div>

          {/* New Contact Form */}
          {showNewContact && sidebarTab === "contactos" && (
            <div className="px-4 pb-3">
              <div className="rounded-xl bg-[#0d1f35] border border-[#1a2d4a] p-3 space-y-2">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold text-[#e2e8f0]">Nuevo contacto</span>
                  <button onClick={() => { setShowNewContact(false); setNewName(""); setNewPhone(""); setContactError(""); }} className="text-[#4a6fa5] hover:text-[#60a5fa]">
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
                  </button>
                </div>
                <input type="text" placeholder="Nombre" value={newName} onChange={(e) => setNewName(e.target.value)}
                  className="w-full rounded-lg bg-[#0a1628] border border-[#1a2d4a] px-3 py-2 text-sm text-[#e2e8f0] placeholder-[#2d4a6e] outline-none focus:border-blue-500/50" />
                <input type="tel" placeholder="Teléfono (ej: 59899123456)" value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") handleAddContact(); }}
                  className="w-full rounded-lg bg-[#0a1628] border border-[#1a2d4a] px-3 py-2 text-sm text-[#e2e8f0] placeholder-[#2d4a6e] outline-none focus:border-blue-500/50" />
                {contactError && <p className="text-[11px] text-red-400">{contactError}</p>}
                <button onClick={handleAddContact} disabled={savingContact}
                  className="w-full rounded-lg bg-blue-600 py-2 text-xs font-semibold text-white hover:bg-blue-500 active:scale-[0.98] transition-all disabled:opacity-50">
                  {savingContact ? "Guardando..." : "Agregar y abrir chat"}
                </button>
              </div>
            </div>
          )}

          {/* Label filter chips (chats tab only) */}
          {sidebarTab === "chats" && labels.length > 0 && (
            <div className="flex gap-1.5 px-4 pb-2 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
              <button
                onClick={() => setActiveFilter(null)}
                className={`shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-semibold transition-all ${
                  !activeFilter
                    ? "bg-blue-600 text-white"
                    : "bg-[#0d1f35] text-[#4a6fa5] border border-[#1a2d4a] hover:border-blue-500/40"
                }`}
              >
                Todos
              </button>
              {labels.map((label) => (
                <button
                  key={label.id}
                  onClick={() => setActiveFilter(activeFilter === label.id ? null : label.id)}
                  className={`shrink-0 flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-semibold transition-all border ${
                    activeFilter === label.id
                      ? "text-white border-transparent"
                      : "bg-[#0d1f35] text-[#94a3b8] border-[#1a2d4a] hover:border-[#2d4a6e]"
                  }`}
                  style={activeFilter === label.id ? { backgroundColor: label.color, borderColor: label.color } : {}}
                >
                  <span
                    className="h-1.5 w-1.5 rounded-full shrink-0"
                    style={{ backgroundColor: activeFilter === label.id ? "rgba(255,255,255,0.8)" : label.color }}
                  />
                  {label.name}
                </button>
              ))}
            </div>
          )}

          {/* Contact / Chat list */}
          <div className="flex-1 overflow-y-auto px-2">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
              </div>
            ) : sidebarTab === "chats" ? (
              filteredContacts.map((contact) => (
                <button
                  key={contact.id}
                  onClick={() => { setSelectedContact(contact); setMobileView("chat"); }}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-all mb-0.5 ${
                    selectedContact?.id === contact.id
                      ? "bg-[#112240] border border-[#1e3a5f]"
                      : "hover:bg-[#0d1f35] border border-transparent"
                  }`}
                >
                  <div className="relative shrink-0">
                    <div className={`flex h-11 w-11 items-center justify-center rounded-xl text-sm font-semibold text-white shadow-md ${
                      selectedContact?.id === contact.id
                        ? "bg-gradient-to-br from-blue-500 to-blue-700 shadow-blue-900/40"
                        : "bg-gradient-to-br from-[#1e3a5f] to-[#0d2444]"
                    }`}>
                      {contact.avatar}
                    </div>
                    {contact.online && (
                      <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-[#0a1628] bg-emerald-400" />
                    )}
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <div className="flex items-center justify-between">
                      <span className="truncate text-sm font-medium text-[#e2e8f0]">{contact.name}</span>
                      <div className="flex items-center gap-1.5 shrink-0 ml-2">
                        {contact.aiEnabled && <span className="text-[10px] text-blue-400">●</span>}
                        <span className="text-[11px] text-[#2d4a6e]">{contact.time}</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-xs text-[#3d5a80]">{contact.lastMessage || "Sin mensajes"}</span>
                      <div className="flex items-center gap-1 shrink-0">
                        {/* Label dots */}
                        {contact.labels.slice(0, 3).map((label) => (
                          <span
                            key={label.id}
                            className="h-2 w-2 rounded-full shrink-0"
                            style={{ backgroundColor: label.color }}
                            title={label.name}
                          />
                        ))}
                        {contact.unread > 0 && (
                          <span className="flex h-4 min-w-[16px] items-center justify-center rounded-full bg-blue-500 px-1 text-[10px] font-bold text-white">
                            {contact.unread}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              ))
            ) : (
              /* Contacts directory */
              filteredContacts.map((contact) => (
                <div key={contact.id} className="flex items-center gap-3 rounded-xl px-3 py-3 mb-0.5 border border-transparent hover:bg-[#0d1f35] transition-all">
                  <div className="relative shrink-0">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-[#1e3a5f] to-[#0d2444] text-sm font-semibold text-white shadow-md">
                      {contact.avatar}
                    </div>
                    {contact.online && (
                      <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-[#0a1628] bg-emerald-400" />
                    )}
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <span className="truncate text-sm font-medium text-[#e2e8f0]">{contact.name}</span>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs text-[#3d5a80]">{contact.phone}</span>
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-md ${
                        contact.aiEnabled ? "bg-blue-500/20 text-blue-400" : "bg-[#112240] text-[#4a6fa5]"
                      }`}>
                        {contact.aiEnabled ? "IA" : "Manual"}
                      </span>
                      {contact.labels.map((label) => (
                        <span key={label.id} className="flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-md" style={{ backgroundColor: label.color + "33", color: label.color }}>
                          {label.name}
                        </span>
                      ))}
                    </div>
                  </div>
                  <button
                    onClick={() => { setSelectedContact(contact); setSidebarTab("chats"); setMobileView("chat"); }}
                    className="shrink-0 rounded-lg p-2 text-[#4a6fa5] hover:bg-[#112240] hover:text-blue-400 transition-colors"
                    title="Abrir chat"
                  >
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                    </svg>
                  </button>
                </div>
              ))
            )}
          </div>
        </aside>

        {/* ── Chat area ────────────────────────────────────────────────────── */}
        <main
          className={`flex flex-col flex-1 bg-[#060d1a] ${mobileView === "list" ? "hidden md:flex" : "flex"}`}
          style={{
            transform: swipeDelta > 0 ? `translateX(${swipeDelta}px)` : undefined,
            transition: swipeDelta === 0 ? "transform 0.25s ease" : "none",
            touchAction: "pan-y",
          }}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {!selectedContact ? (
            <div className="flex flex-1 items-center justify-center">
              <div className="text-center">
                <div className="mb-4 flex h-16 w-16 mx-auto items-center justify-center rounded-2xl bg-[#0a1628] border border-[#1a2d4a]">
                  <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="#1e3a5f" strokeWidth="1.5">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                  </svg>
                </div>
                <p className="text-sm text-[#2d4a6e]">{loading ? "Cargando..." : "Seleccioná una conversación"}</p>
              </div>
            </div>
          ) : (
            <>
              {/* Chat Header */}
              <div className="flex h-16 items-center gap-3 border-b border-[#1a2d4a] bg-[#0a1628] px-4">
                <button
                  onClick={() => setMobileView("list")}
                  className="md:hidden rounded-lg p-1.5 text-[#4a6fa5] hover:bg-[#112240] hover:text-[#60a5fa] transition-colors"
                >
                  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M15 18l-6-6 6-6"/>
                  </svg>
                </button>

                {/* Avatar */}
                <div className="relative shrink-0">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 text-sm font-semibold text-white shadow-lg shadow-blue-900/30">
                    {selectedContact.avatar}
                  </div>
                  {selectedContact.online && (
                    <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-[#0a1628] bg-emerald-400" />
                  )}
                </div>

                {/* Name + labels */}
                <div className="flex-1 min-w-0">
                  <h2 className="text-sm font-semibold text-[#e2e8f0] truncate">{selectedContact.name}</h2>
                  <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                    {selectedContact.labels.length > 0 ? (
                      selectedContact.labels.map((label) => (
                        <span
                          key={label.id}
                          className="text-[10px] font-semibold px-1.5 py-0 rounded-full"
                          style={{ backgroundColor: label.color + "33", color: label.color }}
                        >
                          {label.name}
                        </span>
                      ))
                    ) : (
                      <p className="text-xs text-[#3d5a80]">
                        {selectedContact.online ? "En línea" : selectedContact.phone}
                      </p>
                    )}
                  </div>
                </div>

                {/* Label dropdown button */}
                <div className="relative" ref={labelDropdownRef}>
                  <button
                    onClick={() => setShowLabelDropdown((v) => !v)}
                    title="Gestionar etiquetas"
                    className={`rounded-xl p-2 transition-all ${
                      showLabelDropdown
                        ? "bg-[#112240] text-blue-400"
                        : "text-[#4a6fa5] hover:bg-[#112240] hover:text-blue-400"
                    }`}
                  >
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/>
                      <line x1="7" y1="7" x2="7.01" y2="7"/>
                    </svg>
                  </button>

                  {/* Dropdown panel */}
                  {showLabelDropdown && (
                    <div className="absolute right-0 top-full mt-2 w-64 rounded-2xl bg-[#0a1628] border border-[#1a2d4a] shadow-2xl shadow-black/60 z-50 overflow-hidden">
                      <div className="px-4 py-3 border-b border-[#1a2d4a]">
                        <p className="text-xs font-semibold text-[#e2e8f0]">Etiquetas</p>
                      </div>

                      {/* Existing labels */}
                      <div className="px-2 py-2 space-y-0.5 max-h-52 overflow-y-auto">
                        {labels.length === 0 && (
                          <p className="text-xs text-[#2d4a6e] px-2 py-2">No hay etiquetas aún</p>
                        )}
                        {labels.map((label) => {
                          const active = selectedContact.labels.some((l) => l.id === label.id);
                          return (
                            <div key={label.id} className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-[#0d1f35] transition-colors group">
                              <button
                                onClick={() => toggleContactLabel(selectedContact, label)}
                                className="flex flex-1 items-center gap-2 text-left"
                              >
                                {/* Checkbox */}
                                <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-all ${
                                  active ? "border-transparent" : "border-[#2d4a6e]"
                                }`} style={active ? { backgroundColor: label.color } : {}}>
                                  {active && (
                                    <svg viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="white" strokeWidth="3">
                                      <polyline points="20 6 9 17 4 12"/>
                                    </svg>
                                  )}
                                </span>
                                {/* Color dot + name */}
                                <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: label.color }} />
                                <span className="text-sm text-[#cbd5e1]">{label.name}</span>
                              </button>
                              {/* Delete label */}
                              <button
                                onClick={() => deleteLabel(label.id)}
                                className="opacity-0 group-hover:opacity-100 rounded p-0.5 text-[#2d4a6e] hover:text-red-400 transition-all"
                                title="Eliminar etiqueta"
                              >
                                <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2">
                                  <path d="M18 6L6 18M6 6l12 12"/>
                                </svg>
                              </button>
                            </div>
                          );
                        })}
                      </div>

                      {/* Create new label */}
                      <div className="px-3 py-3 border-t border-[#1a2d4a] space-y-2">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-[#2d4a6e]">Nueva etiqueta</p>
                        <input
                          type="text"
                          placeholder="Nombre..."
                          value={newLabelName}
                          onChange={(e) => setNewLabelName(e.target.value)}
                          onKeyDown={(e) => { if (e.key === "Enter") createLabel(); }}
                          className="w-full rounded-lg bg-[#0d1f35] border border-[#1a2d4a] px-3 py-1.5 text-sm text-[#e2e8f0] placeholder-[#2d4a6e] outline-none focus:border-blue-500/50"
                        />
                        {/* Color picker */}
                        <div className="flex gap-1.5 flex-wrap">
                          {LABEL_COLORS.map((color) => (
                            <button
                              key={color}
                              onClick={() => setNewLabelColor(color)}
                              className={`h-5 w-5 rounded-full transition-transform hover:scale-110 ${
                                newLabelColor === color ? "ring-2 ring-white ring-offset-1 ring-offset-[#0a1628]" : ""
                              }`}
                              style={{ backgroundColor: color }}
                            />
                          ))}
                        </div>
                        <button
                          onClick={createLabel}
                          disabled={savingLabel || !newLabelName.trim()}
                          className="w-full rounded-lg bg-blue-600 py-1.5 text-xs font-semibold text-white hover:bg-blue-500 disabled:opacity-40 transition-all"
                        >
                          {savingLabel ? "Creando..." : "Crear etiqueta"}
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* AI Toggle */}
                <button
                  onClick={() => toggleAI(selectedContact)}
                  title={selectedContact.aiEnabled ? "IA activa — click para tomar control" : "Manual — click para activar IA"}
                  className={`flex items-center gap-2 rounded-xl px-3 py-1.5 text-xs font-semibold transition-all ${
                    selectedContact.aiEnabled
                      ? "bg-blue-500/20 text-blue-400 border border-blue-500/30 hover:bg-blue-500/30"
                      : "bg-[#112240] text-[#4a6fa5] border border-[#1a2d4a] hover:bg-[#1a2d4a]"
                  }`}
                >
                  <span className="text-sm">{selectedContact.aiEnabled ? "🤖" : "👤"}</span>
                  <span className="hidden sm:inline">{selectedContact.aiEnabled ? "IA activa" : "Manual"}</span>
                </button>
              </div>

              {/* Messages */}
              <div ref={messagesContainerRef} className="flex flex-1 flex-col gap-2 overflow-y-auto px-4 py-5 md:px-[8%]">
                {loadingMessages && (
                  <div className="flex flex-1 items-center justify-center">
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
                  </div>
                )}
                {messages.map((msg) => (
                  <div key={msg.id} className={`flex ${msg.fromMe ? "justify-end" : "justify-start"}`}>
                    <div className={`relative max-w-[70%] rounded-2xl px-4 py-2.5 shadow-sm ${
                      msg.fromMe
                        ? "bg-blue-600 text-white rounded-br-md"
                        : "bg-[#0d1f35] text-[#cbd5e1] border border-[#1a2d4a] rounded-bl-md"
                    }`}>
                      <p className="whitespace-pre-wrap text-sm leading-relaxed">{msg.text}</p>
                      <p className={`mt-1 text-right text-[10px] ${msg.fromMe ? "text-blue-200/70" : "text-[#2d4a6e]"}`}>
                        {msg.time}
                        {msg.fromMe && (
                          <span className="ml-1">{msg.status === "read" ? "✓✓" : msg.status === "delivered" ? "✓✓" : "✓"}</span>
                        )}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Input */}
              <div className="border-t border-[#1a2d4a] bg-[#0a1628] px-4 py-3">
                <div className="flex items-end gap-3">
                  <div className="flex flex-1 items-end rounded-2xl bg-[#0d1f35] border border-[#1a2d4a] px-4 py-3 focus-within:border-blue-500/50 transition-colors">
                    <textarea
                      rows={1}
                      placeholder="Escribe un mensaje..."
                      value={inputValue}
                      onChange={(e) => {
                        setInputValue(e.target.value);
                        e.target.style.height = "auto";
                        e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
                      }}
                      className="w-full resize-none bg-transparent text-sm text-[#cbd5e1] placeholder-[#2d4a6e] outline-none leading-relaxed"
                      style={{ maxHeight: "120px" }}
                    />
                  </div>
                  <button
                    onClick={handleSend}
                    disabled={!inputValue.trim()}
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white shadow-lg shadow-blue-900/40 transition-all hover:bg-blue-500 active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
                    </svg>
                  </button>
                </div>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
