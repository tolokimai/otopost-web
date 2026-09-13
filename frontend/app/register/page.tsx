"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState, type FormEvent } from "react";

import { useAuth } from "@/lib/auth";

function RegisterForm() {
  const { register } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/studio";
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (password.length < 8) {
      setError("Password minimal 8 karakter.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await register(email.trim(), password, name.trim());
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
        <h1 className="mb-1 text-xl font-bold">Buat akun</h1>
        <p className="mb-5 text-sm text-slate-400">Mulai gratis — dapat kredit awal untuk mencoba.</p>
        {error ? (
          <div className="mb-4 rounded-xl border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">
            {error}
          </div>
        ) : null}
        <form onSubmit={submit} className="flex flex-col gap-3">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nama (opsional)"
            autoComplete="name"
            className="rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm outline-none focus:border-brand"
          />
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
            placeholder="Password (min. 8 karakter)"
            autoComplete="new-password"
            className="rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm outline-none focus:border-brand"
          />
          <button
            type="submit"
            disabled={busy}
            className="mt-1 rounded-xl bg-gradient-to-r from-brand to-brand-accent px-5 py-3 text-sm font-semibold text-white disabled:opacity-50"
          >
            {busy ? "Memproses…" : "Daftar gratis"}
          </button>
        </form>
        <p className="mt-4 text-center text-sm text-slate-400">
          Sudah punya akun?{" "}
          <Link href="/login" className="text-brand-accent">
            Masuk
          </Link>
        </p>
      </div>
    </main>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={null}>
      <RegisterForm />
    </Suspense>
  );
}
