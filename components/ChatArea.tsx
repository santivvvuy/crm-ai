import { useEffect, useRef } from "react";
import type { Contact, Message } from "@/lib/types";
import ChatHeader from "./ChatHeader";
import MessageBubble from "./MessageBubble";
import InputBar from "./InputBar";

type Props = {
  contact: Contact | null;
  messages: Message[];
  loading: boolean;
  loadingMessages: boolean;
  inputValue: string;
  onInputChange: (v: string) => void;
  onSend: () => void;
};

export default function ChatArea({
  contact,
  messages,
  loading,
  loadingMessages,
  inputValue,
  onInputChange,
  onSend,
}: Props) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (!contact) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center bg-[#0b141a]">
        <p className="text-sm text-[#8696a0]">
          {loading ? "Cargando contactos..." : "Selecciona un chat para comenzar"}
        </p>
      </main>
    );
  }

  return (
    <main className="flex flex-1 flex-col bg-[#0b141a]">
      <ChatHeader contact={contact} />

      <div
        className="flex flex-1 flex-col gap-1 overflow-y-auto px-[7%] py-4"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23111b21' fill-opacity='0.6'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          backgroundColor: "#0b141a",
        }}
      >
        {loadingMessages ? (
          <div className="flex flex-1 items-center justify-center">
            <p className="text-sm text-[#8696a0]">Cargando mensajes...</p>
          </div>
        ) : (
          messages.map((msg) => <MessageBubble key={msg.id} msg={msg} />)
        )}
        <div ref={messagesEndRef} />
      </div>

      <InputBar
        value={inputValue}
        onChange={onInputChange}
        onSend={onSend}
      />
    </main>
  );
}
