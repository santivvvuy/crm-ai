"use client";

import { useEffect } from "react";
import type { Toast as ToastType } from "@/lib/types";

interface Props {
  toasts: ToastType[];
  onClose: (id: string) => void;
  onOpenChat: (contactId: string) => void;
}

export function ToastContainer({ toasts, onClose, onOpenChat }: Props) {
  return (
    <div className="fixed bottom-4 right-4 flex flex-col gap-2 z-[60] pointer-events-none">
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onClose={onClose} onOpenChat={onOpenChat} />
      ))}
    </div>
  );
}

function ToastItem({
  toast,
  onClose,
  onOpenChat,
}: {
  toast: ToastType;
  onClose: (id: string) => void;
  onOpenChat: (contactId: string) => void;
}) {
  useEffect(() => {
    const t = setTimeout(() => onClose(toast.id), 5000);
    return () => clearTimeout(t);
  }, [toast.id, onClose]);

  return (
    <div className="pointer-events-auto flex items-start gap-3 rounded-xl bg-[#0a1628] border border-[#1a2d4a] shadow-2xl shadow-black/60 px-4 py-3 min-w-[280px] max-w-[320px] animate-in slide-in-from-bottom-2 fade-in duration-200">
      {/* Blue dot indicator */}
      <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-blue-500" />
      <button
        onClick={() => { onOpenChat(toast.contactId); onClose(toast.id); }}
        className="flex-1 text-left min-w-0"
      >
        <p className="text-xs font-semibold text-[#e2e8f0] truncate">{toast.contactName}</p>
        <p className="text-xs text-[#94a3b8] truncate mt-0.5">{toast.text}</p>
      </button>
      <button
        onClick={() => onClose(toast.id)}
        className="shrink-0 text-[#2d4a6e] hover:text-[#60a5fa] transition-colors"
      >
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M18 6L6 18M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}
