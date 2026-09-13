"use client";

import { useState } from "react";
import Header from "@/components/Header";
import SegmentCard from "@/components/podcast/SegmentCard";
import ClipCard from "@/components/podcast/ClipCard";
import {
  api,
  type TranscriptResponse,
  type ViralSegment,
  type ClipResult,
  type HooksResponse,
} from "@/lib/api";

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

export default function StudioPage() {
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [video, setVideo] = useState<TranscriptResponse | null>(null);
  const [segments, setSegments] = useState<SelSeg[]>([]);
  const [clips, setClips] = useState<ClipResult[]>([]);
  const [content, setContent] = useState<Record<number, HooksResponse>>({});
  const [genIdx, setGenIdx] = useState<number | null>(null);

  const [subtitle, setSubtitle] = useState(false);
  const [subtitleStyle, setSubtitleStyle] = useState("clean");
  const [aspect, setAspect] = useState("9:16");
  const [reframe, setReframe] = useState(true);

  const selectedCount = segments.filter((s) => s.selected).length;

  async function handleTranscript() {
    if (!url.trim()) {
      setError("Masukkan URL video dulu.");
      return;
    }
    setError(null);
    setBusy("Mengambil transkrip dari server…");
    try {
      const data = await api.transcript({ url: url.trim() });
      setVideo(data);
      setSegments([]);
      setClips([]);
      setContent({});
      if (!data.hasTranscript) setError("Video ini tidak punya transkrip/subtitle otomatis.");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  }

  async function handleAnalyze() {
    if (!video) return;
    setError(null);
    setBusy("AI menganalisis transkrip (cari semua momen viral)…");
    try {
      const res = await api.analyze({
        topic: video.title || "",
        segments: (video.segments || []).map((s) => ({ startSec: s.startSec, text: s.text })),
        maxSegments: 15,
      });
      setSegments((res.segments || []).map((s) => ({ ...s, selected: true })));
      if (!res.segments || res.segments.length === 0)
        setError("AI tidak menemukan segmen. Coba video lain.");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
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
      await new Promise((r) => setTimeout(r, 5000));
      const st = await api.clipsStatus(job);
      setBusy(`Memproses klip di server… (${st.status})`);
      if (st.status === "done") return st.clips || [];
      if (st.status === "error") throw new Error(st.error || "gagal memproses");
    }
    throw new Error("Timeout menunggu klip.");
  }

  async function handleCut(all: boolean) {
    const chosen = all ? segments : segments.filter((s) => s.selected);
    if (chosen.length === 0) {
      setError("Pilih minimal satu segmen.");
      return;
    }
    setError(null);
    setBusy(`Memotong ${chosen.length} klip di server (bisa 1-3 menit)…`);
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
      if (result.length === 0) setError("Tidak ada klip yang berhasil dipotong.");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  }

  async function handleGenContent(clip: ClipResult) {
    setGenIdx(clip.index);
    try {
      const c = await api.hooks({
        topic: clip.title || `Klip ${clip.index}`,
        style: "Energetic & Insightful",
      });
      setContent((prev) => ({ ...prev, [clip.index]: c }));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setGenIdx(null);
    }
  }

  return (
    <main className="mx-auto max-w-3xl px-4 pb-24">
      <Header />

      {busy ? (
        <div className="sticky top-2 z-30 mb-4 rounded-xl border border-brand/40 bg-brand/10 px-4 py-3 text-sm">
          <span className="animate-pulse">⏳ {busy}</span>
        </div>
      ) : null}
      {error ? (
        <div className="mb-4 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      ) : null}

      <section className="mb-6 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
        <h2 className="mb-1 text-lg font-bold">1 · Sumber Video</h2>
        <p className="mb-3 text-sm text-slate-400">
          Tempel link YouTube podcast/panjang. Server yang unduh & transkrip.
        </p>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://youtube.com/watch?v=…"
            className="flex-1 rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm outline-none focus:border-brand"
          />
          <button
            onClick={handleTranscript}
            disabled={!!busy}
            className="rounded-xl bg-brand px-5 py-3 text-sm font-semibold text-white disabled:opacity-50"
          >
            Ambil Transkrip
          </button>
        </div>
      </section>

      {video ? (
        <section className="mb-6 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <h2 className="mb-1 text-lg font-bold">2 · Transkrip</h2>
          <div className="mb-2 text-sm">
            <div className="font-semibold text-slate-200">{video.title}</div>
            <div className="text-slate-400">
              {video.channelName} · {fmtDur(video.durationSec)} ·{" "}
              {video.hasTranscript ? "Transkrip tersedia" : "Tanpa transkrip"}
            </div>
          </div>
          {video.hasTranscript ? (
            <details className="mt-2">
              <summary className="cursor-pointer text-sm text-brand-accent">Lihat transkrip</summary>
              <div className="mt-2 max-h-52 overflow-auto rounded-lg bg-black/30 p-3 text-xs leading-relaxed text-slate-300">
                {video.transcriptText}
              </div>
            </details>
          ) : null}
          <button
            onClick={handleAnalyze}
            disabled={!!busy || !video.hasTranscript}
            className="mt-4 rounded-xl bg-gradient-to-r from-brand to-brand-accent px-5 py-3 text-sm font-semibold text-white disabled:opacity-50"
          >
            ✨ Analisis Momen Viral (AI)
          </button>
        </section>
      ) : null}

      {segments.length > 0 ? (
        <section className="mb-6 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-bold">
              3 · Rekomendasi Potongan <span className="text-slate-400">({segments.length})</span>
            </h2>
            <div className="flex gap-2 text-xs">
              <button onClick={() => setAll(true)} className="rounded-lg border border-white/10 px-3 py-1">
                Centang semua
              </button>
              <button onClick={() => setAll(false)} className="rounded-lg border border-white/10 px-3 py-1">
                Hapus
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

      {segments.length > 0 ? (
        <section className="mb-6 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <h2 className="mb-3 text-lg font-bold">4 · Opsi & Potong</h2>
          <div className="mb-4 grid grid-cols-2 gap-3 text-sm">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={reframe} onChange={(e) => setReframe(e.target.checked)} />{" "}
              Reframe ke wajah
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={subtitle} onChange={(e) => setSubtitle(e.target.checked)} />{" "}
              Subtitle burn-in
            </label>
          </div>
          <div className="mb-4">
            <div className="mb-1 text-xs text-slate-400">Rasio</div>
            <div className="flex gap-2">
              {["9:16", "1:1"].map((a) => (
                <button
                  key={a}
                  onClick={() => setAspect(a)}
                  className={`rounded-lg px-3 py-1 text-sm ${
                    aspect === a ? "bg-brand text-white" : "border border-white/10"
                  }`}
                >
                  {a}
                </button>
              ))}
            </div>
          </div>
          {subtitle ? (
            <div className="mb-4">
              <div className="mb-1 text-xs text-slate-400">Gaya subtitle</div>
              <div className="flex flex-wrap gap-2">
                {SUB_STYLES.map((st) => (
                  <button
                    key={st}
                    onClick={() => setSubtitleStyle(st)}
                    className={`rounded-lg px-3 py-1 text-xs capitalize ${
                      subtitleStyle === st ? "bg-brand text-white" : "border border-white/10"
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              onClick={() => handleCut(false)}
              disabled={!!busy || selectedCount === 0}
              className="flex-1 rounded-xl bg-brand px-5 py-3 text-sm font-semibold text-white disabled:opacity-50"
            >
              Potong Terpilih ({selectedCount})
            </button>
            <button
              onClick={() => handleCut(true)}
              disabled={!!busy}
              className="flex-1 rounded-xl border border-brand px-5 py-3 text-sm font-semibold text-brand disabled:opacity-50"
            >
              Potong Semua ({segments.length})
            </button>
          </div>
        </section>
      ) : null}

      {clips.length > 0 ? (
        <section className="mb-6 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <h2 className="mb-3 text-lg font-bold">
            5 · Hasil Klip <span className="text-slate-400">({clips.length})</span>
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
