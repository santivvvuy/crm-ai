"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError("Email o contraseña incorrectos");
      setLoading(false);
      return;
    }

    router.push("/");
    router.refresh();
  }

  return (
    <div className="flex h-[100dvh] w-screen items-center justify-center bg-[#060d1a]">
      <div className="w-full max-w-sm px-6">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8 gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 text-lg font-bold text-white shadow-xl shadow-blue-900/40">
            MP
          </div>
          <h1 className="text-xl font-bold text-[#e2e8f0]">MarketPhone CRM</h1>
          <p className="text-sm text-[#3d5a80]">Ingresá con tu cuenta</p>
        </div>

        {/* Form */}
        <form onSubmit={handleLogin} className="space-y-3">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoFocus
            className="w-full rounded-xl bg-[#0a1628] border border-[#1a2d4a] px-4 py-3 text-sm text-[#e2e8f0] placeholder-[#2d4a6e] outline-none focus:border-blue-500/60 transition-colors"
          />
          <input
            type="password"
            placeholder="Contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full rounded-xl bg-[#0a1628] border border-[#1a2d4a] px-4 py-3 text-sm text-[#e2e8f0] placeholder-[#2d4a6e] outline-none focus:border-blue-500/60 transition-colors"
          />
          {error && (
            <p className="text-xs text-red-400 text-center">{error}</p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white hover:bg-blue-500 active:scale-[0.98] transition-all disabled:opacity-50 shadow-lg shadow-blue-900/30 mt-1"
          >
            {loading ? "Ingresando..." : "Ingresar"}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-[#2d4a6e]">
          ¿No tenés cuenta? Contactá al administrador.
        </p>
      </div>
    </div>
  );
}
