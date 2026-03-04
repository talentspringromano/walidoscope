"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogIn } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Login fehlgeschlagen");
        return;
      }

      router.push("/");
    } catch {
      setError("Verbindungsfehler");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface relative overflow-hidden">
      {/* Ambient glows */}
      <div className="absolute top-[-20%] left-[-10%] h-[500px] w-[500px] rounded-full bg-[rgba(226,169,110,0.06)] blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] h-[400px] w-[400px] rounded-full bg-[rgba(94,234,212,0.04)] blur-[100px] pointer-events-none" />

      <div className="relative w-full max-w-[380px] px-6">
        {/* Logo */}
        <div className="flex flex-col items-center mb-10">
          <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-[#e2a96e] to-[#c4956a] flex items-center justify-center text-[#0c0c0e] text-2xl font-bold shadow-[0_0_40px_rgba(226,169,110,0.3)] mb-5">
            W
          </div>
          <h1 className="text-[22px] font-semibold tracking-tight text-[#fafaf9] font-[family-name:var(--font-family-display)]">
            Walidoscope
          </h1>
          <p className="mt-1 text-[13px] text-[#57534e]">
            Internes Analytics-Dashboard
          </p>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] p-7 backdrop-blur-sm">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label
                htmlFor="email"
                className="block text-[12px] font-medium uppercase tracking-[0.08em] text-[#57534e] mb-2"
              >
                E-Mail
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.03)] px-4 py-2.5 text-[14px] text-[#fafaf9] placeholder:text-[#44403c] focus:outline-none focus:border-[rgba(226,169,110,0.4)] focus:shadow-[0_0_0_3px_rgba(226,169,110,0.08)] transition-all"
                placeholder="name@talentspring-academy.com"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-[12px] font-medium uppercase tracking-[0.08em] text-[#57534e] mb-2"
              >
                Passwort
              </label>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.03)] px-4 py-2.5 text-[14px] text-[#fafaf9] placeholder:text-[#44403c] focus:outline-none focus:border-[rgba(226,169,110,0.4)] focus:shadow-[0_0_0_3px_rgba(226,169,110,0.08)] transition-all"
              />
            </div>

            {error && (
              <div className="rounded-lg bg-[rgba(248,113,113,0.08)] border border-[rgba(248,113,113,0.15)] px-3.5 py-2.5">
                <p className="text-[13px] text-red-400">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#e2a96e] to-[#c4956a] py-2.5 text-[14px] font-semibold text-[#0c0c0e] hover:shadow-[0_0_24px_rgba(226,169,110,0.3)] transition-all duration-300 disabled:opacity-50"
            >
              {loading ? (
                "Wird angemeldet..."
              ) : (
                <>
                  <LogIn className="h-4 w-4" />
                  Anmelden
                </>
              )}
            </button>
          </form>
        </div>

        {/* Footer */}
        <p className="text-center mt-8 text-[11px] text-[#44403c]">
          Talentspring Payroll Academy
        </p>
      </div>
    </div>
  );
}
