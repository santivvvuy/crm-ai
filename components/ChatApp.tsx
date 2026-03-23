"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { getInitials, formatTime } from "@/lib/utils";
import type { Contact, Message } from "@/lib/types";
import ContactList from "./ContactList";
import ChatArea from "./ChatArea";

export default function ChatApp() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);

  // Fetch contacts on mount + subscribe to contacts realtime
  useEffect(() => {
    async function fetchContacts() {
      const { data, error } = await supabase
        .from("contacts")
        .select("id, name, phone, last_message, last_message_time, unread_count, online")
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
      }));

      setContacts(mapped);
      if (mapped.length > 0) setSelectedContact(mapped[0]);
      setLoading(false);
    }

    fetchContacts();

    // Realtime: keep sidebar in sync when contacts are created or updated
    const channel = supabase
      .channel("contacts-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "contacts" },
        (payload) => {
          if (payload.eventType === "INSERT") {
            const row = payload.new;
            setContacts((prev) => [
              ...prev,
              {
                id: row.id,
                name: row.name ?? "",
                phone: row.phone ?? "",
                avatar: getInitials(row.name ?? ""),
                lastMessage: row.last_message ?? "",
                time: row.last_message_time ?? "",
                unread: row.unread_count ?? 0,
                online: row.online ?? false,
              },
            ]);
          } else if (payload.eventType === "UPDATE") {
            const row = payload.new;
            setContacts((prev) =>
              prev.map((c) =>
                c.id === row.id
                  ? {
                      ...c,
                      lastMessage: row.last_message ?? c.lastMessage,
                      time: row.last_message_time ?? c.time,
                      unread: row.unread_count ?? c.unread,
                      online: row.online ?? c.online,
                    }
                  : c
              )
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Fetch messages + realtime when selected contact changes
  useEffect(() => {
    if (!selectedContact) return;

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
        content: row.content ?? "",
        time: formatTime(row.created_at),
        fromMe: row.from_me ?? false,
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
            content: row.content ?? "",
            time: formatTime(row.created_at),
            fromMe: row.from_me ?? false,
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
  }, [selectedContact]);

  async function handleSelectContact(contact: Contact) {
    setSelectedContact(contact);

    // Reset unread count locally and in DB
    if (contact.unread > 0) {
      setContacts((prev) =>
        prev.map((c) => (c.id === contact.id ? { ...c, unread: 0 } : c))
      );
      await supabase
        .from("contacts")
        .update({ unread_count: 0 })
        .eq("id", contact.id);
    }
  }

  async function handleSend() {
    const text = inputValue.trim();
    if (!text || !selectedContact) return;

    setInputValue("");

    const optimisticId = crypto.randomUUID();
    const optimisticMsg: Message = {
      id: optimisticId,
      content: text,
      time: new Date().toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit" }),
      fromMe: true,
      status: "sent",
    };
    setMessages((prev) => [...prev, optimisticMsg]);

    // Save to Supabase
    const { data, error } = await supabase
      .from("messages")
      .insert({
        contact_id: selectedContact.id,
        content: text,
        direction: "outbound",
      })
      .select()
      .single();

    if (error) {
      console.error("Error sending message:", error);
      setMessages((prev) => prev.filter((m) => m.id !== optimisticId));
      return;
    }

    // Replace optimistic message with persisted one
    setMessages((prev) =>
      prev.map((m) =>
        m.id === optimisticId
          ? { ...m, id: data.id, time: formatTime(data.created_at), status: "delivered" }
          : m
      )
    );

    // Send via n8n webhook
    let webhookFailed = false;
    try {
      const res = await fetch("https://marketphone.app.n8n.cloud/webhook/send-message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: selectedContact.phone, text }),
      });
      if (!res.ok) webhookFailed = true;
    } catch {
      webhookFailed = true;
    }

    if (webhookFailed) {
      setMessages((prev) =>
        prev.map((m) => (m.id === data.id ? { ...m, webhookFailed: true } : m))
      );
    }
  }

  return (
    <div className="flex h-screen w-screen items-center justify-center bg-[#111b21]">
      <div className="flex h-full w-full max-w-[1600px] overflow-hidden shadow-2xl xl:h-[96vh] xl:rounded-sm">
        <ContactList
          contacts={contacts}
          selectedId={selectedContact?.id ?? null}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onSelectContact={handleSelectContact}
        />
        <ChatArea
          contact={selectedContact}
          messages={messages}
          loading={loading}
          loadingMessages={loadingMessages}
          inputValue={inputValue}
          onInputChange={setInputValue}
          onSend={handleSend}
        />
      </div>
    </div>
  );
}
