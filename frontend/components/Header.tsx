"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { api, type StudioMenu } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useTheme } from "@/lib/theme";
import { useTranslation } from "@/lib/i18n";

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
  const { theme, resolvedTheme, setTheme } = useTheme();
  const { locale, setLocale, t } = useTranslation();

  return (
    <header className="flex flex-wrap items-center justify-between gap-4 py-5 border-b border-token mb-6">
      <Link href="/" className="flex items-center gap-2">
        <span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 text-sm shadow-md">
          🎬
        </span>
        <span className="font-extrabold tracking-tight text-token text-base">
          OtoPost <span className="text-indigo-400">Studio</span>
        </span>
      </Link>

      <nav className="flex flex-wrap items-center gap-3 text-xs">
        <Link href="/studio" className="text-token-muted hover:text-token transition-colors">
          Studio
        </Link>
        <Link href="/pricing" className="text-token-muted hover:text-token transition-colors">
          {t("billing.pricing_title").split(" ")[0]}
        </Link>
        {!loading && user ? engineMenus.map((menu) => (
          <Link key={menu.id} href={menu.href} className="text-slate-300 hover:text-white">
            {menu.label}
          </Link>
        )) : null}
        {loading ? null : user ? (
          <>
            {user.isAdmin ? (
              <Link href="/admin" className="font-semibold text-amber-400 hover:text-amber-300">
                Admin
              </Link>
            ) : null}
            <Link href="/account" className="text-token-muted hover:text-token font-medium">
              {user.name || user.email.split("@")[0]} · {user.credits} kredit
            </Link>
            <button
              onClick={logout}
              className="rounded-lg border border-token px-3 py-1 text-token-muted hover:text-token transition-colors"
            >
              {t("auth.logout")}
            </button>
          </>
        ) : (
          <>
            <Link href="/login" className="text-token-muted hover:text-token transition-colors">
              {t("auth.login_btn")}
            </Link>
            <Link href="/register" className="rounded-lg btn-primary px-3 py-1 font-semibold">
              {t("auth.register_btn")}
            </Link>
          </>
        )}

        <div className="flex items-center gap-1.5 pl-2 border-l border-token">
          {/* Language Switcher */}
          <button
            onClick={() => setLocale(locale === "id" ? "en" : "id")}
            className="rounded-lg border border-token px-2 py-1 text-[11px] font-semibold text-token-muted hover:text-token transition-colors"
            title="Switch Language"
          >
            {locale.toUpperCase()}
          </button>

          {/* Theme Switcher */}
          <button
            onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
            className="rounded-lg border border-token px-2 py-1 text-[11px] font-semibold text-token-muted hover:text-token transition-colors"
            title={`Toggle Theme (Current: ${theme})`}
          >
            {resolvedTheme === "dark" ? "🌙" : "☀️"}
          </button>
        </div>
      </nav>
    </header>
  );
}

