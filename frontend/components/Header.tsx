"use client";

import Link from "next/link";

import { useAuth } from "@/lib/auth";

export default function Header() {
  const { user, loading, logout } = useAuth();
  return (
    <header className="flex items-center justify-between py-5">
      <Link href="/" className="flex items-center gap-2">
        <span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-brand to-brand-accent text-sm">
          🎬
        </span>
        <span className="font-extrabold tracking-tight">
          OtoPost <span className="text-brand-accent">Studio</span>
        </span>
      </Link>
      <div className="flex items-center gap-3 text-xs">
        {loading ? null : user ? (
          <>
            <Link href="/account" className="text-slate-300 hover:text-white">
              {user.name || user.email.split("@")[0]} · {user.credits} kredit
            </Link>
            <button
              onClick={logout}
              className="rounded-lg border border-white/15 px-3 py-1 text-slate-300 hover:text-white"
            >
              Keluar
            </button>
          </>
        ) : (
          <>
            <Link href="/login" className="text-slate-300 hover:text-white">
              Masuk
            </Link>
            <Link
              href="/register"
              className="rounded-lg bg-brand px-3 py-1 font-semibold text-white"
            >
              Daftar
            </Link>
          </>
        )}
      </div>
    </header>
  );
}
