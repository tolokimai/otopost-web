"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import Header from "@/components/Header";
import {
  api,
  mediaUrl,
  type CarouselDesign,
  type CarouselPayload,
  type CarouselProject,
  type CarouselRender,
  type CarouselSlide,
} from "@/lib/api";
import { useAuth } from "@/lib/auth";

const DEFAULT_DESIGN: CarouselDesign = {
  aspectRatio: "4:5",
  backgroundTheme: "Gradient Indigo",
  typographyStyle: "Center Stage",
  fontFamily: "Sans",
  textColorHex: "#FFFFFF",
  accentColorHex: "#7C5CFF",
  baseFontScale: 1,
  textEffect: "shadow",
  ctaText: "Simpan & bagikan",
  watermarkText: "@brandkamu",
  showPageNumber: true,
  showSwipe: true,
};

const DEFAULT_SLIDES: CarouselSlide[] = [
  { headline: "Tulis hook carousel di sini", body: "Satu ide kuat yang membuat audiens ingin menggeser.", subtext: "HOOK" },
  { headline: "Berikan insight nyata", body: "Jelaskan masalah, fakta, atau langkah secara ringkas dan mudah dipindai.", subtext: "INSIGHT" },
  { headline: "Ajak audiens bertindak", body: "Tutup dengan CTA yang selaras dengan tujuan kontenmu.", subtext: "CTA" },
];

const ASPECT_CLASS: Record<string, string> = {
  "1:1": "aspect-square",
  "4:5": "aspect-[4/5]",
  "3:4": "aspect-[3/4]",
  "9:16": "aspect-[9/16]",
  "16:9": "aspect-video",
};

const THEMES: Record<string, string> = {
  "Solid Dark": "from-zinc-950 to-zinc-900",
  "Solid Light": "from-slate-100 to-slate-300",
  "Gradient Indigo": "from-slate-950 to-indigo-700",
  "Gradient Sunset": "from-rose-950 to-orange-500",
  "Cyber Neon": "from-fuchsia-950 to-indigo-900",
  Luxury: "from-zinc-950 to-amber-950",
  Minimal: "from-white to-slate-200",
};

function readDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export default function CarouselStudio() {
  const { user } = useAuth();
  const [title, setTitle] = useState("Carousel baru");
  const [topic, setTopic] = useState("");
  const [audience, setAudience] = useState("Kreator dan pemilik bisnis");
  const [slideCount, setSlideCount] = useState(7);
  const [slides, setSlides] = useState<CarouselSlide[]>(DEFAULT_SLIDES);
  const [design, setDesign] = useState<CarouselDesign>(DEFAULT_DESIGN);
  const [active, setActive] = useState(0);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [projects, setProjects] = useState<CarouselProject[]>([]);
  const [output, setOutput] = useState<CarouselRender | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const payload = useMemo<CarouselPayload>(() => ({ title, slides, design }), [title, slides, design]);
  const current = slides[Math.min(active, slides.length - 1)];
  const isLight = ["Solid Light", "Minimal"].includes(design.backgroundTheme) && !current?.imageBase64;

  useEffect(() => {
    if (!user) return;
    api.carouselProjects().then((data) => setProjects(data.projects)).catch(() => undefined);
  }, [user]);

  function patchSlide(index: number, patch: Partial<CarouselSlide>) {
    setSlides((items) => items.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  }

  function addSlide() {
    setSlides((items) => [...items, { headline: "Slide baru", body: "Isi pesan utama.", subtext: "INSIGHT" }]);
    setActive(slides.length);
  }

  function removeSlide(index: number) {
    if (slides.length <= 1) return;
    setSlides((items) => items.filter((_, i) => i !== index));
    setActive((value) => Math.max(0, Math.min(value, slides.length - 2)));
  }

  function moveSlide(index: number, delta: number) {
    const target = index + delta;
    if (target < 0 || target >= slides.length) return;
    setSlides((items) => {
      const copy = [...items];
      [copy[index], copy[target]] = [copy[target], copy[index]];
      return copy;
    });
    setActive(target);
  }

  async function generate() {
    if (!topic.trim()) return setError("Isi topik carousel dulu.");
    setBusy("AI menyusun alur slide…");
    setError(null);
    setMessage(null);
    try {
      const result = await api.carouselGenerate({
        topic: topic.trim(), audience, goal: "Edukasi dan konversi", tone: "Profesional, jelas, menarik", slideCount,
      });
      setTitle(result.title);
      setSlides(result.slides);
      setActive(0);
      setProjectId(null);
      setOutput(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(null);
    }
  }

  async function save() {
    if (!user) {
      setError("Masuk dulu untuk menyimpan project.");
      return;
    }
    setBusy("Menyimpan project…");
    setError(null);
    try {
      const saved = projectId
        ? await api.carouselUpdateProject(projectId, payload)
        : await api.carouselCreateProject(payload);
      setProjectId(saved.id);
      setProjects((items) => [saved, ...items.filter((item) => item.id !== saved.id)]);
      setMessage("Project tersimpan.");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(null);
    }
  }

  async function render() {
    setBusy("Merender PNG resolusi penuh…");
    setError(null);
    setMessage(null);
    try {
      const result = await api.carouselRender(payload);
      setOutput(result);
      setMessage(`${result.images.length} slide dan ZIP berhasil dibuat.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(null);
    }
  }

  function openProject(id: string) {
    const project = projects.find((item) => item.id === id);
    if (!project) return;
    setProjectId(project.id);
    setTitle(project.payload.title);
    setSlides(project.payload.slides);
    setDesign(project.payload.design);
    setActive(0);
    setOutput("images" in project.output ? (project.output as CarouselRender) : null);
  }

  return (
    <main className="mx-auto max-w-7xl px-4 pb-24">
      <Header />
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/studio" className="text-xs text-brand-accent">← Studio</Link>
          <h1 className="mt-1 text-2xl font-extrabold">Carousel Studio</h1>
          <p className="text-sm text-slate-400">AI outline, editor live, render PNG, dan export ZIP.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => void save()} disabled={!!busy} className="rounded-xl border border-white/15 px-4 py-2 text-sm font-semibold disabled:opacity-50">Simpan</button>
          <button onClick={() => void render()} disabled={!!busy} className="rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">Export PNG/ZIP</button>
        </div>
      </div>

      {busy ? <div className="mb-4 rounded-xl border border-brand/40 bg-brand/10 p-3 text-sm">⏳ {busy}</div> : null}
      {error ? <div className="mb-4 rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-200">{error}</div> : null}
      {message ? <div className="mb-4 rounded-xl border border-green-500/40 bg-green-500/10 p-3 text-sm text-green-200">{message}</div> : null}

      <section className="mb-5 grid gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4 lg:grid-cols-[1fr_180px_120px_auto]">
        <input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="Topik, contoh: 7 cara jualan ebook" className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none focus:border-brand" />
        <input value={audience} onChange={(e) => setAudience(e.target.value)} placeholder="Audiens" className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none focus:border-brand" />
        <input type="number" min={3} max={12} value={slideCount} onChange={(e) => setSlideCount(Number(e.target.value))} className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm" />
        <button onClick={() => void generate()} disabled={!!busy} className="rounded-xl bg-gradient-to-r from-brand to-brand-accent px-4 py-2 text-sm font-semibold">✨ Buat dengan AI</button>
      </section>

      <div className="grid gap-5 xl:grid-cols-[260px_minmax(320px,1fr)_330px]">
        <aside className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
          <div className="mb-2 flex items-center justify-between"><b className="text-sm">Slide ({slides.length})</b><button onClick={addSlide} className="text-xs text-brand-accent">+ Tambah</button></div>
          <div className="max-h-[680px] space-y-2 overflow-auto">
            {slides.map((slide, index) => (
              <button key={index} onClick={() => setActive(index)} className={`w-full rounded-xl border p-3 text-left ${active === index ? "border-brand bg-brand/10" : "border-white/5 bg-black/20"}`}>
                <div className="text-[10px] text-slate-500">SLIDE {index + 1}</div>
                <div className="mt-1 line-clamp-2 text-xs font-semibold">{slide.headline}</div>
              </button>
            ))}
          </div>
          {projects.length ? (
            <div className="mt-4 border-t border-white/10 pt-3">
              <div className="mb-2 text-xs text-slate-400">Project tersimpan</div>
              <select value={projectId || ""} onChange={(e) => openProject(e.target.value)} className="w-full rounded-lg border border-white/10 bg-slate-950 p-2 text-xs">
                <option value="">Pilih project…</option>
                {projects.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
              </select>
            </div>
          ) : null}
        </aside>

        <section className="flex min-h-[620px] items-center justify-center rounded-2xl border border-white/10 bg-black/30 p-5">
          {current ? (
            <div
              className={`relative w-full max-w-[500px] overflow-hidden rounded-xl bg-gradient-to-br shadow-2xl ${ASPECT_CLASS[design.aspectRatio] || ASPECT_CLASS["4:5"]} ${THEMES[design.backgroundTheme] || THEMES["Gradient Indigo"]}`}
              style={{ color: isLight ? "#111827" : design.textColorHex, backgroundImage: current.imageBase64 ? `linear-gradient(#0008,#0008),url(${current.imageBase64})` : undefined, backgroundSize: "cover", backgroundPosition: "center" }}
            >
              <div className="absolute -right-16 -top-16 h-52 w-52 rounded-full opacity-20" style={{ backgroundColor: design.accentColorHex }} />
              <div className="absolute inset-x-[9%] top-[12%] text-center">
                {current.subtext ? <span className="rounded-full px-3 py-1 text-[10px] font-bold uppercase text-white" style={{ backgroundColor: design.accentColorHex }}>{current.subtext}</span> : null}
              </div>
              <div className="absolute inset-x-[9%] top-[25%] text-center">
                <h2 className="text-2xl font-extrabold leading-tight sm:text-4xl" style={{ fontSize: `${design.baseFontScale * 2.25}rem`, textShadow: design.textEffect === "shadow" ? "0 4px 10px #0009" : undefined }}>{current.headline}</h2>
              </div>
              <div className="absolute inset-x-[13%] top-[57%] text-center text-sm leading-relaxed opacity-90 sm:text-base">{current.body}</div>
              <div className="absolute inset-x-[9%] bottom-[6%] flex justify-between text-[10px]"><span>{design.watermarkText}</span><span>{design.showPageNumber ? `${String(active + 1).padStart(2, "0")} / ${String(slides.length).padStart(2, "0")}` : ""}</span></div>
            </div>
          ) : null}
        </section>

        <aside className="space-y-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm">
          <input value={title} onChange={(e) => setTitle(e.target.value)} className="w-full rounded-lg border border-white/10 bg-black/30 p-2 font-semibold" />
          {current ? (
            <>
              <label className="block text-xs text-slate-400">Label<input value={current.subtext} onChange={(e) => patchSlide(active, { subtext: e.target.value })} className="mt-1 w-full rounded-lg border border-white/10 bg-black/30 p-2 text-white" /></label>
              <label className="block text-xs text-slate-400">Headline<textarea value={current.headline} onChange={(e) => patchSlide(active, { headline: e.target.value })} rows={3} className="mt-1 w-full rounded-lg border border-white/10 bg-black/30 p-2 text-white" /></label>
              <label className="block text-xs text-slate-400">Body<textarea value={current.body} onChange={(e) => patchSlide(active, { body: e.target.value })} rows={4} className="mt-1 w-full rounded-lg border border-white/10 bg-black/30 p-2 text-white" /></label>
              <label className="block text-xs text-slate-400">Background foto<input type="file" accept="image/*" onChange={async (e) => { const file = e.target.files?.[0]; if (file) patchSlide(active, { imageBase64: await readDataUrl(file) }); }} className="mt-1 block w-full text-xs" /></label>
              <div className="flex gap-2"><button onClick={() => moveSlide(active, -1)} className="rounded-lg border border-white/10 px-3 py-1">↑</button><button onClick={() => moveSlide(active, 1)} className="rounded-lg border border-white/10 px-3 py-1">↓</button><button onClick={() => removeSlide(active)} className="ml-auto text-xs text-red-300">Hapus slide</button></div>
            </>
          ) : null}
          <div className="grid grid-cols-2 gap-2 border-t border-white/10 pt-4">
            <label className="text-xs text-slate-400">Rasio<select value={design.aspectRatio} onChange={(e) => setDesign({ ...design, aspectRatio: e.target.value })} className="mt-1 w-full rounded-lg bg-slate-950 p-2 text-white">{["1:1", "4:5", "3:4", "9:16", "16:9"].map((v) => <option key={v}>{v}</option>)}</select></label>
            <label className="text-xs text-slate-400">Font<select value={design.fontFamily} onChange={(e) => setDesign({ ...design, fontFamily: e.target.value })} className="mt-1 w-full rounded-lg bg-slate-950 p-2 text-white">{["Sans", "Rounded", "Serif", "Monospace"].map((v) => <option key={v}>{v}</option>)}</select></label>
          </div>
          <label className="block text-xs text-slate-400">Tema<select value={design.backgroundTheme} onChange={(e) => setDesign({ ...design, backgroundTheme: e.target.value })} className="mt-1 w-full rounded-lg bg-slate-950 p-2 text-white">{Object.keys(THEMES).map((v) => <option key={v}>{v}</option>)}</select></label>
          <div className="grid grid-cols-2 gap-2"><label className="text-xs text-slate-400">Teks<input type="color" value={design.textColorHex} onChange={(e) => setDesign({ ...design, textColorHex: e.target.value })} className="mt-1 h-9 w-full" /></label><label className="text-xs text-slate-400">Aksen<input type="color" value={design.accentColorHex} onChange={(e) => setDesign({ ...design, accentColorHex: e.target.value })} className="mt-1 h-9 w-full" /></label></div>
          <label className="block text-xs text-slate-400">Watermark<input value={design.watermarkText} onChange={(e) => setDesign({ ...design, watermarkText: e.target.value })} className="mt-1 w-full rounded-lg border border-white/10 bg-black/30 p-2 text-white" /></label>
          <label className="block text-xs text-slate-400">CTA<input value={design.ctaText} onChange={(e) => setDesign({ ...design, ctaText: e.target.value })} className="mt-1 w-full rounded-lg border border-white/10 bg-black/30 p-2 text-white" /></label>
        </aside>
      </div>

      {output ? (
        <section className="mt-6 rounded-2xl border border-green-500/30 bg-green-500/5 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="font-bold">Hasil render</h2><a href={mediaUrl(output.zipUrl)} className="rounded-xl bg-green-500 px-4 py-2 text-sm font-bold text-black">Download ZIP</a></div>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">{output.images.map((url, index) => <a key={url} href={mediaUrl(url)} target="_blank"><img src={mediaUrl(url)} alt={`Slide ${index + 1}`} className="rounded-lg border border-white/10" /></a>)}</div>
        </section>
      ) : null}
    </main>
  );
}
