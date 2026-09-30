"use client";

import { useEffect, useState } from "react";
import { api, type ConnectionTestResult, type IntegrationStatus } from "@/lib/api";
import { useAuth } from "@/lib/auth";

type ServiceConfig = {
  id: string;
  name: string;
  category: "ai" | "social" | "server";
  description: string;
  placeholder: string;
  docsUrl?: string;
};

const SERVICES: ServiceConfig[] = [
  {
    id: "gemini",
    name: "Google Gemini AI",
    category: "ai",
    description: "Digunakan untuk AI Persona, Viral Clip Finder, Carousel Script, dan Roadmap Generator.",
    placeholder: "AIzaSy...",
  },
  {
    id: "elevenlabs",
    name: "ElevenLabs Voice AI (TTS)",
    category: "ai",
    description: "Digunakan untuk voiceover berkualitas studio dan text-to-speech naskah Remake.",
    placeholder: "xi-api-key...",
  },
  {
    id: "clip_server",
    name: "Python Clip & Wav2Lip Server",
    category: "server",
    description: "Endpoint backend FastAPI untuk pemrosesan video berat, face tracking OpenCV, dan Wav2Lip GPU.",
    placeholder: "http://localhost:8000",
  },
  {
    id: "youtube",
    name: "YouTube Data API v3",
    category: "social",
    description: "Koneksi upload YouTube Shorts otomatis dan ekstraksi metadata channel.",
    placeholder: "AIzaSy... (API Key / OAuth)",
  },
  {
    id: "meta",
    name: "Meta Graph API (IG & FB)",
    category: "social",
    description: "Akses publikasi otomatis ke Instagram Business Account & Facebook Page.",
    placeholder: "EAAG... (Page Access Token)",
  },
  {
    id: "tiktok",
    name: "TikTok Open API",
    category: "social",
    description: "Integrasi auto-post dan upload video ke akun TikTok Creator.",
    placeholder: "act.example_token...",
  },
  {
    id: "openverse",
    name: "Openverse Stock Images API",
    category: "ai",
    description: "Pencarian gambar bebas royalti gratis untuk latar belakang Carousel slide.",
    placeholder: "Client ID / Secret...",
  },
];

export default function SettingsPage() {
  const { user } = useAuth();
  const [integrations, setIntegrations] = useState<Record<string, boolean>>({});
  const [inputs, setInputs] = useState<Record<string, string>>({});
  const [testResults, setTestResults] = useState<Record<string, ConnectionTestResult>>({});
  const [testingId, setTestingId] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

  // Schedule Preferences
  const [postTime, setPostTime] = useState("19:00");
  const [autoRetry, setAutoRetry] = useState(true);
  const [savingPref, setSavingPref] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    loadSettings();
  }, [user]);

  async function loadSettings() {
    try {
      const data = await api.getIntegrations();
      const map: Record<string, boolean> = {};
      data.integrations.forEach((item) => {
        map[item.service] = item.configured;
      });
      setIntegrations(map);
      if (data.preferences) {
        setPostTime(data.preferences.defaultPostingTime || "19:00");
        setAutoRetry(data.preferences.autoRetryFailed);
      }
    } catch {
      // ignore
    }
  }

  async function handleSaveKey(serviceId: string) {
    const val = inputs[serviceId] || "";
    setSavingId(serviceId);
    setMessage(null);
    try {
      const res = await api.saveIntegration(serviceId, val);
      setIntegrations((prev) => ({ ...prev, [serviceId]: res.configured }));
      setInputs((prev) => ({ ...prev, [serviceId]: "" }));
      setMessage(`Kredensial ${serviceId.toUpperCase()} berhasil disimpan.`);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Gagal menyimpan kredensial.");
    } finally {
      setSavingId(null);
    }
  }

  async function handleTest(serviceId: string) {
    const tempKey = inputs[serviceId] || "";
    setTestingId(serviceId);
    try {
      const res = await api.testConnection(serviceId, tempKey || undefined);
      setTestResults((prev) => ({ ...prev, [serviceId]: res }));
    } catch (err: unknown) {
      setTestResults((prev) => ({
        ...prev,
        [serviceId]: {
          success: false,
          latencyMs: 0,
          message: err instanceof Error ? err.message : "Uji koneksi gagal.",
        },
      }));
    } finally {
      setTestingId(null);
    }
  }

  async function handleSavePreferences(e: React.FormEvent) {
    e.preventDefault();
    setSavingPref(true);
    try {
      await api.saveSchedulePreferences({
        defaultPostingTime: postTime,
        autoRetryFailed: autoRetry,
      });
      setMessage("Preferensi jadwal auto-pilot berhasil diperbarui.");
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Gagal menyimpan preferensi.");
    } finally {
      setSavingPref(false);
    }
  }

  return (
    <main className="flex-1 p-5 sm:p-8 max-w-7xl mx-auto w-full space-y-8">
      {/* Header */}
      <div>
        <div className="text-xs font-semibold text-brand-accent uppercase tracking-wider">
          Konfigurasi Platform
        </div>
        <h1 className="mt-1 text-2xl sm:text-3xl font-extrabold text-white">
          Settings & Integrations
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          Kelola API Keys pihak ketiga, koneksi worker GPU, dan parameter jadwal auto-pilot.
        </p>
      </div>

      {message && (
        <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-4 text-xs font-semibold text-emerald-300">
          {message}
        </div>
      )}

      {/* 1. Schedule Preferences */}
      <section className="rounded-2xl border border-white/10 bg-[#121722] p-6 shadow-sm space-y-5">
        <div className="border-b border-white/10 pb-3">
          <h2 className="text-base font-bold text-white">Posting Schedule Preferences</h2>
          <p className="text-xs text-slate-400">Pengaturan jadwal publikasi default harian</p>
        </div>

        <form onSubmit={handleSavePreferences} className="grid gap-4 sm:grid-cols-3 items-end text-xs">
          <div>
            <label className="block font-semibold text-slate-300 mb-1">
              Jam Posting Default (WIB)
            </label>
            <input
              type="time"
              value={postTime}
              onChange={(e) => setPostTime(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-black/30 p-2.5 text-white focus:outline-none focus:border-brand font-mono"
            />
          </div>

          <div className="flex items-center h-10">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={autoRetry}
                onChange={(e) => setAutoRetry(e.target.checked)}
                className="rounded border-white/20 text-brand focus:ring-brand"
              />
              <span className="font-semibold text-slate-300">
                Otomatis Retry jika posting gagal
              </span>
            </label>
          </div>

          <div>
            <button
              type="submit"
              disabled={savingPref}
              className="w-full rounded-xl bg-brand px-4 py-2.5 font-bold text-white shadow-md hover:brightness-110 disabled:opacity-50"
            >
              {savingPref ? "Menyimpan…" : "Simpan Preferensi"}
            </button>
          </div>
        </form>
      </section>

      {/* 2. API Keys & Services Grid */}
      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-bold text-white">API Keys & Service Connectors</h2>
          <p className="text-xs text-slate-400">
            Setiap layanan dapat diuji koneksi langsung secara real-time.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {SERVICES.map((s) => {
            const isConfigured = integrations[s.id] || false;
            const test = testResults[s.id];

            return (
              <div
                key={s.id}
                className="rounded-2xl border border-white/10 bg-[#121722] p-5 shadow-sm space-y-3.5 text-xs flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-sm font-bold text-white">{s.name}</h3>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                        isConfigured
                          ? "bg-emerald-500/15 text-emerald-300"
                          : "bg-white/5 text-slate-400"
                      }`}
                    >
                      {isConfigured ? "Tersambung" : "Belum Diatur"}
                    </span>
                  </div>
                  <p className="mt-1 text-slate-400 text-xs leading-relaxed">{s.description}</p>
                </div>

                <div className="space-y-2 pt-1">
                  <div className="flex gap-2">
                    <input
                      type="password"
                      value={inputs[s.id] || ""}
                      onChange={(e) => setInputs({ ...inputs, [s.id]: e.target.value })}
                      placeholder={isConfigured ? "•••••••••••• (Tersimpan)" : s.placeholder}
                      className="flex-1 rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-white focus:outline-none focus:border-brand"
                    />
                    <button
                      type="button"
                      onClick={() => handleSaveKey(s.id)}
                      disabled={savingId === s.id}
                      className="rounded-xl border border-white/10 bg-white/[0.05] px-3.5 py-2 font-bold text-slate-200 hover:bg-white/[0.1] disabled:opacity-50"
                    >
                      {savingId === s.id ? "…" : "Simpan"}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleTest(s.id)}
                      disabled={testingId === s.id}
                      className="rounded-xl bg-brand/20 border border-brand/40 px-3.5 py-2 font-bold text-brand-accent hover:bg-brand/30 disabled:opacity-50 whitespace-nowrap"
                    >
                      {testingId === s.id ? "Testing…" : "⚡ Test"}
                    </button>
                  </div>

                  {/* Test Connection Result Box */}
                  {test && (
                    <div
                      className={`rounded-xl border p-3 flex items-start gap-2 ${
                        test.success
                          ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
                          : "border-rose-500/40 bg-rose-500/10 text-rose-300"
                      }`}
                    >
                      <span className="text-sm font-bold">{test.success ? "✅" : "❌"}</span>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold">{test.success ? "Sukses Terhubung" : "Koneksi Gagal"}</span>
                          {test.latencyMs > 0 && (
                            <span className="font-mono text-[11px] opacity-80">{test.latencyMs} ms</span>
                          )}
                        </div>
                        <p className="mt-0.5 text-[11px] opacity-90">{test.message}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </main>
  );
}
