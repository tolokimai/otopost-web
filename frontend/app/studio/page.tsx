"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import Header from "@/components/Header";
import { api, type StudioMenu } from "@/lib/api";
import { useAuth } from "@/lib/auth";

const FALLBACK: StudioMenu[] = [
  { id: "podcast", label: "Podcast Clip", description: "Ubah podcast panjang jadi klip viral.", icon: "✂️", href: "/studio/podcast", isEnabled: true, isReady: true, requiredPlan: "free", sortOrder: 10 },
  { id: "carousel", label: "Carousel", description: "Buat dan render carousel siap posting.", icon: "🖼️", href: "/studio/carousel", isEnabled: true, isReady: true, requiredPlan: "free", sortOrder: 20 },
  { id: "self-video", label: "Video Sendiri", description: "Hook banner, subtitle, dan format vertikal.", icon: "🎥", href: "/studio/self-video", isEnabled: true, isReady: false, requiredPlan: "creator", sortOrder: 30 },
  { id: "ai-video", label: "Buat Video AI", description: "Generate video dari prompt dengan model AI.", icon: "✨", href: "/studio/ai-video", isEnabled: true, isReady: false, requiredPlan: "pro", sortOrder: 40 },
  { id: "remake", label: "Remake & Lipsync", description: "Remake video dan true lipsync MuseTalk 1.5.", icon: "👄", href: "/studio/remake", isEnabled: true, isReady: true, requiredPlan: "creator", sortOrder: 50 },
];

const RANK: Record<string, number> = { free: 0, creator: 1, pro: 2 };

export default function StudioHub() {
  const { user, loading } = useAuth();
  const [menus, setMenus] = useState<StudioMenu[]>(FALLBACK);

  useEffect(() => {
    api.getStudioMenus().then((data) => setMenus(data.menus)).catch(() => undefined);
  }, []);

  return (
    <main className="mx-auto max-w-5xl px-4 pb-24">
      <Header />
      <section className="py-10">
        <div className="text-sm font-semibold text-brand-accent">CONTENT PRODUCTION OS</div>
        <h1 className="mt-2 text-3xl font-extrabold sm:text-4xl">Pilih workflow Studio</h1>
        <p className="mt-3 max-w-2xl text-slate-400">
          Produksi klip, carousel, dan remake dari satu tempat. Susunan serta akses menu dikendalikan admin tanpa redeploy.
        </p>
      </section>

      {!loading && !user ? (
        <div className="mb-6 rounded-xl border border-brand/30 bg-brand/10 p-4 text-sm text-slate-200">
          <Link href="/login?next=/studio" className="font-semibold text-brand-accent">Masuk</Link>{" "}
          agar project, media, dan hasil produksi tersimpan di akunmu.
        </div>
      ) : null}

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {menus.map((menu) => {
          const locked = Boolean(user) && (RANK[user?.plan || "free"] ?? 0) < (RANK[menu.requiredPlan] ?? 0);
          const href = !menu.isReady ? "#" : locked ? "/pricing" : menu.href;
          return (
            <Link
              key={menu.id}
              href={href}
              aria-disabled={!menu.isReady}
              className={`group rounded-2xl border p-6 transition ${
                menu.isReady
                  ? "border-white/10 bg-white/[0.03] hover:-translate-y-1 hover:border-brand/60 hover:bg-brand/10"
                  : "cursor-not-allowed border-white/5 bg-white/[0.02] opacity-55"
              }`}
            >
              <div className="flex items-start justify-between">
                <span className="text-3xl">{menu.icon}</span>
                <span className={`rounded-full px-2 py-1 text-[10px] font-semibold uppercase ${
                  menu.isReady ? "bg-green-500/15 text-green-300" : "bg-white/5 text-slate-500"
                }`}>
                  {locked ? `Butuh ${menu.requiredPlan}` : menu.isReady ? "Aktif" : "Dalam pengembangan"}
                </span>
              </div>
              <h2 className="mt-5 text-lg font-bold group-hover:text-brand-accent">{menu.label}</h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-400">{menu.description}</p>
              {menu.isReady ? <div className="mt-5 text-sm font-semibold text-brand-accent">{locked ? "Lihat paket →" : "Buka workflow →"}</div> : null}
            </Link>
          );
        })}
      </section>
    </main>
  );
}
