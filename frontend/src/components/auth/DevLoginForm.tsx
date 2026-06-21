"use client";

import { FormEvent, useState } from "react";

export function DevLoginForm() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/dev-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (!res.ok) {
        const data = (await res.json()) as { detail?: string };
        setError(data.detail ?? "Login failed.");
        return;
      }

      // Full page navigation so middleware picks up the new cookie immediately
      window.location.href = "/notes";
    } catch {
      setError("Could not reach the server. Is Next.js running?");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="w-full space-y-3">
      <input
        type="email"
        required
        placeholder="Email address"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="w-full border border-[#957139] rounded-md h-[39px] px-4 text-xs font-sans bg-transparent outline-none focus:ring-1 focus:ring-[#957139] placeholder:text-black/30"
      />

      {error && (
        <p className="text-xs text-red-500 font-sans">{error}</p>
      )}

      <button
        type="submit"
        disabled={loading || !email}
        className="w-full border border-[#957139] rounded-full h-[43px] flex items-center justify-center text-[#957139] font-sans font-bold text-base hover:bg-[#957139]/10 transition-colors disabled:opacity-50"
      >
        {loading ? "Logging in…" : "Log In"}
      </button>

      <p className="text-center text-[10px] font-sans text-black/40 pt-1">
        Dev mode — any email, no password required
      </p>
    </form>
  );
}
