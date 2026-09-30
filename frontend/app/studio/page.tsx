"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import Header from "@/components/Header";
import { api, type StudioMenu } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useTranslation } from "@/lib/i18n";

const FALLBACK: StudioMenu[] = [
<<<<<<< Updated upstream
  { id: "persona", label: "Brand Persona", description: "Fondasi audiens, offer, tone, dan pilar konten.", icon: "🧬", href: "/personas", isEnabled: true, isReady: true, requiredPlan: "free", sortOrder: 1 },
  { id: "content-plan", label: "Content Planner", description: "Kalender konten AI 7/30 hari dari persona.", icon: "🗓️", href: "/planner", isEnabled: true, isReady: true, requiredPlan: "creator", sortOrder: 2 },
  { id: "content-library", label: "Content Library", description: "Review, approval, produksi, jadwal, dan hasil.", icon: "🗂️", href: "/library", isEnabled: true, isReady: true, requiredPlan: "free", sortOrder: 3 },
  { id: "podcast", label: "Podcast Clip", description: "Ubah podcast panjang jadi klip viral.", icon: "✂️", href: "/studio/podcast", isEnabled: true, isReady: true, requiredPlan: "free", sortOrder: 10 },
  { id: "carousel", label: "Carousel", description: "Buat dan render carousel siap posting.", icon: "🖼️", href: "/studio/carousel", isEnabled: true, isReady: true, requiredPlan: "free", sortOrder: 20 },
  { id: "self-video", label: "Video Sendiri", description: "Hook banner, subtitle, dan format vertikal.", icon: "🎥", href: "/studio/self-video", isEnabled: true, isReady: false, requiredPlan: "creator", sortOrder: 30 },
  { id: "ai-video", label: "Buat Video AI", description: "Generate video dari prompt dengan model AI.", icon: "✨", href: "/studio/ai-video", isEnabled: true, isReady: false, requiredPlan: "pro", sortOrder: 40 },
=======
  { id: "podcast", label: "Podcast Clip", description: "Ubah podcast panjang jadi klip vertikal viral.", icon: "✂️", href: "/studio/podcast", isEnabled: true, isReady: true, requiredPlan: "free", sortOrder: 10 },
  { id: "carousel", label: "Carousel", description: "Buat dan render carousel visual siap posting.", icon: "🖼️", href: "/studio/carousel", isEnabled: true, isReady: true, requiredPlan: "free", sortOrder: 20 },
  { id: "self-video", label: "Video Sendiri", description: "Hook banner, subtitle dinamis, dan format vertikal.", icon: "🎥", href: "/studio/self-video", isEnabled: true, isReady: false, requiredPlan: "creator", sortOrder: 30 },
  { id: "ai-video", label: "Buat Video AI", description: "Generate video dari teks dengan model AI terkini.", icon: "✨", href: "/studio/ai-video", isEnabled: true, isReady: false, requiredPlan: "pro", sortOrder: 40 },
>>>>>>> Stashed changes
  { id: "remake", label: "Remake & Lipsync", description: "Remake video dan true lipsync MuseTalk 1.5.", icon: "👄", href: "/studio/remake", isEnabled: true, isReady: true, requiredPlan: "creator", sortOrder: 50 },
];

const RANK: Record<string, number> = { free: 0, creator: 1, pro: 2 };

export default function StudioHub() {
  const { user, loading } = useAuth();
  const { t } = useTranslation();
  const [menus, setMenus] = useState<StudioMenu[]>(FALLBACK);

  useEffect(() => {
    api.getStudioMenus().then((data) => setMenus(data.menus)).catch(() => undefined);
  }, []);

  return (
    <main className="mx-auto max-w-5xl px-4 pb-24 text-token">
      <Header />
<<<<<<< Updated upstream
      <section className="py-10">
        <div className="text-sm font-semibold text-brand-accent">CONTENT PRODUCTION OS</div>
        <h1 className="mt-2 text-3xl font-extrabold sm:text-4xl">Pilih workflow Studio</h1>
        <p className="mt-3 max-w-2xl text-slate-400">
          Mulai dari Persona, rencanakan konten, approve di Library, lalu produksi lewat workflow Studio. Susunan serta akses menu dikendalikan admin tanpa redeploy.
=======
      <section className="py-12">
        <div className="text-xs font-bold uppercase tracking-wider text-brand">
          Content Production OS
        </div>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">
          {t("studio.hub_title")}
        </h1>
        <p className="mt-3 max-w-2xl text-muted text-sm sm:text-base leading-relaxed">
          {t("studio.hub_desc")}. Seluruh susunan alur kerja dan konfigurasi dikelola dinamis tanpa redeploy.
>>>>>>> Stashed changes
        </p>
      </section>

      {!loading && !user && (
        <div className="mb-8 rounded-2xl border border-brand/30 bg-brand/10 p-5 text-sm">
          <Link href="/login?next=/studio" className="font-bold text-brand hover:underline">
            {t("auth.login_btn")}
          </Link>{" "}
          agar seluruh proyek, aset media, dan histori produksi Anda tersimpan aman di akun.
        </div>
      )}

      <section className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {menus.map((menu) => {
          const locked = Boolean(user) && (RANK[user?.plan || "free"] ?? 0) < (RANK[menu.requiredPlan] ?? 0);
          const href = !menu.isReady ? "#" : locked ? "/pricing" : menu.href;
          return (
            <Link
              key={menu.id}
              href={href}
              aria-disabled={!menu.isReady}
              className={`group flex flex-col rounded-2xl border p-6 transition-all ${
                menu.isReady
                  ? "border-token bg-surface shadow-sm hover:-translate-y-1 hover:border-brand/60 hover:shadow-md"
                  : "cursor-not-allowed border-token bg-surface opacity-50"
              }`}
            >
              <div className="flex items-start justify-between">
                <span className="text-3xl">{menu.icon}</span>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider ${
                    menu.isReady
                      ? "bg-emerald-500/15 text-emerald-400"
                      : "bg-surface-hover text-muted"
                  }`}
                >
                  {locked ? `Butuh ${menu.requiredPlan}` : menu.isReady ? "Aktif" : "Segera Hadir"}
                </span>
              </div>
              <h2 className="mt-5 text-lg font-bold group-hover:text-brand transition-colors">
                {menu.label}
              </h2>
              <p className="mt-2 flex-1 text-xs leading-relaxed text-muted">
                {menu.description}
              </p>
              {menu.isReady && (
                <div className="mt-6 text-xs font-bold text-brand group-hover:underline">
                  {locked ? "Lihat paket →" : "Buka workflow →"}
                </div>
              )}
            </Link>
          );
        })}
      </section>
    </main>
  );
}

