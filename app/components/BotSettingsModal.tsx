"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

interface Props {
  onClose: () => void;
}

export function BotSettingsModal({ onClose }: Props) {
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    supabase
      .from("bot_settings")
      .select("system_prompt")
      .eq("id", 1)
      .single()
      .then(({ data, error }) => {
        if (error) setError("Error al cargar la configuración");
        else setPrompt(data?.system_prompt ?? "");
        setLoading(false);
      });
  }, []);

  async function handleSave() {
    setSaving(true);
    setError("");
    setSaved(false);

    const { error } = await supabase
      .from("bot_settings")
      .update({ system_prompt: prompt, updated_at: new Date().toISOString() })
      .eq("id", 1);

    setSaving(false);
    if (error) {
      setError("Error al guardar");
    } else {
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-2xl flex flex-col bg-[#0a1628] border border-[#1a2d4a] rounded-2xl shadow-2xl shadow-black/60 max-h-[90vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1a2d4a] shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/20 border border-blue-500/30 text-lg">
              🤖
            </div>
            <div>
              <h2 className="text-sm font-semibold text-[#e2e8f0]">Configuración del Bot</h2>
              <p className="text-[11px] text-[#3d5a80]">Prompt / instrucciones del asistente IA</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-[#4a6fa5] hover:bg-[#112240] hover:text-[#60a5fa] transition-colors"
          >
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">

          <div className="rounded-xl bg-blue-500/10 border border-blue-500/20 px-4 py-3">
            <p className="text-xs text-blue-300 leading-relaxed">
              💡 Este texto define cómo se comporta el bot al responder mensajes de WhatsApp.
              Los cambios aplican en menos de <strong>1 minuto</strong> sin necesidad de redeploy.
            </p>
          </div>

          {loading ? (
            <div className="flex justify-center py-8">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
            </div>
          ) : (
            <div>
              <label className="text-[10px] font-semibold uppercase tracking-wider text-[#2d4a6e] block mb-2">
                Instrucciones del asistente
              </label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={20}
                className="w-full rounded-xl bg-[#0d1f35] border border-[#1a2d4a] px-4 py-3 text-sm text-[#cbd5e1] placeholder-[#2d4a6e] outline-none focus:border-blue-500/50 resize-none font-mono leading-relaxed transition-colors"
                placeholder="Escribí las instrucciones del bot aquí..."
                spellCheck={false}
              />
              <p className="text-[11px] text-[#2d4a6e] mt-1.5 text-right">
                {prompt.length} caracteres
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-[#1a2d4a] shrink-0">
          <div className="h-5">
            {error && <p className="text-xs text-red-400">{error}</p>}
            {saved && (
              <p className="text-xs text-green-400 flex items-center gap-1.5">
                <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
                Guardado — aplicará en menos de 1 minuto
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="rounded-xl px-4 py-2 text-sm text-[#4a6fa5] hover:bg-[#112240] transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={saving || loading || !prompt.trim()}
              className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-50 transition-all"
            >
              {saving ? (
                <>
                  <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                  Guardando...
                </>
              ) : (
                <>
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
                    <polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/>
                  </svg>
                  Guardar cambios
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
