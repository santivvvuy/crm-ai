import type { Message } from "@/lib/types";
import CheckIcon from "./CheckIcon";

export default function MessageBubble({ msg }: { msg: Message }) {
  return (
    <div className={`flex ${msg.fromMe ? "justify-end" : "justify-start"}`}>
      <div
        className={`relative max-w-[65%] rounded-lg px-[9px] pb-2 pt-1.5 shadow-sm ${
          msg.fromMe ? "bg-[#005c4b] text-[#e9edef]" : "bg-[#202c33] text-[#e9edef]"
        }`}
      >
        <span className="whitespace-pre-wrap text-sm leading-[19px]">{msg.text}</span>
        <span className="float-right mt-1 ml-3 flex items-center gap-0.5 text-[11px] text-[#ffffff99]">
          {msg.time}
          {msg.fromMe && (
            <>
              {msg.webhookFailed ? (
                <span title="Guardado en CRM pero no enviado por WhatsApp" className="ml-1 text-orange-400">
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
                  </svg>
                </span>
              ) : (
                <CheckIcon double={msg.status !== "sent"} read={msg.status === "read"} />
              )}
            </>
          )}
        </span>
      </div>
    </div>
  );
}
