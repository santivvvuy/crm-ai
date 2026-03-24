"use client";

import { useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import type { Contact } from "@/lib/types";

interface Props {
  selectedContactId: string | null;
  contacts: Contact[];
  onNewMessage: (contactName: string, text: string, contactId: string) => void;
}

export function useGlobalRealtime({ selectedContactId, contacts, onNewMessage }: Props) {
  // Refs so the stable subscription always reads current values
  const contactsRef = useRef(contacts);
  const selectedIdRef = useRef(selectedContactId);
  const onNewMessageRef = useRef(onNewMessage);

  contactsRef.current = contacts;
  selectedIdRef.current = selectedContactId;
  onNewMessageRef.current = onNewMessage;

  useEffect(() => {
    // NOTE: Do NOT use `filter` here — column-level filters on postgres_changes
    // are unreliable on free-tier Supabase plans. Filter in the callback instead.
    const channel = supabase
      .channel("global-inbound")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        (payload) => {
          const row = payload.new;

          // Only care about inbound messages
          if (row.direction !== "inbound") return;

          // Already visible in the active chat — skip toast/notification
          if (row.contact_id === selectedIdRef.current) return;

          const contact = contactsRef.current.find((c) => c.id === row.contact_id);
          const name = contact?.name ?? "Nuevo mensaje";
          const text: string = row.text ?? row.content ?? "";

          // Browser notification when tab is hidden or not focused
          if (
            typeof document !== "undefined" &&
            document.hidden &&
            "Notification" in window &&
            Notification.permission === "granted"
          ) {
            try {
              new Notification(`Nuevo mensaje de ${name}`, {
                body: text,
                icon: "/icon-192.png",
                tag: row.contact_id, // collapses duplicates from same contact
              });
            } catch {
              // Some browsers block new Notification() outside a user gesture — ignore
            }
          }

          // In-app toast always (also fires when tab is visible but viewing a different chat)
          onNewMessageRef.current(name, text, row.contact_id);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []); // stable subscription — reads current values via refs
}
