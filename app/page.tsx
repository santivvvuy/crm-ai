"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import type { Contact, ConversationStatus, Label, Message, Toast } from "@/lib/types";
import { QuickRepliesPopup } from "./components/QuickRepliesPopup";
import { GlobalSearch } from "./components/GlobalSearch";
import { ContactDrawer } from "./components/ContactDrawer";
import { BroadcastModal } from "./components/BroadcastModal";
import { ToastContainer } from "./components/Toast";
import { useGlobalRealtime } from "./hooks/useGlobalRealtime";

// ─── Constants ────────────────────────────────────────────────────────────────

const LABEL_COLORS = [
  "#ef4444", "#f97316", "#eab308", "#22c55e",
  "#3b82f6", "#8b5cf6", "#ec4899", "#6b7280",
];

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

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getInitials(name: string): string {
  return name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
}

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit" });
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function Home() {
  const router = useRouter();

  // Core
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

  // Status filter
  const [statusFilter, setStatusFilter] = useState<"all" | ConversationStatus>("all");

  // Modals / panels
  const [showNewContact, setShowNewContact] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [savingContact, setSavingContact] = useState(false);
  const [contactError, setContactError] = useState("");
  const [showQuickReplies, setShowQuickReplies] = useState(false);
  const [showGlobalSearch, setShowGlobalSearch] = useState(false);
  const [showContactDrawer, setShowContactDrawer] = useState(false);
  const [showBroadcast, setShowBroadcast] = useState(false);

  // Notifications
  const [notifPermission, setNotifPermission] = useState<NotificationPermission>("default");

  // Toasts
  const [toasts, setToasts] = useState<Toast[]>([]);

  // Swipe
  const [swipeDelta, setSwipeDelta] = useState(0);
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const isSwiping = useRef(false);

  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // ─── Auth ──────────────────────────────────────────────────────────────────

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) router.push("/login");
    });
    if ("Notification" in window) {
      setNotifPermission(Notification.permission);
    }
  }, [router]);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  async function requestNotifications() {
    if (!("Notification" in window)) return;
    const perm = await Notification.requestPermission();
    setNotifPermission(perm);
  }

  // ─── Toast ─────────────────────────────────────────────────────────────────

  const addToast = useCallback((contactName: string, text: string, contactId: string) => {
    const id = crypto.randomUUID();
    setToasts((prev) => [...prev.slice(-4), { id, contactName, text, contactId }]);
  }, []);

  function removeToast(id: string) {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }

  function openChatFromToast(contactId: string) {
    const contact = contacts.find((c) => c.id === contactId);
    if (contact) {
      setSelectedContact(contact);
      setSidebarTab("chats");
      setMobileView("chat");
    }
  }

  // ─── Global realtime (notifications + toasts) ──────────────────────────────

  useGlobalRealtime({
    selectedContactId: selectedContact?.id ?? null,
    contacts,
    onNewMessage: addToast,
  });

  // ─── Touch handlers ────────────────────────────────────────────────────────

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

  // ─── AI toggle ─────────────────────────────────────────────────────────────

  async function toggleAI(contact: Contact) {
    const newValue = !contact.aiEnabled;
    setContacts((prev) => prev.map((c) => (c.id === contact.id ? { ...c, aiEnabled: newValue } : c)));
    setSelectedContact((prev) => prev?.id === contact.id ? { ...prev, aiEnabled: newValue } : prev);
    const { error } = await supabase.from("contacts").update({ ai_enabled: newValue }).eq("id", contact.id);
    if (error) {
      setContacts((prev) => prev.map((c) => (c.id === contact.id ? { ...c, aiEnabled: !newValue } : c)));
      setSelectedContact((prev) => prev?.id === contact.id ? { ...prev, aiEnabled: !newValue } : prev);
    }
  }

  // ─── Conversation status ───────────────────────────────────────────────────

  async function updateStatus(contact: Contact, status: ConversationStatus) {
    setContacts((prev) => prev.map((c) => (c.id === contact.id ? { ...c, conversationStatus: status } : c)));
    setSelectedContact((prev) => prev?.id === contact.id ? { ...prev, conversationStatus: status } : prev);
    await supabase.from("contacts").update({ conversation_status: status }).eq("id", contact.id);
  }

  // ─── Labels ────────────────────────────────────────────────────────────────

  async function createLabel() {
    const name = newLabelName.trim();
    if (!name) return;
    setSavingLabel(true);
    const { data } = await supabase.from("labels").insert({ name, color: newLabelColor }).select().single();
    setSavingLabel(false);
    if (!data) return;
    setLabels((prev) => [...prev, { id: data.id, name: data.name, color: data.color }]);
    setNewLabelName("");
    setNewLabelColor(LABEL_COLORS[4]);
  }

  async function toggleContactLabel(contact: Contact, label: Label) {
    const hasLabel = contact.labels.some((l) => l.id === label.id);
    const updatedLabels = hasLabel ? contact.labels.filter((l) => l.id !== label.id) : [...contact.labels, label];
    const apply = (c: Contact) => c.id === contact.id ? { ...c, labels: updatedLabels } : c;
    setContacts((prev) => prev.map(apply));
    setSelectedContact((prev) => prev?.id === contact.id ? { ...prev, labels: updatedLabels } : prev);
    if (hasLabel) {
      await supabase.from("contact_labels").delete().eq("contact_id", contact.id).eq("label_id", label.id);
    } else {
      await supabase.from("contact_labels").insert({ contact_id: contact.id, label_id: label.id });
    }
  }

  async function deleteLabel(labelId: string) {
    await supabase.from("labels").delete().eq("id", labelId);
    setLabels((prev) => prev.filter((l) => l.id !== labelId));
    setContacts((prev) => prev.map((c) => ({ ...c, labels: c.labels.filter((l) => l.id !== labelId) })));
    setSelectedContact((prev) => prev ? { ...prev, labels: prev.labels.filter((l) => l.id !== labelId) } : prev);
    if (activeFilter === labelId) setActiveFilter(null);
  }

  // ─── Add contact ───────────────────────────────────────────────────────────

  async function handleAddContact() {
    const name = newName.trim();
    const phone = newPhone.trim().replace(/[^0-9]/g, "");
    if (!name || !phone) { setContactError("Nombre y teléfono son obligatorios"); return; }
    if (phone.length < 8) { setContactError("Teléfono inválido"); return; }
    const existing = contacts.find((c) => c.phone === phone);
    if (existing) {
      setSelectedContact(existing); setSidebarTab("chats"); setMobileView("chat");
      setShowNewContact(false); setNewName(""); setNewPhone(""); setContactError("");
      return;
    }
    setSavingContact(true); setContactError("");
    const { data, error } = await supabase.from("contacts").insert({ name, phone, ai_enabled: true }).select().single();
    setSavingContact(false);
    if (error || !data) { setContactError("Error al crear contacto"); return; }
    const nc: Contact = {
      id: data.id, name: data.name, phone: data.phone, avatar: getInitials(data.name),
      lastMessage: "", time: "", unread: 0, online: false, aiEnabled: data.ai_enabled ?? true,
      labels: [], conversationStatus: "open",
    };
    setContacts((prev) => [...prev, nc].sort((a, b) => a.name.localeCompare(b.name)));
    setSelectedContact(nc); setSidebarTab("chats"); setMobileView("chat");
    setShowNewContact(false); setNewName(""); setNewPhone(""); setContactError("");
  }

  // ─── Data loading ──────────────────────────────────────────────────────────

  useEffect(() => {
    supabase.from("labels").select("*").order("created_at").then(({ data }) => {
      if (data) setLabels(data.map((l) => ({ id: l.id, name: l.name, color: l.color })));
    });
  }, []);

  useEffect(() => {
    async function fetchContacts() {
      const { data, error } = await supabase
        .from("contacts")
        .select(`
          id, name, phone, last_message, last_message_time, unread_count, online, ai_enabled, conversation_status,
          contact_labels ( label_id, labels ( id, name, color ) )
        `)
        .order("name");
      if (error) { setLoading(false); return; }
      const mapped: Contact[] = (data ?? []).map((row) => ({
        id: row.id, name: row.name ?? "", phone: row.phone ?? "",
        avatar: getInitials(row.name ?? ""), lastMessage: row.last_message ?? "",
        time: row.last_message_time ?? "", unread: row.unread_count ?? 0,
        online: row.online ?? false, aiEnabled: row.ai_enabled ?? true,
        conversationStatus: (row.conversation_status ?? "open") as ConversationStatus,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        labels: (row.contact_labels ?? []).map((cl: any) => cl.labels).filter(Boolean) as Label[],
      }));
      setContacts(mapped);
      if (mapped.length > 0) setSelectedContact(mapped[0]);
      setLoading(false);
    }
    fetchContacts();
  }, []);

  useEffect(() => {
    if (!selectedContact) return;
    setMessages([]);
    let cancelled = false;
    async function fetchMessages() {
      setLoadingMessages(true);
      const { data, error } = await supabase
        .from("messages").select("*").eq("contact_id", selectedContact!.id)
        .order("created_at", { ascending: true });
      if (cancelled) return;
      if (error) { setLoadingMessages(false); return; }
      setMessages((data ?? []).map((row) => ({
        id: row.id, text: row.text ?? row.content ?? "", time: formatTime(row.created_at),
        fromMe: row.direction === "outbound", status: row.status ?? "delivered",
      })));
      setLoadingMessages(false);
    }
    fetchMessages();
    const channel = supabase.channel(`messages:contact_id=eq.${selectedContact.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `contact_id=eq.${selectedContact.id}` },
        (payload) => {
          if (cancelled) return;
          const row = payload.new;
          const msg: Message = { id: row.id, text: row.text ?? row.content ?? "", time: formatTime(row.created_at), fromMe: row.direction === "outbound", status: row.status ?? "delivered" };
          setMessages((prev) => prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]);
          // Update sidebar preview for the active contact
          setContacts((prev) =>
            prev.map((c) => c.id === row.contact_id ? { ...c, lastMessage: msg.text, time: msg.time } : c)
          );
        }).subscribe();
    return () => { cancelled = true; supabase.removeChannel(channel); };
  }, [selectedContact?.id]);

  useEffect(() => {
    const c = messagesContainerRef.current;
    if (c) c.scrollTop = c.scrollHeight;
  }, [messages]);

  useEffect(() => {
    if (!selectedContact) return;
    setContacts((prev) => prev.map((c) => (c.id === selectedContact.id ? { ...c, unread: 0 } : c)));
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

  // Realtime: sync last_message preview + unread from contacts table updates
  useEffect(() => {
    const channel = supabase
      .channel("contacts-updates")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "contacts" },
        (payload) => {
          const row = payload.new;
          setContacts((prev) =>
            prev.map((c) =>
              c.id === row.id
                ? {
                    ...c,
                    lastMessage: row.last_message ?? c.lastMessage,
                    time: row.last_message_time ?? c.time,
                    unread: row.unread_count ?? c.unread,
                  }
                : c
            )
          );
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  // Cmd+K / Ctrl+K global search
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setShowGlobalSearch(true);
      }
    }
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  // ─── Send message ──────────────────────────────────────────────────────────

  async function handleSend() {
    const text = inputValue.trim();
    if (!text || !selectedContact) return;
    setInputValue("");
    const now = new Date().toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit" });
    const optimistic: Message = {
      id: crypto.randomUUID(), text, time: now, fromMe: true, status: "sent",
    };
    setMessages((prev) => [...prev, optimistic]);

    // Update sidebar preview immediately
    setContacts((prev) =>
      prev.map((c) => (c.id === selectedContact.id ? { ...c, lastMessage: text, time: now } : c))
    );
    const { data, error } = await supabase.from("messages")
      .insert({ contact_id: selectedContact.id, text, direction: "outbound" }).select().single();
    if (error) { setMessages((prev) => prev.filter((m) => m.id !== optimistic.id)); return; }
    setMessages((prev) => prev.map((m) => m.id === optimistic.id ? { ...m, id: data.id, time: formatTime(data.created_at), status: "delivered" } : m));
    try {
      await fetch("https://marketphone.app.n8n.cloud/webhook/send-message", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: selectedContact.phone, text }),
      });
    } catch { /* webhook error is non-fatal */ }
  }

  // ─── Derived ───────────────────────────────────────────────────────────────

  const filteredContacts = contacts.filter((c) => {
    const matchSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchLabel = !activeFilter || c.labels.some((l) => l.id === activeFilter);
    const matchStatus = statusFilter === "all" || c.conversationStatus === statusFilter;
    return matchSearch && matchLabel && matchStatus;
  });

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex h-[100dvh] w-screen bg-[#060d1a]">
      <div className="flex h-full w-full overflow-hidden">

        {/* ── Sidebar ─────────────────────────────────────────────────────── */}
        <aside className={`flex flex-col bg-[#0a1628] border-r border-[#1a2d4a] ${mobileView === "chat" ? "hidden md:flex" : "flex"} w-full md:w-[320px] lg:w-[380px] shrink-0`}>

          {/* Header */}
          <div className="flex h-16 items-center justify-between px-4 border-b border-[#1a2d4a]">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 text-xs font-bold text-white shadow-lg shadow-blue-900/30">
                MP
              </div>
              <span className="text-sm font-semibold text-[#e2e8f0]">MarketPhone</span>
            </div>
            <div className="flex items-center gap-1">
              {/* Search button */}
              <button onClick={() => setShowGlobalSearch(true)} title="Buscar (⌘K)"
                className="rounded-lg p-2 text-[#4a6fa5] hover:bg-[#112240] hover:text-[#60a5fa] transition-colors">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
                </svg>
              </button>
              {/* Broadcast button */}
              <button onClick={() => setShowBroadcast(true)} title="Envío masivo"
                className="rounded-lg p-2 text-[#4a6fa5] hover:bg-[#112240] hover:text-[#60a5fa] transition-colors">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.26 12a19.79 19.79 0 0 1-3-8.57A2 2 0 0 1 3.18 2H6.1a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
                </svg>
              </button>
              {/* Notification bell */}
              <button onClick={requestNotifications} title={notifPermission === "granted" ? "Notificaciones activas" : "Activar notificaciones"}
                className={`rounded-lg p-2 transition-colors ${notifPermission === "granted" ? "text-blue-400 hover:bg-[#112240]" : notifPermission === "denied" ? "text-red-400/60 hover:bg-[#112240]" : "text-[#4a6fa5] hover:bg-[#112240] hover:text-[#60a5fa]"}`}>
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                  {notifPermission === "granted" && <circle cx="18" cy="4" r="3" fill="#22c55e" stroke="none"/>}
                </svg>
              </button>
              {/* Logout */}
              <button onClick={handleLogout} title="Cerrar sesión"
                className="rounded-lg p-2 text-[#4a6fa5] hover:bg-[#112240] hover:text-red-400 transition-colors">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
                </svg>
              </button>
            </div>
          </div>

          {/* Search */}
          <div className="px-4 py-3">
            <div className="flex items-center gap-2 rounded-xl bg-[#0d1f35] border border-[#1a2d4a] px-3 py-2">
              <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="#4a6fa5" strokeWidth="2" className="shrink-0">
                <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
              </svg>
              <input type="text" placeholder={sidebarTab === "chats" ? "Buscar conversación..." : "Buscar contacto..."}
                value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-transparent text-sm text-[#94a3b8] placeholder-[#2d4a6e] outline-none" />
            </div>
          </div>

          {/* Tabs */}
          <div className="flex px-4 pb-2 gap-1">
            <button onClick={() => setSidebarTab("chats")}
              className={`flex-1 py-1.5 rounded-lg text-[11px] font-semibold uppercase tracking-wider transition-all ${sidebarTab === "chats" ? "bg-[#112240] text-blue-400 border border-[#1e3a5f]" : "text-[#2d4a6e] hover:text-[#4a6fa5]"}`}>
              Chats
            </button>
            <button onClick={() => setSidebarTab("contactos")}
              className={`flex-1 py-1.5 rounded-lg text-[11px] font-semibold uppercase tracking-wider transition-all ${sidebarTab === "contactos" ? "bg-[#112240] text-blue-400 border border-[#1e3a5f]" : "text-[#2d4a6e] hover:text-[#4a6fa5]"}`}>
              Contactos ({contacts.length})
            </button>
            {sidebarTab === "contactos" && (
              <button onClick={() => setShowNewContact(true)}
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-white hover:bg-blue-500 transition-colors" title="Agregar contacto">
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M12 5v14M5 12h14"/>
                </svg>
              </button>
            )}
          </div>

          {/* New contact form */}
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
                  onChange={(e) => setNewPhone(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") handleAddContact(); }}
                  className="w-full rounded-lg bg-[#0a1628] border border-[#1a2d4a] px-3 py-2 text-sm text-[#e2e8f0] placeholder-[#2d4a6e] outline-none focus:border-blue-500/50" />
                {contactError && <p className="text-[11px] text-red-400">{contactError}</p>}
                <button onClick={handleAddContact} disabled={savingContact}
                  className="w-full rounded-lg bg-blue-600 py-2 text-xs font-semibold text-white hover:bg-blue-500 active:scale-[0.98] transition-all disabled:opacity-50">
                  {savingContact ? "Guardando..." : "Agregar y abrir chat"}
                </button>
              </div>
            </div>
          )}

          {/* Status filter chips */}
          {sidebarTab === "chats" && (
            <div className="flex gap-1.5 px-4 pb-1.5 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
              {(["all", "open", "pending", "resolved"] as const).map((s) => (
                <button key={s} onClick={() => setStatusFilter(s)}
                  className={`shrink-0 flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-semibold border transition-all ${statusFilter === s ? "text-white border-transparent" : "bg-[#0d1f35] text-[#4a6fa5] border-[#1a2d4a] hover:border-[#2d4a6e]"}`}
                  style={statusFilter === s && s !== "all" ? { backgroundColor: STATUS_COLORS[s], borderColor: STATUS_COLORS[s] } : statusFilter === s ? { backgroundColor: "#1e3a5f", borderColor: "#1e3a5f" } : {}}>
                  {s !== "all" && <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ backgroundColor: statusFilter === s ? "rgba(255,255,255,0.8)" : STATUS_COLORS[s] }} />}
                  {s === "all" ? "Todos" : STATUS_LABELS[s]}
                </button>
              ))}
            </div>
          )}

          {/* Label filter chips */}
          {sidebarTab === "chats" && labels.length > 0 && (
            <div className="flex gap-1.5 px-4 pb-2 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
              <button onClick={() => setActiveFilter(null)}
                className={`shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-semibold transition-all ${!activeFilter ? "bg-blue-600 text-white" : "bg-[#0d1f35] text-[#4a6fa5] border border-[#1a2d4a] hover:border-blue-500/40"}`}>
                Etiquetas
              </button>
              {labels.map((label) => (
                <button key={label.id} onClick={() => setActiveFilter(activeFilter === label.id ? null : label.id)}
                  className={`shrink-0 flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-semibold border transition-all ${activeFilter === label.id ? "text-white border-transparent" : "bg-[#0d1f35] text-[#94a3b8] border-[#1a2d4a] hover:border-[#2d4a6e]"}`}
                  style={activeFilter === label.id ? { backgroundColor: label.color, borderColor: label.color } : {}}>
                  <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ backgroundColor: activeFilter === label.id ? "rgba(255,255,255,0.8)" : label.color }} />
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
                <button key={contact.id} onClick={() => { setSelectedContact(contact); setMobileView("chat"); }}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-all mb-0.5 ${selectedContact?.id === contact.id ? "bg-[#112240] border border-[#1e3a5f]" : "hover:bg-[#0d1f35] border border-transparent"}`}>
                  <div className="relative shrink-0">
                    <div className={`flex h-11 w-11 items-center justify-center rounded-xl text-sm font-semibold text-white shadow-md ${selectedContact?.id === contact.id ? "bg-gradient-to-br from-blue-500 to-blue-700 shadow-blue-900/40" : "bg-gradient-to-br from-[#1e3a5f] to-[#0d2444]"}`}>
                      {contact.avatar}
                    </div>
                    {/* Status dot */}
                    <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-[#0a1628]"
                      style={{ backgroundColor: STATUS_COLORS[contact.conversationStatus] }} />
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
                        {contact.labels.slice(0, 3).map((label) => (
                          <span key={label.id} className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: label.color }} title={label.name} />
                        ))}
                        {contact.unread > 0 && (
                          <span className="flex h-4 min-w-[16px] items-center justify-center rounded-full bg-blue-500 px-1 text-[10px] font-bold text-white">{contact.unread}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              ))
            ) : (
              filteredContacts.map((contact) => (
                <div key={contact.id} className="flex items-center gap-3 rounded-xl px-3 py-3 mb-0.5 border border-transparent hover:bg-[#0d1f35] transition-all">
                  <div className="relative shrink-0">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-[#1e3a5f] to-[#0d2444] text-sm font-semibold text-white shadow-md">
                      {contact.avatar}
                    </div>
                    <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-[#0a1628]" style={{ backgroundColor: STATUS_COLORS[contact.conversationStatus] }} />
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <span className="truncate text-sm font-medium text-[#e2e8f0]">{contact.name}</span>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs text-[#3d5a80]">{contact.phone}</span>
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-md ${contact.aiEnabled ? "bg-blue-500/20 text-blue-400" : "bg-[#112240] text-[#4a6fa5]"}`}>
                        {contact.aiEnabled ? "IA" : "Manual"}
                      </span>
                      {contact.labels.map((label) => (
                        <span key={label.id} className="flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-md" style={{ backgroundColor: label.color + "33", color: label.color }}>
                          {label.name}
                        </span>
                      ))}
                    </div>
                  </div>
                  <button onClick={() => { setSelectedContact(contact); setSidebarTab("chats"); setMobileView("chat"); }}
                    className="shrink-0 rounded-lg p-2 text-[#4a6fa5] hover:bg-[#112240] hover:text-blue-400 transition-colors" title="Abrir chat">
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
          className={`flex flex-col flex-1 bg-[#060d1a] min-w-0 ${mobileView === "list" ? "hidden md:flex" : "flex"}`}
          style={{ transform: swipeDelta > 0 ? `translateX(${swipeDelta}px)` : undefined, transition: swipeDelta === 0 ? "transform 0.25s ease" : "none", touchAction: "pan-y" }}
          onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}
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
              <div className="flex h-16 items-center gap-2 border-b border-[#1a2d4a] bg-[#0a1628] px-3">
                <button onClick={() => setMobileView("list")}
                  className="md:hidden rounded-lg p-1.5 text-[#4a6fa5] hover:bg-[#112240] hover:text-[#60a5fa] transition-colors">
                  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6"/></svg>
                </button>

                {/* Avatar */}
                <div className="relative shrink-0">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 text-sm font-semibold text-white shadow-lg shadow-blue-900/30">
                    {selectedContact.avatar}
                  </div>
                  <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-[#0a1628]"
                    style={{ backgroundColor: STATUS_COLORS[selectedContact.conversationStatus] }} />
                </div>

                {/* Name + labels */}
                <div className="flex-1 min-w-0">
                  <h2 className="text-sm font-semibold text-[#e2e8f0] truncate">{selectedContact.name}</h2>
                  <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                    {selectedContact.labels.length > 0 ? (
                      selectedContact.labels.map((label) => (
                        <span key={label.id} className="text-[10px] font-semibold px-1.5 py-0 rounded-full" style={{ backgroundColor: label.color + "33", color: label.color }}>
                          {label.name}
                        </span>
                      ))
                    ) : (
                      <p className="text-xs text-[#3d5a80]">{selectedContact.phone}</p>
                    )}
                  </div>
                </div>

                {/* Status selector */}
                <select
                  value={selectedContact.conversationStatus}
                  onChange={(e) => updateStatus(selectedContact, e.target.value as ConversationStatus)}
                  className="hidden sm:block rounded-lg bg-[#0d1f35] border border-[#1a2d4a] px-2 py-1 text-[11px] font-semibold outline-none cursor-pointer transition-colors"
                  style={{ color: STATUS_COLORS[selectedContact.conversationStatus] }}
                >
                  <option value="open">● Abierta</option>
                  <option value="pending">● Pendiente</option>
                  <option value="resolved">● Resuelta</option>
                </select>

                {/* Contact info button */}
                <button onClick={() => setShowContactDrawer(true)} title="Ver detalle del contacto"
                  className={`rounded-xl p-2 transition-all ${showContactDrawer ? "bg-[#112240] text-blue-400" : "text-[#4a6fa5] hover:bg-[#112240] hover:text-blue-400"}`}>
                  <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
                  </svg>
                </button>

                {/* Label dropdown */}
                <div className="relative" ref={labelDropdownRef}>
                  <button onClick={() => setShowLabelDropdown((v) => !v)} title="Etiquetas"
                    className={`rounded-xl p-2 transition-all ${showLabelDropdown ? "bg-[#112240] text-blue-400" : "text-[#4a6fa5] hover:bg-[#112240] hover:text-blue-400"}`}>
                    <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/>
                      <line x1="7" y1="7" x2="7.01" y2="7"/>
                    </svg>
                  </button>

                  {showLabelDropdown && (
                    <div className="absolute right-0 top-full mt-2 w-64 rounded-2xl bg-[#0a1628] border border-[#1a2d4a] shadow-2xl shadow-black/60 z-50 overflow-hidden">
                      <div className="px-4 py-3 border-b border-[#1a2d4a]">
                        <p className="text-xs font-semibold text-[#e2e8f0]">Etiquetas</p>
                      </div>
                      <div className="px-2 py-2 space-y-0.5 max-h-52 overflow-y-auto">
                        {labels.length === 0 && <p className="text-xs text-[#2d4a6e] px-2 py-2">No hay etiquetas aún</p>}
                        {labels.map((label) => {
                          const active = selectedContact.labels.some((l) => l.id === label.id);
                          return (
                            <div key={label.id} className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-[#0d1f35] transition-colors group">
                              <button onClick={() => toggleContactLabel(selectedContact, label)} className="flex flex-1 items-center gap-2 text-left">
                                <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-all ${active ? "border-transparent" : "border-[#2d4a6e]"}`} style={active ? { backgroundColor: label.color } : {}}>
                                  {active && <svg viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="white" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>}
                                </span>
                                <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: label.color }} />
                                <span className="text-sm text-[#cbd5e1]">{label.name}</span>
                              </button>
                              <button onClick={() => deleteLabel(label.id)} className="opacity-0 group-hover:opacity-100 rounded p-0.5 text-[#2d4a6e] hover:text-red-400 transition-all">
                                <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
                              </button>
                            </div>
                          );
                        })}
                      </div>
                      <div className="px-3 py-3 border-t border-[#1a2d4a] space-y-2">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-[#2d4a6e]">Nueva etiqueta</p>
                        <input type="text" placeholder="Nombre..." value={newLabelName} onChange={(e) => setNewLabelName(e.target.value)}
                          onKeyDown={(e) => { if (e.key === "Enter") createLabel(); }}
                          className="w-full rounded-lg bg-[#0d1f35] border border-[#1a2d4a] px-3 py-1.5 text-sm text-[#e2e8f0] placeholder-[#2d4a6e] outline-none focus:border-blue-500/50" />
                        <div className="flex gap-1.5 flex-wrap">
                          {LABEL_COLORS.map((color) => (
                            <button key={color} onClick={() => setNewLabelColor(color)}
                              className={`h-5 w-5 rounded-full transition-transform hover:scale-110 ${newLabelColor === color ? "ring-2 ring-white ring-offset-1 ring-offset-[#0a1628]" : ""}`}
                              style={{ backgroundColor: color }} />
                          ))}
                        </div>
                        <button onClick={createLabel} disabled={savingLabel || !newLabelName.trim()}
                          className="w-full rounded-lg bg-blue-600 py-1.5 text-xs font-semibold text-white hover:bg-blue-500 disabled:opacity-40 transition-all">
                          {savingLabel ? "Creando..." : "Crear etiqueta"}
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* AI Toggle */}
                <button onClick={() => toggleAI(selectedContact)}
                  className={`flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-xs font-semibold transition-all ${selectedContact.aiEnabled ? "bg-blue-500/20 text-blue-400 border border-blue-500/30 hover:bg-blue-500/30" : "bg-[#112240] text-[#4a6fa5] border border-[#1a2d4a] hover:bg-[#1a2d4a]"}`}>
                  <span className="text-sm">{selectedContact.aiEnabled ? "🤖" : "👤"}</span>
                  <span className="hidden lg:inline">{selectedContact.aiEnabled ? "IA activa" : "Manual"}</span>
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
                    <div className={`relative max-w-[70%] rounded-2xl px-4 py-2.5 shadow-sm ${msg.fromMe ? "bg-blue-600 text-white rounded-br-md" : "bg-[#0d1f35] text-[#cbd5e1] border border-[#1a2d4a] rounded-bl-md"}`}>
                      <p className="whitespace-pre-wrap text-sm leading-relaxed">{msg.text}</p>
                      <p className={`mt-1 text-right text-[10px] ${msg.fromMe ? "text-blue-200/70" : "text-[#2d4a6e]"}`}>
                        {msg.time}
                        {msg.fromMe && <span className="ml-1">{msg.status === "read" ? "✓✓" : msg.status === "delivered" ? "✓✓" : "✓"}</span>}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Input */}
              <div className="border-t border-[#1a2d4a] bg-[#0a1628] px-4 py-3">
                <div className="relative flex items-end gap-3">
                  {/* Quick replies popup */}
                  {showQuickReplies && (
                    <QuickRepliesPopup
                      onSelect={(text) => setInputValue(text)}
                      onClose={() => setShowQuickReplies(false)}
                    />
                  )}
                  {/* Quick replies button */}
                  <button onClick={() => setShowQuickReplies((v) => !v)} title="Respuestas rápidas"
                    className={`shrink-0 rounded-xl p-2.5 transition-all ${showQuickReplies ? "bg-blue-600 text-white" : "text-[#4a6fa5] hover:bg-[#112240] hover:text-blue-400"}`}>
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
                      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
                    </svg>
                  </button>
                  <div className="flex flex-1 items-end rounded-2xl bg-[#0d1f35] border border-[#1a2d4a] px-4 py-3 focus-within:border-blue-500/50 transition-colors">
                    <textarea rows={1} placeholder="Escribe un mensaje..." value={inputValue}
                      onChange={(e) => { setInputValue(e.target.value); e.target.style.height = "auto"; e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px"; }}
                      onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                      className="w-full resize-none bg-transparent text-sm text-[#cbd5e1] placeholder-[#2d4a6e] outline-none leading-relaxed"
                      style={{ maxHeight: "120px" }} />
                  </div>
                  <button onClick={handleSend} disabled={!inputValue.trim()}
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white shadow-lg shadow-blue-900/40 transition-all hover:bg-blue-500 active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed">
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
                    </svg>
                  </button>
                </div>
              </div>
            </>
          )}
        </main>

        {/* Contact drawer */}
        {showContactDrawer && selectedContact && (
          <ContactDrawer
            contact={selectedContact}
            onClose={() => setShowContactDrawer(false)}
            onStatusChange={(status) => updateStatus(selectedContact, status)}
            onAIToggle={() => toggleAI(selectedContact)}
          />
        )}
      </div>

      {/* Global modals */}
      {showGlobalSearch && (
        <GlobalSearch
          contacts={contacts}
          onOpenChat={(id) => {
            const c = contacts.find((x) => x.id === id);
            if (c) { setSelectedContact(c); setSidebarTab("chats"); setMobileView("chat"); }
          }}
          onClose={() => setShowGlobalSearch(false)}
        />
      )}

      {showBroadcast && (
        <BroadcastModal
          contacts={contacts}
          labels={labels}
          onClose={() => setShowBroadcast(false)}
        />
      )}

      {/* Toasts */}
      <ToastContainer toasts={toasts} onClose={removeToast} onOpenChat={openChatFromToast} />
    </div>
  );
}
