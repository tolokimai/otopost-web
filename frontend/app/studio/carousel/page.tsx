"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import Header from "@/components/Header";
import CarouselCanvas from "@/components/carousel/CarouselCanvas";
import CarouselInspector from "@/components/carousel/CarouselInspector";
import {
  api,
  mediaUrl,
  type CarouselDesign,
  type CarouselPayload,
  type CarouselProject,
  type CarouselRender,
  type CarouselSlide,
  type ContentPlanItem,
} from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useTranslation } from "@/lib/i18n";
import { consumeStudioPlanPrefill } from "@/lib/studio-prefill";
import StudioPlanPrefill from "@/components/content-plan/StudioPlanPrefill";
import { Toast } from "@/components/ui/Toast";
import { Confirm } from "@/components/ui/Confirm";

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

function readDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export default function CarouselStudioPage() {
  const { user } = useAuth();
  const { t } = useTranslation();

  const [title, setTitle] = useState("Carousel Baru");
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
  const [planPrefill, setPlanPrefill] = useState<ContentPlanItem | null>(null);

  const payload = useMemo<CarouselPayload>(() => ({ title, slides, design }), [title, slides, design]);
  const current = slides[Math.min(active, slides.length - 1)];

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const handoffTitle = params.get("title") || params.get("topic") || "";
    const hook = params.get("hook") || "";
    const brief = params.get("brief") || "";
    const cta = params.get("cta") || "";
    const targetAudience = params.get("audience") || "";
    if (handoffTitle) { setTitle(handoffTitle); setTopic(handoffTitle); }
    if (targetAudience) setAudience(targetAudience);
    if (handoffTitle || hook || brief || cta) {
      setSlides([
        { headline: hook || handoffTitle || "Hook utama", body: brief || "Jelaskan masalah utama audiens.", subtext: "HOOK" },
        { headline: handoffTitle || "Insight utama", body: brief || "Uraikan insight dan langkah praktis.", subtext: "INSIGHT" },
        { headline: cta || "Ajak audiens bertindak", body: "Sesuaikan penutup dan CTA sebelum render.", subtext: "CTA" },
      ]);
      setSlideCount(3);
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    api.carouselProjects().then((data) => setProjects(data.projects)).catch(() => undefined);
  }, [user]);

  useEffect(() => {
    const plan = consumeStudioPlanPrefill();
    if (!plan) return;
    setPlanPrefill(plan);
    applyPlanPrefill(plan);
  }, []);

  function applyPlanPrefill(plan: ContentPlanItem) {
    setTitle(plan.topic);
    setTopic(plan.topic);
    setSlides([
      { headline: plan.hook || plan.topic, body: plan.topic, subtext: "HOOK" },
      { headline: "Outline & Insight", body: plan.outline, subtext: "INSIGHT" },
      {
        headline: "Caption & CTA",
        body: [plan.caption, plan.hashtags].filter(Boolean).join("\n\n"),
        subtext: "CTA",
      },
    ]);
    setSlideCount(3);
    setActive(0);
    setProjectId(null);
    setOutput(null);
  }

  function patchSlide(index: number, patch: Partial<CarouselSlide>) {
    setSlides((items) => items.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  }

  function addSlide() {
    setSlides((items) => [...items, { headline: "Slide baru", body: "Isi pesan utama.", subtext: "INSIGHT" }]);
    setActive(slides.length);
  }

  function removeSlide(index: number) {
    if (slides.length <= 1) {
      Toast.warning("Minimal harus ada satu slide");
      return;
    }
    Confirm.delete("Hapus slide ini dari carousel?", () => {
      setSlides((items) => items.filter((_, i) => i !== index));
      setActive((value) => Math.max(0, Math.min(value, slides.length - 2)));
      Toast.success("Slide berhasil dihapus");
    });
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
    if (!topic.trim()) {
      Toast.warning("Masukkan topik konten carousel");
      return;
    }
    setBusy("AI sedang menyusun alur slide carousel...");
    try {
      const result = await api.carouselGenerate({
        topic: topic.trim(),
        audience,
        goal: "Edukasi dan konversi",
        tone: "Profesional, jelas, menarik",
        slideCount,
      });
      setTitle(result.title);
      setSlides(result.slides);
      setActive(0);
      setProjectId(null);
      setOutput(null);
      Toast.success("Slide carousel berhasil di-generate AI!");
    } catch (err: unknown) {
      Toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(null);
    }
  }

  async function save() {
    if (!user) {
      Toast.warning("Silakan masuk akun untuk menyimpan project");
      return;
    }
    setBusy("Menyimpan project...");
    try {
      const saved = projectId
        ? await api.carouselUpdateProject(projectId, payload)
        : await api.carouselCreateProject(payload);
      setProjectId(saved.id);
      setProjects((items) => [saved, ...items.filter((item) => item.id !== saved.id)]);
      Toast.success("Project carousel berhasil disimpan");
    } catch (err: unknown) {
      Toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(null);
    }
  }

  async function render() {
    setBusy("Merender gambar PNG resolusi penuh...");
    try {
      const result = await api.carouselRender(payload);
      setOutput(result);
      Toast.success(`${result.images.length} slide PNG dan ZIP berhasil dirender!`);
    } catch (err: unknown) {
      Toast.error(err instanceof Error ? err.message : String(err));
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
    Toast.info(`Project "${project.payload.title}" dibuka`);
  }

  return (
    <main className="mx-auto max-w-7xl px-4 pb-24 text-token">
      <Header />

      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <Link href="/studio" className="text-xs text-brand hover:underline font-semibold">
            ← Studio Hub
          </Link>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight">
            {t("studio.carousel_title")}
          </h1>
          <p className="text-xs text-muted">
            {t("studio.carousel_desc")}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => void save()}
            disabled={!!busy}
            className="rounded-xl border border-token bg-surface hover:bg-surface-hover px-4 py-2 text-xs font-semibold text-token disabled:opacity-50 transition-all"
          >
            {busy === "Menyimpan project..." ? t("common.saving") : t("common.save")}
          </button>
          <button
            type="button"
            onClick={() => void render()}
            disabled={!!busy}
            className="rounded-xl bg-gradient-to-r from-brand to-brand-accent px-4 py-2 text-xs font-bold text-white shadow-md hover:brightness-110 disabled:opacity-50 transition-all"
          >
            {busy === "Merender gambar PNG resolusi penuh..." ? "Merender..." : "Export PNG / ZIP"}
          </button>
        </div>
      </div>

      {busy && (
        <div className="sticky top-4 z-30 mb-6 flex items-center gap-3 rounded-2xl border border-brand/40 bg-surface/95 p-4 shadow-xl backdrop-blur-md text-sm text-brand font-medium">
          <div className="w-5 h-5 border-2 border-brand border-t-transparent rounded-full animate-spin" />
          <span>{busy}</span>
        </div>
      )}

      {planPrefill && (
        <StudioPlanPrefill
          plan={planPrefill}
          onChange={(updated) => {
            setPlanPrefill(updated);
            applyPlanPrefill(updated);
          }}
        />
      )}

      {/* Generator Toolbar */}
      <section className="mb-6 grid gap-3 rounded-2xl border border-token bg-surface p-4 lg:grid-cols-[1fr_180px_120px_auto]">
        <input
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="Topik konten (contoh: 7 tips copywriting memikat)"
          className="rounded-xl border border-token bg-surface-hover px-3.5 py-2 text-xs text-token focus:outline-none focus:border-brand"
        />
        <input
          value={audience}
          onChange={(e) => setAudience(e.target.value)}
          placeholder="Audiens target"
          className="rounded-xl border border-token bg-surface-hover px-3.5 py-2 text-xs text-token focus:outline-none focus:border-brand"
        />
        <input
          type="number"
          min={3}
          max={12}
          value={slideCount}
          onChange={(e) => setSlideCount(Number(e.target.value))}
          className="rounded-xl border border-token bg-surface-hover px-3 py-2 text-xs text-token focus:outline-none focus:border-brand"
        />
        <button
          type="button"
          onClick={() => void generate()}
          disabled={!!busy}
          className="rounded-xl bg-gradient-to-r from-brand to-brand-accent px-4 py-2 text-xs font-bold text-white shadow-md hover:brightness-110 whitespace-nowrap transition-all"
        >
          ✨ {t("studio.generate_btn")}
        </button>
      </section>

      {/* Editor & Preview Workspace */}
      <div className="grid gap-6 xl:grid-cols-[260px_minmax(320px,1fr)_340px]">
        {/* Slides Navigation */}
        <aside className="rounded-2xl border border-token bg-surface p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-token">Slide ({slides.length})</span>
            <button
              type="button"
              onClick={addSlide}
              className="text-xs text-brand hover:underline font-semibold"
            >
              + Tambah
            </button>
          </div>
          <div className="max-h-[640px] space-y-2 overflow-auto pr-1">
            {slides.map((slide, index) => (
              <button
                key={index}
                type="button"
                onClick={() => setActive(index)}
                className={`w-full rounded-xl border p-3 text-left transition-all ${
                  active === index
                    ? "border-brand bg-brand/15 shadow-sm text-brand"
                    : "border-token bg-surface-hover hover:border-brand/40 text-token"
                }`}
              >
                <div className="text-[10px] font-mono text-muted">SLIDE {index + 1}</div>
                <div className="mt-1 line-clamp-2 text-xs font-semibold">
                  {slide.headline || "(Tanpa Judul)"}
                </div>
              </button>
            ))}
          </div>

          {projects.length > 0 && (
            <div className="mt-4 border-t border-token pt-3">
              <div className="mb-1.5 text-xs text-muted font-medium">Buka Project Tersimpan</div>
              <select
                value={projectId || ""}
                onChange={(e) => openProject(e.target.value)}
                className="w-full rounded-xl border border-token bg-surface p-2 text-xs text-token focus:outline-none focus:border-brand"
              >
                <option value="">Pilih project...</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title}
                  </option>
                ))}
              </select>
            </div>
          )}
        </aside>

        {/* Live Canvas Preview */}
        <section className="flex min-h-[580px] items-center justify-center rounded-2xl border border-token bg-canvas p-6 shadow-inner">
          {current && (
            <CarouselCanvas
              slide={current}
              design={design}
              index={active}
              total={slides.length}
            />
          )}
        </section>

        {/* Slide Properties Inspector Component */}
        <CarouselInspector
          title={title}
          setTitle={setTitle}
          current={current}
          active={active}
          patchSlide={patchSlide}
          moveSlide={moveSlide}
          removeSlide={removeSlide}
          design={design}
          setDesign={setDesign}
          readDataUrl={readDataUrl}
        />
      </div>

      {/* Render Outputs */}
      {output && (
        <section className="mt-8 rounded-2xl border border-emerald-500/30 bg-emerald-500/[0.04] p-5 space-y-4 animate-in fade-in">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-sm font-bold text-emerald-400">Hasil Render Gambar PNG</h2>
            <a
              href={mediaUrl(output.zipUrl)}
              download
              className="rounded-xl bg-emerald-600 hover:bg-emerald-500 px-4 py-2 text-xs font-bold text-white shadow-md transition-colors"
            >
              Download Arsip ZIP
            </a>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {output.images.map((url, index) => (
              <a key={url} href={mediaUrl(url)} target="_blank" rel="noreferrer">
                <img
                  src={mediaUrl(url)}
                  alt={`Slide ${index + 1}`}
                  className="rounded-xl border border-token hover:border-emerald-500 transition-colors shadow-md"
                />
              </a>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}

