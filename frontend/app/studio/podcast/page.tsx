"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import Header from "@/components/Header";
import SegmentCard from "@/components/podcast/SegmentCard";
import ClipCard from "@/components/podcast/ClipCard";
import { useAuth } from "@/lib/auth";
import { useTranslation } from "@/lib/i18n";
import { Toast } from "@/components/ui/Toast";
import {
  api,
  type TranscriptResponse,
  type ViralSegment,
  type ClipResult,
  type ContentPlanItem,
  type HooksResponse,
} from "@/lib/api";
import { consumeStudioPlanPrefill } from "@/lib/studio-prefill";
import StudioPlanPrefill from "@/components/content-plan/StudioPlanPrefill";

const SUB_STYLES = [
  "clean",
  "bold",
  "box",
  "yellow",
  "tiktok",
  "karaoke",
  "minimal",
  "highlight",
  "neon",
  "pop",
];

type SelSeg = ViralSegment & { selected: boolean };

function fmtDur(sec?: number | null): string {
  if (!sec) return "—";
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

export default function PodcastStudioPage() {
  const { user, loading: authLoading } = useAuth();
  const { t } = useTranslation();
  const router = useRouter();
  const requireAuth = process.env.NEXT_PUBLIC_REQUIRE_AUTH === "true";

  const [url, setUrl] = useState("");
  const [plannerBrief, setPlannerBrief] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [video, setVideo] = useState<TranscriptResponse | null>(null);
  const [segments, setSegments] = useState<SelSeg[]>([]);
  const [clips, setClips] = useState<ClipResult[]>([]);
  const [content, setContent] = useState<Record<number, HooksResponse>>({});
  const [genIdx, setGenIdx] = useState<number | null>(null);
  const [planPrefill, setPlanPrefill] = useState<ContentPlanItem | null>(null);

  const [subtitle, setSubtitle] = useState(false);
  const [subtitleStyle, setSubtitleStyle] = useState("clean");
  const [aspect, setAspect] = useState("9:16");
  const [reframe, setReframe] = useState(true);

  const selectedCount = segments.filter((s) => s.selected).length;

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const topic = params.get("topic") || params.get("title") || "";
    const hook = params.get("hook") || "";
    const brief = params.get("brief") || "";
    if (topic || hook || brief) setPlannerBrief([topic, hook, brief].filter(Boolean).join(" · "));
  }, []);

  useEffect(() => {
    if (requireAuth && !authLoading && !user) {
      router.replace("/login?next=/studio/podcast");
    }
  }, [requireAuth, authLoading, user, router]);

  useEffect(() => {
    setPlanPrefill(consumeStudioPlanPrefill());
  }, []);

  async function handleTranscript() {
    if (!url.trim()) {
      Toast.warning("Masukkan URL YouTube terlebih dahulu");
      return;
    }
    setBusy("Mengambil transkrip video...");
    try {
      const data = await api.transcript({ url: url.trim() });
      setVideo(data);
      setSegments([]);
      setClips([]);
      setContent({});
      if (!data.hasTranscript) {
        Toast.warning("Video ini tidak memiliki transkrip otomatis.");
      } else {
        Toast.success("Transkrip berhasil diambil");
      }
    } catch (e: any) {
      Toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  }

  async function handleAnalyze() {
    if (!video) return;
    setBusy("AI sedang menganalisis momen viral...");
    try {
      const res = await api.analyze({
        topic: video.title || "",
        segments: (video.segments || []).map((s) => ({ startSec: s.startSec, text: s.text })),
        maxSegments: 15,
      });
      setSegments((res.segments || []).map((s) => ({ ...s, selected: true })));
      if (!res.segments || res.segments.length === 0) {
        Toast.warning("AI tidak menemukan momen viral yang signifikan.");
      } else {
        Toast.success(`Ditemukan ${res.segments.length} rekomendasi segmen viral!`);
      }
    } catch (e: any) {
      Toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  }

  function toggle(i: number) {
    setSegments((prev) => prev.map((s, idx) => (idx === i ? { ...s, selected: !s.selected } : s)));
  }

  function setAll(v: boolean) {
    setSegments((prev) => prev.map((s) => ({ ...s, selected: v })));
  }

  async function pollClips(job: string): Promise<ClipResult[]> {
    for (let i = 0; i < 180; i++) {
      await new Promise((r) => setTimeout(r, 4000));
      const st = await api.clipsStatus(job);
      setBusy(`Memotong klip di worker... (${st.status})`);
      if (st.status === "done") return st.clips || [];
      if (st.status === "error") throw new Error(st.error || "Gagal memproses klip");
    }
    throw new Error("Waktu tunggu proses video habis.");
  }

  async function handleCut(all: boolean) {
    const chosen = all ? segments : segments.filter((s) => s.selected);
    if (chosen.length === 0) {
      Toast.warning("Pilih minimal satu segmen");
      return;
    }
    setBusy(`Memotong ${chosen.length} klip video...`);
    const body = {
      url: url.trim(),
      segments: chosen.map((s) => ({ startSec: s.startSec, endSec: s.endSec, title: s.title })),
      aspectRatio: aspect,
      reframe,
      subtitle,
      subtitleStyle,
      maxHeight: 1080,
    };
    try {
      let result: ClipResult[] = [];
      try {
        const start = await api.clipsAsync(body);
        result = await pollClips(start.job);
      } catch {
        const data = await api.clipsSync(body);
        result = data.clips || [];
      }
      setClips(result);
      if (result.length > 0) {
        Toast.success(`${result.length} klip video siap diunduh!`);
      }
    } catch (e: any) {
      Toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  }

  async function handleGenContent(clip: ClipResult) {
    setGenIdx(clip.index);
    try {
      const c = await api.hooks({
        topic: [
          clip.title || `Klip ${clip.index}`,
          planPrefill?.topic,
          planPrefill?.hook,
          planPrefill?.outline,
        ].filter(Boolean).join("\n"),
        style: planPrefill
          ? `Energetic & Insightful; follow this plan caption and hashtags: ${planPrefill.caption} ${planPrefill.hashtags}`
          : "Energetic & Insightful",
      });
      setContent((prev) => ({ ...prev, [clip.index]: c }));
      Toast.success("Caption & Hook viral berhasil dibuat");
    } catch (e: any) {
      Toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setGenIdx(null);
    }
  }

  return (
    <main className="mx-auto max-w-4xl px-4 pb-24">
      <Header />

      <div className="mb-6 space-y-1">
        <h1 className="text-2xl font-extrabold text-token">
          {t("studio.podcast_title")}
        </h1>
        <p className="text-xs text-token-muted">
          {t("studio.podcast_desc")}
        </p>
      </div>

      {planPrefill && (
        <StudioPlanPrefill
          plan={planPrefill}
          onChange={setPlanPrefill}
        />
      )}

      {busy ? (
        <div className="sticky top-4 z-30 mb-6 flex items-center gap-3 rounded-2xl border border-indigo-500/40 bg-indigo-950/80 p-4 shadow-lg backdrop-blur-md text-sm text-indigo-200 animate-pulse">
          <div className="w-5 h-5 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
          <span>{busy}</span>
        </div>
      ) : null}

<<<<<<< Updated upstream
      {plannerBrief ? (
        <div className="mb-4 rounded-xl border border-brand/30 bg-brand/10 p-4 text-sm">
          <div className="font-semibold text-brand-accent">Brief dari Content Library</div>
          <p className="mt-1 text-slate-300">{plannerBrief}</p>
        </div>
      ) : null}

      <section className="mb-6 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
        <h2 className="mb-1 text-lg font-bold">1 · Sumber Video</h2>
        <p className="mb-3 text-sm text-slate-400">
          Tempel link YouTube podcast/panjang. Server yang unduh & transkrip.
        </p>
=======
      {/* Step 1: Input URL */}
      <section className="mb-6 rounded-2xl border border-token bg-surface p-5 space-y-3">
        <h2 className="text-sm font-bold text-token">1 · Sumber Video YouTube</h2>
>>>>>>> Stashed changes
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://youtube.com/watch?v=..."
            className="flex-1 rounded-xl border border-token bg-black/20 px-4 py-2.5 text-xs text-token focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
          <button
            onClick={handleTranscript}
            disabled={!!busy}
            className="rounded-xl btn-primary px-5 py-2.5 text-xs font-semibold"
          >
            {busy === "Mengambil transkrip video..." ? t("common.loading") : "Ambil Transkrip"}
          </button>
        </div>
      </section>

      {/* Step 2: Transcript */}
      {video ? (
        <section className="mb-6 rounded-2xl border border-token bg-surface p-5 space-y-3 animate-in fade-in">
          <h2 className="text-sm font-bold text-token">2 · Ringkasan Transkrip</h2>
          <div className="text-xs space-y-1">
            <div className="font-semibold text-token">{video.title}</div>
            <div className="text-token-muted">
              {video.channelName} · {fmtDur(video.durationSec)} ·{" "}
              {video.hasTranscript ? "Transkrip tersedia" : "Tanpa transkrip"}
            </div>
          </div>
          {video.hasTranscript ? (
            <details className="mt-2 text-xs">
              <summary className="cursor-pointer text-indigo-400 font-medium">Lihat teks transkrip lengkap</summary>
              <div className="mt-2 max-h-48 overflow-auto rounded-xl border border-token bg-black/30 p-3 leading-relaxed text-token-muted text-[11px]">
                {video.transcriptText}
              </div>
            </details>
          ) : null}
          <button
            onClick={handleAnalyze}
            disabled={!!busy || !video.hasTranscript}
            className="rounded-xl btn-primary px-5 py-2.5 text-xs font-semibold"
          >
            ✨ Analisis Momen Viral (AI)
          </button>
        </section>
      ) : null}

      {/* Step 3: Recommended Segments */}
      {segments.length > 0 ? (
        <section className="mb-6 rounded-2xl border border-token bg-surface p-5 space-y-4 animate-in fade-in">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-token">
              3 · Rekomendasi Segmen ({segments.length})
            </h2>
            <div className="flex gap-2 text-xs">
              <button
                onClick={() => setAll(true)}
                className="rounded-lg border border-token px-2.5 py-1 text-token-muted hover:text-token"
              >
                Pilih Semua
              </button>
              <button
                onClick={() => setAll(false)}
                className="rounded-lg border border-token px-2.5 py-1 text-token-muted hover:text-token"
              >
                Kosongkan
              </button>
            </div>
          </div>
          <div className="flex flex-col gap-3">
            {segments.map((s, i) => (
              <SegmentCard key={i} seg={s} index={i} selected={s.selected} onToggle={toggle} />
            ))}
          </div>
        </section>
      ) : null}

      {/* Step 4: Video Options & Cut */}
      {segments.length > 0 ? (
        <section className="mb-6 rounded-2xl border border-token bg-surface p-5 space-y-4 animate-in fade-in">
          <h2 className="text-sm font-bold text-token">4 · Opsi Format & Potong Klip</h2>
          <div className="grid grid-cols-2 gap-3 text-xs text-token">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={reframe}
                onChange={(e) => setReframe(e.target.checked)}
                className="h-4 w-4 rounded accent-indigo-500"
              />
              Reframe ke wajah (9:16)
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={subtitle}
                onChange={(e) => setSubtitle(e.target.checked)}
                className="h-4 w-4 rounded accent-indigo-500"
              />
              Sematkan Subtitle Dinamis
            </label>
          </div>

          <div className="space-y-1">
            <div className="text-[11px] text-token-muted">Rasio Aspek Video</div>
            <div className="flex gap-2">
              {["9:16", "1:1"].map((a) => (
                <button
                  key={a}
                  onClick={() => setAspect(a)}
                  className={`rounded-lg px-3 py-1 text-xs font-medium transition-colors ${
                    aspect === a ? "btn-primary" : "border border-token text-token-muted"
                  }`}
                >
                  {a}
                </button>
              ))}
            </div>
          </div>

          {subtitle ? (
            <div className="space-y-1">
              <div className="text-[11px] text-token-muted">Gaya Subtitle</div>
              <div className="flex flex-wrap gap-2">
                {SUB_STYLES.map((st) => (
                  <button
                    key={st}
                    onClick={() => setSubtitleStyle(st)}
                    className={`rounded-lg px-2.5 py-1 text-[11px] capitalize transition-colors ${
                      subtitleStyle === st ? "btn-primary" : "border border-token text-token-muted"
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              onClick={() => handleCut(false)}
              disabled={!!busy || selectedCount === 0}
              className="flex-1 rounded-xl btn-primary px-5 py-2.5 text-xs font-semibold"
            >
              Potong Terpilih ({selectedCount})
            </button>
            <button
              onClick={() => handleCut(true)}
              disabled={!!busy}
              className="flex-1 rounded-xl border border-token bg-surface hover:bg-surface-hover px-5 py-2.5 text-xs font-semibold text-token"
            >
              Potong Semua ({segments.length})
            </button>
          </div>
        </section>
      ) : null}

      {/* Step 5: Generated Clips */}
      {clips.length > 0 ? (
        <section className="mb-6 rounded-2xl border border-token bg-surface p-5 space-y-4 animate-in fade-in">
          <h2 className="text-sm font-bold text-token">
            5 · Hasil Klip Siap Posting ({clips.length})
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {clips.map((c) => (
              <ClipCard
                key={c.index}
                clip={c}
                content={content[c.index]}
                onGenerate={handleGenContent}
                generating={genIdx === c.index}
              />
            ))}
          </div>
        </section>
      ) : null}
    </main>
  );
}

