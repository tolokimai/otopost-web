"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  api,
  CONTENT_FORMATS,
  type ContentFormat,
  type ContentPlanItem,
  type Persona,
  type ThemeIdea,
} from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { ThemeModal, RoadmapModal } from "@/components/content-plan/RoadmapModals";
import PlanEditModal from "@/components/content-plan/PlanEditModal";

export default function ContentPlanPage() {
  const { user } = useAuth();
  const router = useRouter();

  const [personas, setPersonas] = useState<Persona[]>([]);
  const [selectedPersonaId, setSelectedPersonaId] = useState<string>("");
  const [plans, setPlans] = useState<ContentPlanItem[]>([]);
  const [loading, setLoading] = useState(false);

  // Big Themes Modal state
  const [showThemeModal, setShowThemeModal] = useState(false);
  const [themes, setThemes] = useState<ThemeIdea[]>([]);
  const [loadingThemes, setLoadingThemes] = useState(false);

  // Roadmap Modal state
  const [showRoadmapModal, setShowRoadmapModal] = useState(false);
  const [selectedTheme, setSelectedTheme] = useState<string>("");
  const [durationDays, setDurationDays] = useState<number>(7);
  const [selectedFormats, setSelectedFormats] = useState<ContentFormat[]>([
    ...CONTENT_FORMATS,
  ]);
  const [generatingRoadmap, setGeneratingRoadmap] = useState(false);

  // Manual Add/Edit state
  const [editingPlan, setEditingPlan] = useState<ContentPlanItem | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [manualForm, setManualForm] = useState({
    dayNumber: 1,
    topic: "",
    hook: "",
    outline: "",
    format: "CAROUSEL",
    status: "DRAFT",
    caption: "",
    hashtags: "",
  });

  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  useEffect(() => {
    if (!user) return;
    loadPersonas();
  }, [user]);

  useEffect(() => {
    if (user) {
      loadPlans();
    }
  }, [user, selectedPersonaId]);

  async function loadPersonas() {
    try {
      const data = await api.getPersonas();
      setPersonas(data.personas);
      if (data.personas.length > 0 && !selectedPersonaId) {
        const def = data.personas.find((p) => p.isDefault) || data.personas[0];
        setSelectedPersonaId(def.id);
      }
    } catch {
      // ignore
    }
  }

  async function loadPlans() {
    setLoading(true);
    try {
      const data = await api.getContentPlans(selectedPersonaId || undefined);
      setPlans(data.plans);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  async function handleOpenThemes() {
    if (!selectedPersonaId) {
      alert("Pilih atau buat persona terlebih dahulu di Persona Studio.");
      return;
    }
    setShowThemeModal(true);
    setLoadingThemes(true);
    try {
      const res = await api.generateThemes(selectedPersonaId);
      setThemes(res.themes);
    } catch {
      // ignore
    } finally {
      setLoadingThemes(false);
    }
  }

  function handleSelectThemeForRoadmap(themeTitle: string) {
    setSelectedTheme(themeTitle);
    setShowThemeModal(false);
    setShowRoadmapModal(true);
  }

  function handleToggleContentFormat(format: ContentFormat) {
    setSelectedFormats((current) =>
      current.includes(format)
        ? current.filter((item) => item !== format)
        : [...current, format]
    );
  }

  async function handleGenerateRoadmap() {
    if (!selectedPersonaId || !selectedTheme) return;
    setGeneratingRoadmap(true);
    try {
      await api.generateRoadmap({
        persona_id: selectedPersonaId,
        theme: selectedTheme,
        duration_days: durationDays,
        formats: selectedFormats,
        save_to_db: true,
      });
      setShowRoadmapModal(false);
      setMessage({
        text: `Berhasil membuat jadwal konten ${durationDays} hari ke Content Plan!`,
        type: "success",
      });
      await loadPlans();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Gagal membuat roadmap.");
    } finally {
      setGeneratingRoadmap(false);
    }
  }

  async function handleSendToStudio(item: ContentPlanItem) {
    try {
      const res = await api.sendToStudio(item.id);
      sessionStorage.setItem("otopost_prefill", JSON.stringify(res.payload));
      router.push(res.targetUrl);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Gagal mengirim ke studio.");
    }
  }

  async function handleStatusChange(item: ContentPlanItem, newStatus: string) {
    try {
      await api.updateContentPlan(item.id, { status: newStatus });
      setPlans((prev) =>
        prev.map((p) => (p.id === item.id ? { ...p, status: newStatus } : p))
      );
    } catch {
      // ignore
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Hapus item rencana ini?")) return;
    try {
      await api.deleteContentPlan(id);
      await loadPlans();
    } catch {
      // ignore
    }
  }

  function handleOpenCreateManual() {
    setEditingPlan(null);
    setManualForm({
      dayNumber: plans.length + 1,
      topic: "",
      hook: "",
      outline: "",
      format: "CAROUSEL",
      status: "DRAFT",
      caption: "",
      hashtags: "",
    });
    setShowEditModal(true);
  }

  function handleOpenEditManual(item: ContentPlanItem) {
    setEditingPlan(item);
    setManualForm({
      dayNumber: item.dayNumber,
      topic: item.topic,
      hook: item.hook,
      outline: item.outline,
      format: item.format,
      status: item.status,
      caption: item.caption,
      hashtags: item.hashtags,
    });
    setShowEditModal(true);
  }

  async function handleSaveManual(e: React.FormEvent) {
    e.preventDefault();
    if (!manualForm.topic.trim()) return;

    try {
      if (editingPlan) {
        await api.updateContentPlan(editingPlan.id, manualForm);
      } else {
        await api.createContentPlan({
          ...manualForm,
          personaId: selectedPersonaId || undefined,
        });
      }
      setShowEditModal(false);
      await loadPlans();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Gagal menyimpan.");
    }
  }

  const activePersona = personas.find((p) => p.id === selectedPersonaId);

  return (
    <main className="flex-1 p-5 sm:p-8 max-w-7xl mx-auto w-full space-y-8">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="text-xs font-semibold text-brand-accent uppercase tracking-wider">
            AI Content Roadmap 7–30 Hari
          </div>
          <h1 className="mt-1 text-2xl sm:text-3xl font-extrabold text-white">
            Content Plan
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Perencanaan kalender konten otomatis dengan tema besar terstruktur dan direct bridge ke Studio.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <select
            value={selectedPersonaId}
            onChange={(e) => setSelectedPersonaId(e.target.value)}
            className="rounded-xl border border-white/10 bg-[#121722] px-3.5 py-2 text-xs text-white focus:outline-none focus:border-brand font-semibold"
          >
            {personas.map((p) => (
              <option key={p.id} value={p.id}>
                🎭 {p.name} {p.isDefault ? "(Default)" : ""}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={handleOpenThemes}
            className="rounded-xl bg-gradient-to-r from-brand to-brand-accent px-4 py-2 text-xs font-bold text-white shadow-md hover:brightness-110 transition-all"
          >
            ✨ Generate Tema Besar
          </button>

          <button
            type="button"
            onClick={handleOpenCreateManual}
            className="rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2 text-xs font-semibold text-slate-300 hover:bg-white/[0.08]"
          >
            + Item Manual
          </button>
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

      {/* Content Plan Roadmap List */}
      {loading ? (
        <div className="py-20 text-center text-sm text-slate-400">
          Memuat jadwal Content Plan…
        </div>
      ) : plans.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-[#121722] p-12 text-center space-y-3">
          <div className="text-4xl">📅</div>
          <h3 className="font-bold text-white text-base">Belum ada rencana konten</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Hasilkan 7–30 hari jadwal konten otomatis berbasis persona {activePersona?.name || "Anda"}.
          </p>
          <button
            type="button"
            onClick={handleOpenThemes}
            className="rounded-xl bg-brand px-5 py-2.5 text-xs font-bold text-white hover:brightness-110"
          >
            Mulai Buat Roadmap dengan AI →
          </button>
        </div>
      ) : (
        <div className="grid gap-4">
          {plans.map((p) => {
            const formatBadge =
              p.format === "CAROUSEL"
                ? "🖼️ Carousel"
                : p.format === "PODCAST_CLIP"
                ? "✂️ Podcast Clip"
                : "👄 Remake";

            return (
              <div
                key={p.id}
                className="rounded-2xl border border-white/10 bg-[#121722] p-5 hover:border-brand/40 transition-all space-y-3 shadow-sm"
              >
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/5 pb-3">
                  <div className="flex items-center gap-3">
                    <span className="grid h-7 w-7 place-items-center rounded-lg bg-brand/20 text-xs font-mono font-bold text-brand-accent">
                      H{p.dayNumber}
                    </span>
                    <span className="rounded-full bg-white/[0.06] px-2.5 py-0.5 text-xs font-bold text-white">
                      {formatBadge}
                    </span>
                    <h3 className="text-sm font-extrabold text-white">{p.topic}</h3>
                  </div>

                  {/* Status Dropdown */}
                  <div className="flex items-center gap-2">
                    <select
                      value={p.status}
                      onChange={(e) => handleStatusChange(p, e.target.value)}
                      className={`rounded-lg px-2.5 py-1 text-xs font-bold border ${
                        p.status === "POSTED"
                          ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-300"
                          : p.status === "SCHEDULED"
                          ? "bg-indigo-500/15 border-indigo-500/30 text-indigo-300"
                          : p.status === "READY"
                          ? "bg-cyan-500/15 border-cyan-500/30 text-cyan-300"
                          : "bg-amber-500/15 border-amber-500/30 text-amber-300"
                      }`}
                    >
                      <option value="DRAFT">Belum Dibuat (Draft)</option>
                      <option value="READY">Siap Eksekusi (Ready)</option>
                      <option value="SCHEDULED">Terjadwal (Scheduled)</option>
                      <option value="POSTED">Sudah Posting (Done)</option>
                    </select>

                    <button
                      type="button"
                      onClick={() => handleSendToStudio(p)}
                      title="Kirim ke Studio yang sesuai"
                      className="rounded-xl bg-gradient-to-r from-brand to-brand-accent px-3 py-1 text-xs font-bold text-white shadow-sm hover:brightness-110 whitespace-nowrap"
                    >
                      🚀 Kirim ke Studio
                    </button>

                    <button
                      type="button"
                      onClick={() => handleOpenEditManual(p)}
                      className="rounded-lg p-1 text-slate-400 hover:text-white"
                      title="Edit"
                    >
                      ✏️
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(p.id)}
                      className="rounded-lg p-1 text-slate-400 hover:text-rose-400"
                      title="Hapus"
                    >
                      🗑️
                    </button>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 text-xs">
                  {p.hook && (
                    <div className="rounded-xl bg-black/25 p-3 border border-white/5 space-y-1">
                      <span className="font-bold text-brand-accent">Hook 3 Detik:</span>
                      <p className="text-slate-300 italic">&ldquo;{p.hook}&rdquo;</p>
                    </div>
                  )}

                  {p.outline && (
                    <div className="rounded-xl bg-black/25 p-3 border border-white/5 space-y-1">
                      <span className="font-bold text-slate-300">Outline & Call to Action:</span>
                      <pre className="text-slate-400 font-sans whitespace-pre-wrap">{p.outline}</pre>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <ThemeModal
        isOpen={showThemeModal}
        onClose={() => setShowThemeModal(false)}
        themes={themes}
        loading={loadingThemes}
        onSelectTheme={handleSelectThemeForRoadmap}
      />

      <RoadmapModal
        isOpen={showRoadmapModal}
        onClose={() => setShowRoadmapModal(false)}
        selectedTheme={selectedTheme}
        durationDays={durationDays}
        setDurationDays={setDurationDays}
        selectedFormats={selectedFormats}
        onToggleFormat={handleToggleContentFormat}
        generating={generatingRoadmap}
        onGenerate={handleGenerateRoadmap}
      />

      <PlanEditModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        editingPlan={editingPlan}
        form={manualForm}
        setForm={setManualForm}
        onSave={handleSaveManual}
      />
    </main>
  );
}
