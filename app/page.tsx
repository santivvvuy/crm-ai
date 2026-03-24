"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";

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
};

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

type Message = {
  id: string;
  text: string;
  time: string;
  fromMe: boolean;
  status: "sent" | "delivered" | "read";
};

function formatTime(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit" });
}

export default function Home() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [mobileView, setMobileView] = useState<"list" | "chat">("list");
  const [sidebarTab, setSidebarTab] = useState<"chats" | "contactos">("chats");
  const [swipeDelta, setSwipeDelta] = useState(0);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const isSwiping = useRef(false);

  function handleTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    isSwiping.current = false;
  }

  function handleTouchMove(e: React.TouchEvent) {
    if (touchStartX.current === null || touchStartY.current === null) return;
    const dx = e.touches[0].clientX - touchStartX.current;
    const dy = e.touches[0].clientY - touchStartY.current;

    // Only start a horizontal swipe if the gesture is clearly more horizontal than vertical
    if (!isSwiping.current && Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
    if (!isSwiping.current) {
      if (Math.abs(dx) < Math.abs(dy)) return; // vertical scroll — don't intercept
      isSwiping.current = true;
    }

    if (dx > 0) {
      e.preventDefault(); // prevent scroll while swiping right
      setSwipeDelta(Math.min(dx, window.innerWidth));
    }
  }

  function handleTouchEnd() {
    if (swipeDelta > 80) {
      setMobileView("list");
    }
    setSwipeDelta(0);
    touchStartX.current = null;
    touchStartY.current = null;
    isSwiping.current = false;
  }

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
      console.error("Error toggling AI:", error);
      setContacts((prev) =>
        prev.map((c) => (c.id === contact.id ? { ...c, aiEnabled: !newValue } : c))
      );
      setSelectedContact((prev) =>
        prev?.id === contact.id ? { ...prev, aiEnabled: !newValue } : prev
      );
    }
  }

  useEffect(() => {
    async function fetchContacts() {
      const { data, error } = await supabase
        .from("contacts")
        .select("id, name, phone, last_message, last_message_time, unread_count, online, ai_enabled")
        .order("name");

      if (error) {
        console.error("Error fetching contacts:", error);
        setLoading(false);
        return;
      }

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
        .from("messages")
        .select("*")
        .eq("contact_id", selectedContact!.id)
        .order("created_at", { ascending: true });

      if (cancelled) return;

      if (error) {
        console.error("Error fetching messages:", error);
        setLoadingMessages(false);
        return;
      }

      const mapped: Message[] = (data ?? []).map((row) => ({
        id: row.id,
        text: row.text ?? row.content ?? "",
        time: formatTime(row.created_at),
        fromMe: row.direction === "outbound",
        status: row.status ?? "delivered",
      }));

      setMessages(mapped);
      setLoadingMessages(false);
    }

    fetchMessages();

    const channel = supabase
      .channel(`messages:contact_id=eq.${selectedContact.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `contact_id=eq.${selectedContact.id}`,
        },
        (payload) => {
          if (cancelled) return;
          const row = payload.new;
          const incoming: Message = {
            id: row.id,
            text: row.text ?? row.content ?? "",
            time: formatTime(row.created_at),
            fromMe: row.direction === "outbound",
            status: row.status ?? "delivered",
          };
          setMessages((prev) => {
            if (prev.some((m) => m.id === incoming.id)) return prev;
            return [...prev, incoming];
          });
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [selectedContact?.id]);

  useEffect(() => {
    const container = messagesContainerRef.current;
    if (container) {
      container.scrollTop = container.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (!selectedContact) return;
    setContacts((prev) =>
      prev.map((c) => (c.id === selectedContact.id ? { ...c, unread: 0 } : c))
    );
    supabase
      .from("contacts")
      .update({ unread_count: 0 })
      .eq("id", selectedContact.id)
      .then(({ error }) => {
        if (error) console.error("Error resetting unread:", error);
      });
  }, [selectedContact?.id]);

  const filteredContacts = contacts.filter((c) =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  async function handleSend() {
    const text = inputValue.trim();
    if (!text || !selectedContact) return;

    setInputValue("");

    const optimisticMsg: Message = {
      id: crypto.randomUUID(),
      text,
      time: new Date().toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit" }),
      fromMe: true,
      status: "sent",
    };
    setMessages((prev) => [...prev, optimisticMsg]);

    const { data, error } = await supabase
      .from("messages")
      .insert({ contact_id: selectedContact.id, text, direction: "outbound" })
      .select()
      .single();

    if (error) {
      console.error("Error sending message:", error);
      setMessages((prev) => prev.filter((m) => m.id !== optimisticMsg.id));
      return;
    }

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

  return (
    <div className="flex h-[100dvh] w-screen bg-[#060d1a]">
      <div className="flex h-full w-full overflow-hidden">

        {/* Sidebar */}
        <aside className={`flex flex-col bg-[#0a1628] border-r border-[#1a2d4a] ${
          mobileView === "chat" ? "hidden md:flex" : "flex"
        } w-full md:w-[320px] lg:w-[380px] shrink-0`}>

          {/* Sidebar Header */}
          <div className="flex h-16 items-center justify-between px-5 border-b border-[#1a2d4a]">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 text-xs font-bold text-white shadow-lg shadow-blue-900/30">
                MP
              </div>
              <span className="text-sm font-semibold text-[#e2e8f0]">MarketPhone</span>
            </div>
            <button className="rounded-lg p-2 text-[#4a6fa5] transition-colors hover:bg-[#112240] hover:text-[#60a5fa]">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
              </svg>
            </button>
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
          </div>

          {/* Content based on tab */}
          <div className="flex-1 overflow-y-auto px-2">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
              </div>
            ) : sidebarTab === "chats" ? (
              /* Chat List */
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
                        {contact.aiEnabled && (
                          <span className="text-[10px] text-blue-400">●</span>
                        )}
                        <span className="text-[11px] text-[#2d4a6e]">{contact.time}</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="truncate text-xs text-[#3d5a80]">{contact.lastMessage || "Sin mensajes"}</span>
                      {contact.unread > 0 && (
                        <span className="ml-2 flex h-4 min-w-[16px] shrink-0 items-center justify-center rounded-full bg-blue-500 px-1 text-[10px] font-bold text-white">
                          {contact.unread}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              ))
            ) : (
              /* Contacts Directory */
              filteredContacts.map((contact) => (
                <div
                  key={contact.id}
                  className="flex items-center gap-3 rounded-xl px-3 py-3 mb-0.5 border border-transparent hover:bg-[#0d1f35] transition-all"
                >
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
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-[#3d5a80]">{contact.phone}</span>
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-md ${
                        contact.aiEnabled
                          ? "bg-blue-500/20 text-blue-400"
                          : "bg-[#112240] text-[#4a6fa5]"
                      }`}>
                        {contact.aiEnabled ? "IA" : "Manual"}
                      </span>
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

        {/* Chat Area */}
        <main
          className={`flex flex-col flex-1 bg-[#060d1a] ${
            mobileView === "list" ? "hidden md:flex" : "flex"
          }`}
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

                {/* Name & status */}
                <div className="flex-1 min-w-0">
                  <h2 className="text-sm font-semibold text-[#e2e8f0] truncate">{selectedContact.name}</h2>
                  <p className="text-xs text-[#3d5a80]">
                    {selectedContact.online ? "En línea" : selectedContact.phone}
                  </p>
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
                  <span>{selectedContact.aiEnabled ? "IA activa" : "Manual"}</span>
                </button>
              </div>

              {/* Messages */}
              <div
                ref={messagesContainerRef}
                className="flex flex-1 flex-col gap-2 overflow-y-auto px-4 py-5 md:px-[8%]"
              >
                {loadingMessages && (
                  <div className="flex flex-1 items-center justify-center">
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
                  </div>
                )}
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.fromMe ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`relative max-w-[70%] rounded-2xl px-4 py-2.5 shadow-sm ${
                        msg.fromMe
                          ? "bg-blue-600 text-white rounded-br-md"
                          : "bg-[#0d1f35] text-[#cbd5e1] border border-[#1a2d4a] rounded-bl-md"
                      }`}
                    >
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

              {/* Input Area */}
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
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          handleSend();
                        }
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
