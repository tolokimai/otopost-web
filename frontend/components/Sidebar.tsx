"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/lib/auth";

export default function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const navItems = [
    {
      label: "Dashboard",
      href: "/dashboard",
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
        </svg>
      ),
    },
    {
      label: "Persona Studio",
      href: "/persona",
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      ),
    },
    {
      label: "Content Plan",
      href: "/content-plan",
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
    },
    {
      label: "Studio Workspace",
      href: "/studio",
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
      ),
      subItems: [
        { label: "Carousel Studio", href: "/studio/carousel", icon: "🖼️" },
        { label: "Podcast Clip Studio", href: "/studio/podcast", icon: "✂️" },
        { label: "Remake & Lip-Sync", href: "/studio/remake", icon: "👄" },
      ],
    },
    {
      label: "Settings & Integrations",
      href: "/settings",
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
    },
  ];

  return (
    <>
      {/* Mobile Top Header */}
      <header className="lg:hidden sticky top-0 z-40 flex items-center justify-between border-b border-white/10 bg-[#0c1019]/95 px-4 py-3 backdrop-blur-md">
        <Link href="/dashboard" className="flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-brand to-brand-accent text-white font-bold text-sm shadow-md">
            🎬
          </span>
          <span className="font-extrabold text-base tracking-tight text-white">
            AutoPost <span className="text-brand-accent">Studio</span>
          </span>
        </Link>
        <button
          type="button"
          onClick={() => setMobileOpen(!mobileOpen)}
          className="rounded-lg border border-white/15 p-2 text-slate-300 hover:bg-white/10"
          aria-label="Toggle Navigation Menu"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </header>

      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm lg:hidden animate-in fade-in"
        />
      )}

      {/* Persistent Sidebar (Desktop & Mobile Drawer) */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 flex w-64 flex-col border-r border-white/10 bg-[#0c1019] transition-transform duration-200 lg:translate-x-0 ${
          mobileOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"
        }`}
      >
        {/* Brand Header */}
        <div className="flex h-16 items-center justify-between border-b border-white/10 px-5">
          <Link href="/dashboard" className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-brand to-brand-accent text-white font-bold shadow-lg shadow-brand/25">
              🎬
            </span>
            <div>
              <div className="font-extrabold text-sm leading-tight text-white">
                AutoPost <span className="text-brand-accent">Studio</span>
              </div>
              <div className="text-[10px] font-medium text-slate-400">AI Auto-Pilot & Creator OS</div>
            </div>
          </Link>
          <button
            onClick={() => setMobileOpen(false)}
            className="rounded-lg p-1 text-slate-400 hover:text-white lg:hidden"
          >
            ✕
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1.5 text-sm">
          {navItems.map((item) => {
            const isActive = pathname === item.href || (item.href === "/dashboard" && pathname === "/");
            const isParentActive = item.subItems?.some((sub) => pathname.startsWith(sub.href)) || false;

            return (
              <div key={item.href} className="space-y-1">
                <Link
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-3 rounded-xl px-3.5 py-2.5 font-medium transition-all ${
                    isActive || isParentActive
                      ? "bg-brand/15 text-brand-accent font-semibold border border-brand/30 shadow-sm"
                      : "text-slate-300 hover:bg-white/[0.05] hover:text-white"
                  }`}
                >
                  <span className={isActive || isParentActive ? "text-brand-accent" : "text-slate-400"}>
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                </Link>

                {/* Sub-items for Studio Workspace */}
                {item.subItems && (
                  <div className="ml-7 pl-2 border-l border-white/10 space-y-1 pt-0.5">
                    {item.subItems.map((sub) => {
                      const isSubActive = pathname === sub.href;
                      return (
                        <Link
                          key={sub.href}
                          href={sub.href}
                          onClick={() => setMobileOpen(false)}
                          className={`flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs transition-all ${
                            isSubActive
                              ? "bg-brand/20 text-white font-semibold"
                              : "text-slate-400 hover:bg-white/[0.04] hover:text-slate-200"
                          }`}
                        >
                          <span>{sub.icon}</span>
                          <span>{sub.label}</span>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}

          <div className="pt-3 border-t border-white/10 mt-3 space-y-1">
            <Link
              href="/pricing"
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 rounded-xl px-3.5 py-2 text-xs font-medium transition-all ${
                pathname === "/pricing"
                  ? "bg-brand/15 text-brand-accent font-semibold"
                  : "text-slate-400 hover:bg-white/[0.05] hover:text-slate-200"
              }`}
            >
              <span>💎</span>
              <span>Paket & Langganan</span>
            </Link>

            {user?.isAdmin && (
              <Link
                href="/admin"
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-3 rounded-xl px-3.5 py-2 text-xs font-medium transition-all ${
                  pathname.startsWith("/admin")
                    ? "bg-purple-500/20 text-purple-300 font-semibold"
                    : "text-purple-400 hover:bg-purple-500/10"
                }`}
              >
                <span>👑</span>
                <span>Admin Panel</span>
              </Link>
            )}
          </div>
        </nav>

        {/* User Card & Logout Bottom */}
        <div className="border-t border-white/10 bg-[#0a0d14] p-3.5">
          {user ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="truncate">
                  <div className="truncate text-xs font-semibold text-white">{user.name || user.email}</div>
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                    <span className="capitalize text-brand-accent font-semibold">{user.plan}</span>
                    <span>·</span>
                    <span>{user.credits} kredit</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    logout();
                    setMobileOpen(false);
                  }}
                  title="Keluar"
                  className="rounded-lg border border-white/10 p-1.5 text-slate-400 hover:bg-white/10 hover:text-red-400 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                </button>
              </div>
            </div>
          ) : (
            <div className="flex gap-2">
              <Link
                href="/login"
                onClick={() => setMobileOpen(false)}
                className="flex-1 rounded-xl bg-brand px-3 py-2 text-center text-xs font-bold text-white hover:brightness-110"
              >
                Masuk
              </Link>
              <Link
                href="/register"
                onClick={() => setMobileOpen(false)}
                className="flex-1 rounded-xl border border-white/15 px-3 py-2 text-center text-xs font-semibold text-slate-300 hover:bg-white/5"
              >
                Daftar
              </Link>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
