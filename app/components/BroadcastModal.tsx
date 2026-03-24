"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Contact, Label } from "@/lib/types";

interface Props {
  contacts: Contact[];
  labels: Label[];
  onClose: () => void;
}

export function BroadcastModal({ contacts, labels, onClose }: Props) {
  const [target, setTarget] = useState<"all" | string>("all"); // "all" or label id
  const [message, setMessage] = useState("");
  const [step, setStep] = useState<"compose" | "confirm" | "sending" | "done">("compose");
  const [progress, setProgress] = useState(0);
  const [total, setTotal] = useState(0);
  const [errors, setErrors] = useState(0);

  const targetContacts =
    target === "all"
      ? contacts
      : contacts.filter((c) => c.labels.some((l) => l.id === target));

  async function handleSend() {
    const recipients = targetContacts;
    if (recipients.length === 0) return;

    setTotal(recipients.length);
    setProgress(0);
    setErrors(0);
    setStep("sending");

    let errCount = 0;

    for (let i = 0; i < recipients.length; i++) {
      const contact = recipients[i];
      try {
        // Insert message in DB
        await supabase.from("messages").insert({
          contact_id: contact.id,
          text: message,
          direction: "outbound",
        });

        // Send via n8n webhook
        await fetch("https://marketphone.app.n8n.cloud/webhook/send-message", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phone: contact.phone, text: message }),
        });
      } catch {
        errCount++;
      }
      setProgress(i + 1);
      setErrors(errCount);

      // Rate limit: wait 600ms between sends
      if (i < recipients.length - 1) {
        await new Promise((r) => setTimeout(r, 600));
      }
    }

    setStep("done");
  }

  const targetLabel = labels.find((l) => l.id === target);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4"
      onClick={(e) => { if (e.target === e.currentTarget && step !== "sending") onClose(); }}
    >
      <div className="w-full max-w-md rounded-2xl bg-[#0a1628] border border-[#1a2d4a] shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#1a2d4a]">
          <div className="flex items-center gap-2">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#60a5fa" strokeWidth="2">
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.26 12a19.79 19.79 0 0 1-3-8.57A2 2 0 0 1 3.18 2H6.1a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
            </svg>
            <span className="text-sm font-semibold text-[#e2e8f0]">Envío masivo</span>
          </div>
          {step !== "sending" && (
            <button onClick={onClose} className="rounded-lg p-1.5 text-[#4a6fa5] hover:text-[#60a5fa] transition-colors">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        <div className="px-5 py-5 space-y-4">
          {/* COMPOSE step */}
          {(step === "compose" || step === "confirm") && (
            <>
              {/* Target selector */}
              <div>
                <label className="text-[10px] font-semibold uppercase tracking-wider text-[#2d4a6e] block mb-2">
                  Destinatarios
                </label>
                <select
                  value={target}
                  onChange={(e) => setTarget(e.target.value)}
                  disabled={step === "confirm"}
                  className="w-full rounded-xl bg-[#0d1f35] border border-[#1a2d4a] px-3 py-2.5 text-sm text-[#e2e8f0] outline-none focus:border-blue-500/50 disabled:opacity-60"
                >
                  <option value="all">Todos los contactos ({contacts.length})</option>
                  {labels.map((label) => (
                    <option key={label.id} value={label.id}>
                      {label.name} ({contacts.filter((c) => c.labels.some((l) => l.id === label.id)).length} contactos)
                    </option>
                  ))}
                </select>
              </div>

              {/* Message */}
              <div>
                <label className="text-[10px] font-semibold uppercase tracking-wider text-[#2d4a6e] block mb-2">
                  Mensaje
                </label>
                <textarea
                  placeholder="Escribí el mensaje a enviar..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  disabled={step === "confirm"}
                  rows={4}
                  className="w-full rounded-xl bg-[#0d1f35] border border-[#1a2d4a] px-4 py-3 text-sm text-[#e2e8f0] placeholder-[#2d4a6e] outline-none focus:border-blue-500/50 resize-none disabled:opacity-60 transition-colors"
                />
                <p className="text-[10px] text-[#2d4a6e] mt-1 text-right">{message.length} caracteres</p>
              </div>

              {/* Confirm preview */}
              {step === "confirm" && (
                <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 px-4 py-3">
                  <p className="text-sm font-semibold text-amber-400">
                    Se enviará a {targetContacts.length} contacto{targetContacts.length !== 1 ? "s" : ""}
                    {target !== "all" && targetLabel && ` con etiqueta "${targetLabel.name}"`}
                  </p>
                  <p className="text-xs text-amber-300/70 mt-1">
                    Tiempo estimado: ~{Math.ceil(targetContacts.length * 0.6)}s. Esta acción no se puede deshacer.
                  </p>
                </div>
              )}

              {/* Buttons */}
              {step === "compose" && (
                <button
                  onClick={() => setStep("confirm")}
                  disabled={!message.trim() || targetContacts.length === 0}
                  className="w-full rounded-xl bg-blue-600 py-2.5 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-40 transition-all"
                >
                  Revisar envío →
                </button>
              )}
              {step === "confirm" && (
                <div className="flex gap-2">
                  <button
                    onClick={() => setStep("compose")}
                    className="flex-1 rounded-xl bg-[#0d1f35] border border-[#1a2d4a] py-2.5 text-sm font-semibold text-[#4a6fa5] hover:bg-[#112240] transition-all"
                  >
                    Editar
                  </button>
                  <button
                    onClick={handleSend}
                    className="flex-1 rounded-xl bg-blue-600 py-2.5 text-sm font-semibold text-white hover:bg-blue-500 transition-all"
                  >
                    Enviar ahora
                  </button>
                </div>
              )}
            </>
          )}

          {/* SENDING step */}
          {step === "sending" && (
            <div className="py-4 space-y-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-[#94a3b8]">Enviando mensajes...</span>
                <span className="font-semibold text-[#e2e8f0]">{progress} / {total}</span>
              </div>
              <div className="h-2 rounded-full bg-[#0d1f35] overflow-hidden">
                <div
                  className="h-full rounded-full bg-blue-600 transition-all duration-300"
                  style={{ width: `${total > 0 ? (progress / total) * 100 : 0}%` }}
                />
              </div>
              {errors > 0 && (
                <p className="text-xs text-red-400">{errors} error{errors !== 1 ? "es" : ""} al enviar</p>
              )}
              <p className="text-xs text-[#2d4a6e] text-center">No cerrés esta ventana...</p>
            </div>
          )}

          {/* DONE step */}
          {step === "done" && (
            <div className="py-4 flex flex-col items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/20">
                <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="#22c55e" strokeWidth="2">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <p className="text-base font-semibold text-[#e2e8f0]">¡Envío completado!</p>
              <p className="text-sm text-[#3d5a80] text-center">
                {progress - errors} enviado{progress - errors !== 1 ? "s" : ""} correctamente
                {errors > 0 && `, ${errors} con error`}
              </p>
              <button
                onClick={onClose}
                className="mt-2 rounded-xl bg-[#112240] border border-[#1e3a5f] px-6 py-2 text-sm font-semibold text-blue-400 hover:bg-[#1a2d4a] transition-all"
              >
                Cerrar
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
