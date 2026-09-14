"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import Header from "@/components/Header";
import { api, mediaUrl, type MediaAsset, type RemakeJob } from "@/lib/api";
import { useAuth } from "@/lib/auth";

export default function RemakeStudio() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [assets, setAssets] = useState<MediaAsset[]>([]);
  const [mediaId, setMediaId] = useState("");
  const [audioId, setAudioId] = useState("");
  const [mode, setMode] = useState<"overlay" | "lipsync">("lipsync");
  const [aspect, setAspect] = useState("9:16");
  const [subtitleText, setSubtitleText] = useState("");
  const [subtitleStyle, setSubtitleStyle] = useState("bold");
  const [consent, setConsent] = useState(false);
  const [worker, setWorker] = useState<{ ready: boolean; engine?: string; error?: string }>({ ready: false });
  const [job, setJob] = useState<RemakeJob | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const visualAssets = useMemo(() => assets.filter((item) => item.kind !== "audio"), [assets]);
  const audioAssets = useMemo(() => assets.filter((item) => item.kind === "audio"), [assets]);

  useEffect(() => {
    if (!loading && !user) router.replace("/login?next=/studio/remake");
  }, [loading, user, router]);

  async function refresh() {
    if (!user) return;
    const [assetResult, workerResult] = await Promise.allSettled([
      api.remakeAssets(),
      api.museTalkStatus(),
    ]);
    if (assetResult.status === "fulfilled") {
      setAssets(assetResult.value.assets);
      if (!mediaId) setMediaId(assetResult.value.assets.find((item) => item.kind !== "audio")?.id || "");
      if (!audioId) setAudioId(assetResult.value.assets.find((item) => item.kind === "audio")?.id || "");
    }
    if (workerResult.status === "fulfilled") {
      setWorker({
        ready: Boolean(workerResult.value.ready),
        engine: String(workerResult.value.engine || "MuseTalk 1.5"),
        error: String(workerResult.value.error || ""),
      });
    }
  }

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  async function upload(kind: "video" | "photo" | "audio", file?: File) {
    if (!file) return;
    setBusy(`Mengunggah ${file.name}…`);
    setError(null);
    try {
      const asset = await api.remakeUpload(kind, file);
      setAssets((items) => [asset, ...items]);
      if (kind === "audio") setAudioId(asset.id);
      else setMediaId(asset.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(null);
    }
  }

  async function poll(id: string) {
    for (let attempt = 0; attempt < 600; attempt++) {
      await new Promise((resolve) => setTimeout(resolve, 3000));
      const current = await api.remakeStatus(id);
      setJob(current);
      setBusy(`Memproses ${current.mode}… ${current.progress}%`);
      if (current.status === "done") return current;
      if (current.status === "error") throw new Error(current.error || "Remake gagal");
    }
    throw new Error("Timeout menunggu proses remake")
  }

  async function start() {
    if (!mediaId || !audioId) return setError("Upload/pilih media utama dan audio terlebih dahulu.");
    if (mode === "lipsync" && !consent) return setError("Konfirmasi hak penggunaan wajah dan audio wajib.");
    if (mode === "lipsync" && !worker.ready) return setError("MuseTalk 1.5 worker belum siap. Admin harus mengkonfigurasi worker GPU.");
    setBusy("Membuat job remake…");
    setError(null);
    setJob(null);
    try {
      const created = await api.remakeStart({
        mediaId, audioId, mode, aspectRatio: aspect, subtitleText, subtitleStyle,
        consentConfirmed: consent,
      });
      setJob(created);
      const done = await poll(created.job);
      setJob(done);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(null);
    }
  }

  if (loading || !user) {
    return <main className="mx-auto max-w-4xl px-4"><Header /><p className="py-10 text-center text-sm text-slate-400">Memuat…</p></main>;
  }

  return (
    <main className="mx-auto max-w-5xl px-4 pb-24">
      <Header />
      <div className="mb-7">
        <Link href="/studio" className="text-xs text-brand-accent">← Studio</Link>
        <h1 className="mt-1 text-2xl font-extrabold">Remake & MuseTalk Lipsync</h1>
        <p className="mt-1 text-sm text-slate-400">Upload foto/video + audio, pilih overlay atau true lipsync MuseTalk 1.5.</p>
      </div>

      <div className={`mb-5 rounded-xl border p-4 text-sm ${worker.ready ? "border-green-500/40 bg-green-500/10 text-green-200" : "border-amber-500/40 bg-amber-500/10 text-amber-100"}`}>
        <div className="font-semibold">GPU engine: {worker.engine || "MuseTalk 1.5"} · {worker.ready ? "Siap" : "Belum siap"}</div>
        {!worker.ready ? <p className="mt-1 text-xs opacity-80">{worker.error || "Konfigurasikan MUSETALK_WORKER_URL dan token di Admin → Settings."}</p> : null}
      </div>

      {busy ? <div className="mb-4 rounded-xl border border-brand/40 bg-brand/10 p-3 text-sm">⏳ {busy}</div> : null}
      {error ? <div className="mb-4 rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-200">{error}</div> : null}

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="space-y-5 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <div>
            <h2 className="font-bold">1 · Media utama</h2>
            <p className="mb-3 text-xs text-slate-400">Foto wajah atau video. Video akan di-loop/dipotong mengikuti audio.</p>
            <div className="grid grid-cols-2 gap-2">
              <label className="cursor-pointer rounded-xl border border-dashed border-white/20 p-4 text-center text-xs hover:border-brand">📷 Upload Foto<input type="file" accept="image/*" className="hidden" onChange={(e) => void upload("photo", e.target.files?.[0])} /></label>
              <label className="cursor-pointer rounded-xl border border-dashed border-white/20 p-4 text-center text-xs hover:border-brand">🎥 Upload Video<input type="file" accept="video/*" className="hidden" onChange={(e) => void upload("video", e.target.files?.[0])} /></label>
            </div>
            <select value={mediaId} onChange={(e) => setMediaId(e.target.value)} className="mt-3 w-full rounded-xl border border-white/10 bg-slate-950 p-3 text-sm">
              <option value="">Pilih media…</option>
              {visualAssets.map((asset) => <option key={asset.id} value={asset.id}>{asset.kind === "photo" ? "📷" : "🎥"} {asset.name}</option>)}
            </select>
          </div>

          <div>
            <h2 className="font-bold">2 · Audio baru</h2>
            <p className="mb-3 text-xs text-slate-400">MP3, WAV, M4A, AAC, OGG, atau Opus.</p>
            <label className="block cursor-pointer rounded-xl border border-dashed border-white/20 p-4 text-center text-xs hover:border-brand">🎙️ Upload Audio<input type="file" accept="audio/*" className="hidden" onChange={(e) => void upload("audio", e.target.files?.[0])} /></label>
            <select value={audioId} onChange={(e) => setAudioId(e.target.value)} className="mt-3 w-full rounded-xl border border-white/10 bg-slate-950 p-3 text-sm">
              <option value="">Pilih audio…</option>
              {audioAssets.map((asset) => <option key={asset.id} value={asset.id}>🎙️ {asset.name}</option>)}
            </select>
          </div>

          <div>
            <h2 className="font-bold">3 · Mode proses</h2>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <button onClick={() => setMode("lipsync")} className={`rounded-xl border p-3 text-sm ${mode === "lipsync" ? "border-brand bg-brand/15" : "border-white/10"}`}>👄 MuseTalk Lipsync</button>
              <button onClick={() => setMode("overlay")} className={`rounded-xl border p-3 text-sm ${mode === "overlay" ? "border-brand bg-brand/15" : "border-white/10"}`}>🎚️ Audio Overlay</button>
            </div>
          </div>
        </section>

        <section className="space-y-5 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <div><h2 className="font-bold">4 · Format</h2><div className="mt-2 flex gap-2">{["9:16", "1:1", "16:9"].map((ratio) => <button key={ratio} onClick={() => setAspect(ratio)} className={`rounded-lg px-4 py-2 text-sm ${aspect === ratio ? "bg-brand" : "border border-white/10"}`}>{ratio}</button>)}</div></div>
          <label className="block text-sm"><span className="font-bold">5 · Subtitle opsional</span><textarea value={subtitleText} onChange={(e) => setSubtitleText(e.target.value)} rows={4} placeholder="Teks subtitle yang dibakar ke video…" className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 p-3 text-sm" /></label>
          <label className="block text-xs text-slate-400">Gaya subtitle<select value={subtitleStyle} onChange={(e) => setSubtitleStyle(e.target.value)} className="mt-1 w-full rounded-xl bg-slate-950 p-3 text-sm text-white">{["clean", "bold", "box", "yellow", "tiktok", "highlight", "neon"].map((style) => <option key={style}>{style}</option>)}</select></label>
          {mode === "lipsync" ? <label className="flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-100"><input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5" /><span>Saya memiliki hak/izin atas wajah dan audio ini serta tidak akan memakainya untuk penipuan, impersonasi, atau konten ilegal.</span></label> : null}
          <button onClick={() => void start()} disabled={!!busy || !mediaId || !audioId || (mode === "lipsync" && !worker.ready)} className="w-full rounded-xl bg-gradient-to-r from-brand to-brand-accent px-5 py-3 font-bold disabled:opacity-40">{mode === "lipsync" ? "Proses dengan MuseTalk 1.5" : "Buat Audio Overlay"}</button>
        </section>
      </div>

      {job ? <section className="mt-6 rounded-2xl border border-white/10 bg-white/[0.03] p-5"><div className="flex items-center justify-between"><h2 className="font-bold">Hasil job {job.job}</h2><span className="text-xs uppercase text-slate-400">{job.status} · {job.progress}%</span></div>{job.status === "done" && job.downloadUrl ? <div className="mt-4"><video src={mediaUrl(job.downloadUrl)} controls className="mx-auto max-h-[650px] rounded-xl bg-black" /><a href={mediaUrl(job.downloadUrl)} className="mt-3 block rounded-xl bg-green-500 p-3 text-center text-sm font-bold text-black">Download MP4</a></div> : null}</section> : null}
    </main>
  );
}
