"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api, type DashboardStats, type PostingLog, type TimelineItem } from "@/lib/api";
import { useAuth } from "@/lib/auth";

export default function DashboardPage() {
  const { user, loading } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({ scheduled: 0, draft: 0, posted: 0, failed: 0 });
  const [timeline, setTimeline] = useState<TimelineItem[]>([]);
  const [days, setDays] = useState(7);
  const [selectedPlatform, setSelectedPlatform] = useState<string>("");
  const [logs, setLogs] = useState<PostingLog[]>([]);
  const [showLogs, setShowLogs] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  useEffect(() => {
    if (!user) return;
    refreshData();
  }, [user, days, selectedPlatform]);

  async function refreshData() {
    try {
      const [sData, tData] = await Promise.all([
        api.getDashboardStats().catch(() => ({ scheduled: 0, draft: 0, posted: 0, failed: 0 })),
        api.getTimeline(days, selectedPlatform || undefined).catch(() => ({ timeline: [] })),
      ]);
      setStats(sData);
      setTimeline(tData.timeline);
    } catch {
      // ignore
    }
  }

  async function loadLogs() {
    try {
      const data = await api.getPostingLogs();
      setLogs(data.logs);
      setShowLogs(true);
    } catch {
      // ignore
    }
  }

  async function handlePostNow(id: string) {
    setBusyId(id);
    setMessage(null);
    try {
      await api.postNow(id);
      setMessage({ text: "Konten berhasil diterbitkan ke sosial media!", type: "success" });
      await refreshData();
    } catch (err: unknown) {
      setMessage({
        text: err instanceof Error ? err.message : "Gagal mempublikasikan konten.",
        type: "error",
      });
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Hapus jadwal posting ini?")) return;
    try {
      await api.deletePost(id);
      await refreshData();
    } catch {
      // ignore
    }
  }

  async function handleRetry(id: string) {
    try {
      await api.retryPost(id);
      await refreshData();
    } catch {
      // ignore
    }
  }

  const platforms = [
    { id: "", label: "Semua Platform", icon: "🌐" },
    { id: "instagram", label: "Instagram", icon: "📸" },
    { id: "tiktok", label: "TikTok", icon: "🎵" },
    { id: "youtube", label: "YouTube Shorts", icon: "▶️" },
    { id: "facebook", label: "Facebook", icon: "👤" },
  ];

  return (
    <main className="flex-1 p-5 sm:p-8 max-w-7xl mx-auto w-full space-y-8">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="text-xs font-semibold text-brand-accent uppercase tracking-wider">
            Auto-Pilot Social Media
          </div>
          <h1 className="mt-1 text-2xl sm:text-3xl font-extrabold text-white">
            Dashboard Konten
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Jadwal posting otomatis, status multi-platform, dan ringkasan metrik.
          </p>
        </div>

        <div className="flex gap-2.5">
          <button
            type="button"
            onClick={loadLogs}
            className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-white/[0.08] transition-all"
          >
            📋 Log & Troubleshooting
          </button>
          <Link
            href="/content-plan"
            className="rounded-xl bg-gradient-to-r from-brand to-brand-accent px-4 py-2 text-xs font-bold text-white shadow-md hover:brightness-110 transition-all"
          >
            + Buat Jadwal Baru
          </Link>
        </div>
      </div>

      {message && (
        <div
          className={`rounded-xl border p-4 text-sm font-medium ${
            message.type === "success"
              ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
              : "border-rose-500/40 bg-rose-500/10 text-rose-300"
          }`}
        >
          {message.text}
        </div>
      )}

      {/* 4 Stat Cards */}
      <section className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-2xl border border-white/10 bg-[#121722] p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Terjadwal</span>
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-indigo-500/15 text-indigo-400 text-xs font-bold">
              🕒
            </span>
          </div>
          <div className="mt-3 text-3xl font-extrabold text-white">{stats.scheduled}</div>
          <div className="mt-1 text-[11px] text-slate-500">Antrian publikasi</div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-[#121722] p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Konsep (Draft)</span>
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-amber-500/15 text-amber-400 text-xs font-bold">
              📝
            </span>
          </div>
          <div className="mt-3 text-3xl font-extrabold text-white">{stats.draft}</div>
          <div className="mt-1 text-[11px] text-slate-500">Dalam Content Plan</div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-[#121722] p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Berhasil Terbit</span>
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-emerald-500/15 text-emerald-400 text-xs font-bold">
              ✅
            </span>
          </div>
          <div className="mt-3 text-3xl font-extrabold text-white">{stats.posted}</div>
          <div className="mt-1 text-[11px] text-slate-500">Live di media sosial</div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-[#121722] p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Gagal Posting</span>
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-rose-500/15 text-rose-400 text-xs font-bold">
              ⚠️
            </span>
          </div>
          <div className="mt-3 text-3xl font-extrabold text-white">{stats.failed}</div>
          <div className="mt-1 text-[11px] text-slate-500">Perlu tindakan/retry</div>
        </div>
      </section>

      {/* Posting Timeline Module */}
      <section className="rounded-2xl border border-white/10 bg-[#121722] p-6 shadow-sm space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
          <div>
            <h2 className="text-lg font-bold text-white">Posting Timeline</h2>
            <p className="text-xs text-slate-400">
              Jadwal otomatis berdasarkan kalender konten Anda.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Days Filter */}
            <div className="flex rounded-xl border border-white/10 bg-black/40 p-1">
              <button
                type="button"
                onClick={() => setDays(7)}
                className={`rounded-lg px-3 py-1 text-xs font-semibold transition-all ${
                  days === 7 ? "bg-brand text-white shadow-sm" : "text-slate-400 hover:text-white"
                }`}
              >
                7 Hari
              </button>
              <button
                type="button"
                onClick={() => setDays(30)}
                className={`rounded-lg px-3 py-1 text-xs font-semibold transition-all ${
                  days === 30 ? "bg-brand text-white shadow-sm" : "text-slate-400 hover:text-white"
                }`}
              >
                30 Hari
              </button>
            </div>

            {/* Platform Filter */}
            <select
              value={selectedPlatform}
              onChange={(e) => setSelectedPlatform(e.target.value)}
              className="rounded-xl border border-white/10 bg-black/40 px-3 py-1.5 text-xs text-white focus:outline-none focus:border-brand"
            >
              {platforms.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.icon} {p.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Timeline Items */}
        {timeline.length === 0 ? (
          <div className="py-14 text-center">
            <div className="text-4xl mb-3">📅</div>
            <h3 className="font-bold text-white text-base">Belum ada posting terjadwal</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
              Mulai buat rencana konten 7–30 hari di Content Plan dan kirim langsung ke jadwal publikasi.
            </p>
            <Link
              href="/content-plan"
              className="mt-4 inline-block rounded-xl bg-brand px-4 py-2 text-xs font-bold text-white hover:brightness-110"
            >
              Buka Content Plan →
            </Link>
          </div>
        ) : (
          <div className="space-y-3.5">
            {timeline.map((item) => {
              const dateStr = item.scheduledAt ? new Date(item.scheduledAt).toLocaleString("id-ID") : "-";
              return (
                <div
                  key={item.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-white/10 bg-white/[0.02] p-4.5 hover:border-brand/40 transition-all"
                >
                  <div className="flex items-start gap-3.5">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white/[0.05] text-lg font-bold">
                      {item.format === "CAROUSEL" ? "🖼️" : item.format === "PODCAST_CLIP" ? "✂️" : "👄"}
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold text-brand-accent">{dateStr}</span>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                            item.status === "POSTED"
                              ? "bg-emerald-500/15 text-emerald-300"
                              : item.status === "FAILED"
                              ? "bg-rose-500/15 text-rose-300"
                              : "bg-indigo-500/15 text-indigo-300"
                          }`}
                        >
                          {item.status}
                        </span>
                      </div>
                      <h4 className="mt-1 font-bold text-white text-sm">{item.title}</h4>
                      {item.caption && (
                        <p className="mt-1 text-xs text-slate-400 line-clamp-1">{item.caption}</p>
                      )}
                      <div className="mt-2 flex items-center gap-1.5">
                        {item.platforms.map((p) => (
                          <span
                            key={p}
                            className="rounded-md bg-white/[0.06] px-2 py-0.5 text-[10px] font-semibold text-slate-300 uppercase"
                          >
                            {p}
                          </span>
                        ))}
                      </div>
                      {item.errorMessage && (
                        <p className="mt-2 text-xs text-rose-400 font-mono">Error: {item.errorMessage}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center">
                    {item.status !== "POSTED" && (
                      <button
                        type="button"
                        onClick={() => handlePostNow(item.id)}
                        disabled={busyId === item.id}
                        className="rounded-xl bg-emerald-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-emerald-500 disabled:opacity-50"
                      >
                        {busyId === item.id ? "Memproses…" : "Post Now"}
                      </button>
                    )}
                    {item.status === "FAILED" && (
                      <button
                        type="button"
                        onClick={() => handleRetry(item.id)}
                        className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 py-1.5 text-xs font-semibold text-amber-300 hover:bg-amber-500/20"
                      >
                        Retry
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleDelete(item.id)}
                      className="rounded-xl border border-white/10 px-3 py-1.5 text-xs text-slate-400 hover:bg-rose-500/10 hover:border-rose-500/30 hover:text-rose-400"
                    >
                      Hapus
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Log & Troubleshooting Modal / Drawer */}
      {showLogs && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-[#121722] border border-white/10 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div>
                <h3 className="text-lg font-bold text-white">Log & Riwayat Eksekusi Posting</h3>
                <p className="text-xs text-slate-400">Pemeriksaan error HTTP dan respon API sosial media</p>
              </div>
              <button
                type="button"
                onClick={() => setShowLogs(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pr-1 text-xs">
              {logs.length === 0 ? (
                <p className="py-8 text-center text-slate-400">Belum ada riwayat aktivitas posting.</p>
              ) : (
                logs.map((log) => (
                  <div
                    key={log.id}
                    className="rounded-xl border border-white/10 bg-black/30 p-3.5 space-y-1 font-mono"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white uppercase">{log.platform}</span>
                      <span
                        className={`font-semibold ${
                          log.status === "SUCCESS" ? "text-emerald-400" : "text-rose-400"
                        }`}
                      >
                        {log.status} ({log.statusCode})
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Waktu: {new Date(log.createdAt).toLocaleString("id-ID")}
                    </div>
                    <p className="text-slate-300 bg-black/40 p-2 rounded-lg break-all">
                      {log.responseDetail}
                    </p>
                  </div>
                ))
              )}
            </div>

            <div className="pt-3 border-t border-white/10 text-right">
              <button
                type="button"
                onClick={() => setShowLogs(false)}
                className="rounded-xl bg-white/10 px-4 py-2 text-xs font-semibold text-white hover:bg-white/15"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
