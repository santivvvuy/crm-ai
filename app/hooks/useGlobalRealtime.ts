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
  // Use refs to always have current values in the realtime handler without re-subscribing
  const contactsRef = useRef(contacts);
  const selectedIdRef = useRef(selectedContactId);
  const onNewMessageRef = useRef(onNewMessage);

  contactsRef.current = contacts;
  selectedIdRef.current = selectedContactId;
  onNewMessageRef.current = onNewMessage;

  useEffect(() => {
    const channel = supabase
      .channel("global-inbound")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: "direction=eq.inbound",
        },
        (payload) => {
          const row = payload.new;

          // Already visible in the active chat — skip
          if (row.contact_id === selectedIdRef.current) return;

          const contact = contactsRef.current.find((c) => c.id === row.contact_id);
          const name = contact?.name ?? "Nuevo mensaje";
          const text: string = row.text ?? row.content ?? "";

          // Browser notification when tab is hidden
          if (typeof document !== "undefined" && document.hidden) {
            if ("Notification" in window && Notification.permission === "granted") {
              new Notification(`Nuevo mensaje de ${name}`, {
                body: text,
                icon: "/icon-192.png",
                tag: row.contact_id, // collapse duplicates from same contact
              });
            }
          }

          // In-app toast regardless (so user sees it even if tab is visible)
          onNewMessageRef.current(name, text, row.contact_id);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []); // stable — uses refs internally
}
