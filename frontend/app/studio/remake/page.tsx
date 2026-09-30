"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import Header from "@/components/Header";
import { Toast } from "@/components/ui/Toast";
import { api, mediaUrl, type MediaAsset, type RemakeJob } from "@/lib/api";
import type { ContentPlanItem } from "@/lib/types";
import { useAuth } from "@/lib/auth";
import { useTranslation } from "@/lib/i18n";
import { consumeStudioPlanPrefill, formatPlanBrief } from "@/lib/studio-prefill";
import StudioPlanPrefill from "@/components/content-plan/StudioPlanPrefill";

export default function RemakeStudio() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const { t } = useTranslation();

  const [assets, setAssets] = useState<MediaAsset[]>([]);
  const [mediaId, setMediaId] = useState("");
  const [audioId, setAudioId] = useState("");
  const [mode, setMode] = useState<"overlay" | "lipsync">("lipsync");
  const [aspect, setAspect] = useState("9:16");
  const [subtitleText, setSubtitleText] = useState("");
  const [planPrefill, setPlanPrefill] = useState<ContentPlanItem | null>(null);
  const [subtitleStyle, setSubtitleStyle] = useState("bold");
  const [consent, setConsent] = useState(false);
  const [worker, setWorker] = useState<{ ready: boolean; engine?: string; error?: string }>({ ready: false });
  const [job, setJob] = useState<RemakeJob | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const visualAssets = useMemo(() => assets.filter((item) => item.kind !== "audio"), [assets]);
  const audioAssets = useMemo(() => assets.filter((item) => item.kind === "audio"), [assets]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const subtitle = [params.get("hook"), params.get("cta")].filter(Boolean).join("\n\n");
    if (subtitle) setSubtitleText(subtitle);
  }, []);

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

  useEffect(() => {
    const plan = consumeStudioPlanPrefill();
    if (!plan) return;
    setPlanPrefill(plan);
    setSubtitleText(formatPlanBrief(plan));
  }, []);

  async function upload(kind: "video" | "photo" | "audio", file?: File) {
    if (!file) return;
    setBusy(t("studio.uploading", { name: file.name }));
    try {
      const asset = await api.remakeUpload(kind, file);
      setAssets((items) => [asset, ...items]);
      if (kind === "audio") setAudioId(asset.id);
      else setMediaId(asset.id);
      Toast.success(t("common.saved"));
    } catch (err) {
      Toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(null);
    }
  }

  async function poll(id: string) {
    for (let attempt = 0; attempt < 600; attempt++) {
      await new Promise((resolve) => setTimeout(resolve, 3000));
      const current = await api.remakeStatus(id);
      setJob(current);
      setBusy(t("studio.processing_job", { mode: current.mode, progress: current.progress }));
      if (current.status === "done") return current;
      if (current.status === "error") throw new Error(current.error || "Remake process failed");
    }
    throw new Error("Remake polling timed out");
  }

  async function start() {
    if (!mediaId || !audioId) {
      Toast.warning(t("studio.media_required"));
      return;
    }
    if (mode === "lipsync" && !consent) {
      Toast.warning(t("studio.consent_required"));
      return;
    }
    if (mode === "lipsync" && !worker.ready) {
      Toast.error(t("studio.worker_not_ready"));
      return;
    }

    setBusy(t("studio.creating_job"));
    setJob(null);
    try {
      const created = await api.remakeStart({
        mediaId,
        audioId,
        mode,
        aspectRatio: aspect,
        subtitleText,
        subtitleStyle,
        consentConfirmed: consent,
      });
      setJob(created);
      const done = await poll(created.job);
      setJob(done);
      Toast.success(t("studio.job_success"));
    } catch (err) {
      Toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(null);
    }
  }

  if (loading || !user) {
    return (
      <main className="mx-auto max-w-4xl px-4">
        <Header />
        <div className="py-20 text-center text-sm text-muted">
          <div className="mx-auto mb-3 h-6 w-6 animate-spin rounded-full border-2 border-brand border-t-transparent" />
          <p>{t("common.loading")}</p>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-5xl px-4 pb-24 text-token">
      <Header />
      <div className="mb-7">
        <Link href="/studio" className="text-xs font-semibold text-brand hover:underline">
          ← {t("common.back")}
        </Link>
        <h1 className="mt-2 text-2xl font-extrabold tracking-tight">
          {t("studio.remake_page_title")}
        </h1>
        <p className="mt-1 text-sm text-muted">
          {t("studio.remake_page_desc")}
        </p>
      </div>

      <div
        className={`mb-6 rounded-2xl border p-4 text-sm transition-all ${
          worker.ready
            ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
            : "border-amber-500/30 bg-amber-500/10 text-amber-300"
        }`}
      >
        <div className="flex items-center gap-2 font-semibold">
          <span className={`h-2.5 w-2.5 rounded-full ${worker.ready ? "bg-emerald-400 animate-pulse" : "bg-amber-400"}`} />
          <span>
            {t("studio.gpu_engine")}: {worker.engine || "MuseTalk 1.5"} · {worker.ready ? t("studio.ready") : t("studio.not_ready")}
          </span>
        </div>
        {!worker.ready && (
          <p className="mt-1 text-xs opacity-90">
            {worker.error || t("studio.worker_hint")}
          </p>
        )}
      </div>

      {busy && (
        <div className="mb-6 flex items-center gap-3 rounded-2xl border border-brand/40 bg-brand/10 p-4 text-sm font-medium text-brand">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-brand border-t-transparent" />
          <span>{busy}</span>
        </div>
      )}

      {planPrefill && (
        <StudioPlanPrefill
          plan={planPrefill}
          onChange={(updated) => {
            setPlanPrefill(updated);
            setSubtitleText(formatPlanBrief(updated));
          }}
        />
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="space-y-5 rounded-2xl border border-token bg-surface p-6 shadow-sm">
          <div>
            <h2 className="font-bold text-base">{t("studio.primary_media")}</h2>
            <p className="mb-3 text-xs text-muted">
              {t("studio.primary_media_hint")}
            </p>
            <div className="grid grid-cols-2 gap-3">
              <label className="cursor-pointer rounded-xl border border-dashed border-token bg-surface-hover p-4 text-center text-xs font-semibold hover:border-brand transition-all">
                {t("studio.upload_photo")}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => void upload("photo", e.target.files?.[0])}
                />
              </label>
              <label className="cursor-pointer rounded-xl border border-dashed border-token bg-surface-hover p-4 text-center text-xs font-semibold hover:border-brand transition-all">
                {t("studio.upload_video")}
                <input
                  type="file"
                  accept="video/*"
                  className="hidden"
                  onChange={(e) => void upload("video", e.target.files?.[0])}
                />
              </label>
            </div>
            <select
              value={mediaId}
              onChange={(e) => setMediaId(e.target.value)}
              className="mt-3 w-full rounded-xl border border-token bg-surface p-3 text-sm focus:border-brand focus:outline-none"
            >
              <option value="">{t("studio.select_media")}</option>
              {visualAssets.map((asset) => (
                <option key={asset.id} value={asset.id}>
                  {asset.kind === "photo" ? "📷" : "🎥"} {asset.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <h2 className="font-bold text-base">{t("studio.new_audio")}</h2>
            <p className="mb-3 text-xs text-muted">
              {t("studio.new_audio_hint")}
            </p>
            <label className="block cursor-pointer rounded-xl border border-dashed border-token bg-surface-hover p-4 text-center text-xs font-semibold hover:border-brand transition-all">
              {t("studio.upload_audio")}
              <input
                type="file"
                accept="audio/*"
                className="hidden"
                onChange={(e) => void upload("audio", e.target.files?.[0])}
              />
            </label>
            <select
              value={audioId}
              onChange={(e) => setAudioId(e.target.value)}
              className="mt-3 w-full rounded-xl border border-token bg-surface p-3 text-sm focus:border-brand focus:outline-none"
            >
              <option value="">{t("studio.select_audio")}</option>
              {audioAssets.map((asset) => (
                <option key={asset.id} value={asset.id}>
                  🎙️ {asset.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <h2 className="font-bold text-base">{t("studio.process_mode")}</h2>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setMode("lipsync")}
                className={`rounded-xl border p-3.5 text-sm font-semibold transition-all ${
                  mode === "lipsync"
                    ? "border-brand bg-brand/15 text-brand shadow-sm"
                    : "border-token bg-surface-hover text-muted"
                }`}
              >
                {t("studio.lipsync_mode")}
              </button>
              <button
                type="button"
                onClick={() => setMode("overlay")}
                className={`rounded-xl border p-3.5 text-sm font-semibold transition-all ${
                  mode === "overlay"
                    ? "border-brand bg-brand/15 text-brand shadow-sm"
                    : "border-token bg-surface-hover text-muted"
                }`}
              >
                {t("studio.overlay_mode")}
              </button>
            </div>
          </div>
        </section>

        <section className="space-y-5 rounded-2xl border border-token bg-surface p-6 shadow-sm">
          <div>
            <h2 className="font-bold text-base">{t("studio.format_label")}</h2>
            <div className="mt-3 flex gap-2">
              {["9:16", "1:1", "16:9"].map((ratio) => (
                <button
                  key={ratio}
                  type="button"
                  onClick={() => setAspect(ratio)}
                  className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition-all ${
                    aspect === ratio
                      ? "bg-brand text-white shadow-sm"
                      : "border border-token bg-surface-hover text-muted"
                  }`}
                >
                  {ratio}
                </button>
              ))}
            </div>
          </div>

          <label className="block text-sm">
            <span className="font-bold text-base">{t("studio.subtitle_label")}</span>
            <textarea
              value={subtitleText}
              onChange={(e) => setSubtitleText(e.target.value)}
              rows={4}
              placeholder={t("studio.subtitle_placeholder")}
              className="mt-2 w-full rounded-xl border border-token bg-surface p-3 text-sm focus:border-brand focus:outline-none"
            />
          </label>

          <label className="block text-xs font-semibold text-muted">
            {t("studio.subtitle_style")}
            <select
              value={subtitleStyle}
              onChange={(e) => setSubtitleStyle(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-token bg-surface p-3 text-sm text-token focus:border-brand focus:outline-none"
            >
              {["clean", "bold", "box", "yellow", "tiktok", "highlight", "neon"].map((style) => (
                <option key={style} value={style}>
                  {style}
                </option>
              ))}
            </select>
          </label>

          {mode === "lipsync" && (
            <label className="flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3.5 text-xs text-amber-300">
              <input
                type="checkbox"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
                className="mt-0.5 rounded border-token text-brand focus:ring-brand"
              />
              <span>{t("studio.consent_notice")}</span>
            </label>
          )}

          <button
            type="button"
            onClick={() => void start()}
            disabled={!!busy || !mediaId || !audioId || (mode === "lipsync" && !worker.ready)}
            className="w-full rounded-xl bg-gradient-to-r from-brand to-brand-accent px-5 py-3.5 font-bold text-white shadow-md disabled:opacity-40 transition-all hover:brightness-110 active:scale-[0.99]"
          >
            {mode === "lipsync" ? t("studio.process_lipsync_btn") : t("studio.process_overlay_btn")}
          </button>
        </section>
      </div>

      {job && (
        <section className="mt-8 rounded-2xl border border-token bg-surface p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-lg">
              {t("studio.job_result")}: {job.job}
            </h2>
            <span className="rounded-full bg-surface-hover px-3 py-1 text-xs font-bold uppercase tracking-wider text-muted">
              {job.status} · {job.progress}%
            </span>
          </div>

          {job.status === "done" && job.downloadUrl && (
            <div className="mt-5 space-y-4">
              <video
                src={mediaUrl(job.downloadUrl)}
                controls
                className="mx-auto max-h-[600px] w-auto rounded-2xl bg-black shadow-lg"
              />
              <a
                href={mediaUrl(job.downloadUrl)}
                download
                className="mx-auto block max-w-sm rounded-xl bg-emerald-600 px-5 py-3 text-center text-sm font-bold text-white shadow-md transition-all hover:bg-emerald-500"
              >
                {t("studio.download_btn")} MP4
              </a>
            </div>
          )}
        </section>
      )}
    </main>
  );
}

