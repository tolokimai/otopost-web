"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState, type FormEvent } from "react";

import { useAuth } from "@/lib/auth";

function LoginForm() {
  const { login } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/studio";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await login(email.trim(), password);
      router.replace(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4">
      <Link href="/" className="mb-8 flex items-center gap-2 self-center">
        <span className="grid h-9 w-9 place-items-center rounded-lg bg-gradient-to-br from-brand to-brand-accent">
          🎬
        </span>
        <span className="text-lg font-extrabold tracking-tight">
          OtoPost <span className="text-brand-accent">Studio</span>
        </span>
      </Link>
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
        <h1 className="mb-1 text-xl font-bold">Masuk</h1>
        <p className="mb-5 text-sm text-slate-400">Lanjut bikin klip viral dari podcast.</p>
        {error ? (
          <div className="mb-4 rounded-xl border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">
            {error}
          </div>
        ) : null}
        <form onSubmit={submit} className="flex flex-col gap-3">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            autoComplete="email"
            className="rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm outline-none focus:border-brand"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            autoComplete="current-password"
            className="rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm outline-none focus:border-brand"
          />
          <button
            type="submit"
            disabled={busy}
            className="mt-1 rounded-xl bg-brand px-5 py-3 text-sm font-semibold text-white disabled:opacity-50"
          >
            {busy ? "Memproses…" : "Masuk"}
          </button>
        </form>
        <p className="mt-4 text-center text-sm text-slate-400">
          Belum punya akun?{" "}
          <Link href="/register" className="text-brand-accent">
            Daftar
          </Link>
        </p>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
