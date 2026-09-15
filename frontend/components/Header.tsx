"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { api, type StudioMenu } from "@/lib/api";
import { useAuth } from "@/lib/auth";

const CONTENT_ENGINE_IDS = new Set(["persona", "content-plan", "content-library"]);

export default function Header() {
  const { user, loading, logout } = useAuth();
  const [engineMenus, setEngineMenus] = useState<StudioMenu[]>([]);

  useEffect(() => {
    if (!user) {
      setEngineMenus([]);
      return;
    }
    api.getStudioMenus()
      .then((data) => setEngineMenus(data.menus.filter((menu) => CONTENT_ENGINE_IDS.has(menu.id) && menu.isReady)))
      .catch(() => setEngineMenus([]));
  }, [user]);

  return (
    <header className="flex flex-wrap items-center justify-between gap-3 py-5">
      <Link href="/" className="flex items-center gap-2">
        <span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-brand to-brand-accent text-sm">
          🎬
        </span>
        <span className="font-extrabold tracking-tight">
          OtoPost <span className="text-brand-accent">Studio</span>
        </span>
      </Link>
      <nav className="flex flex-wrap items-center gap-3 text-xs">
        <Link href="/studio" className="text-slate-300 hover:text-white">
          Studio
        </Link>
        <Link href="/pricing" className="text-slate-300 hover:text-white">
          Harga
        </Link>
        {!loading && user ? engineMenus.map((menu) => (
          <Link key={menu.id} href={menu.href} className="text-slate-300 hover:text-white">
            {menu.label}
          </Link>
        )) : null}
        {loading ? null : user ? (
          <>
            {user.isAdmin ? (
              <Link href="/admin" className="font-semibold text-amber-300 hover:text-amber-200">
                Admin
              </Link>
            ) : null}
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
            <Link href="/register" className="rounded-lg bg-brand px-3 py-1 font-semibold text-white">
              Daftar
            </Link>
          </>
        )}
      </nav>
    </header>
  );
}
