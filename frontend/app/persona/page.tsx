"use client";

import { useEffect, useState } from "react";
import { api, type Persona } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import PersonaEditor from "@/components/persona/PersonaEditor";
import PersonaGeneratorModal from "@/components/persona/PersonaGeneratorModal";

export default function PersonaPage() {
  const { user } = useAuth();
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [activePersona, setActivePersona] = useState<Persona | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showGenerateModal, setShowGenerateModal] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    niche: "",
    toneOfVoice: "",
    targetAudience: "",
    signatureHook: "",
    dos: "",
    donts: "",
    isDefault: false,
  });

  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  useEffect(() => {
    if (!user) return;
    loadPersonas();
  }, [user]);

  async function loadPersonas() {
    try {
      const data = await api.getPersonas();
      setPersonas(data.personas);
      if (data.personas.length > 0 && !activePersona) {
        const def = data.personas.find((p) => p.isDefault) || data.personas[0];
        setActivePersona(def);
      }
    } catch {
      // ignore
    }
  }

  function handleSelectPersona(p: Persona) {
    setActivePersona(p);
    setIsEditing(false);
  }

  function handleStartNew() {
    setActivePersona(null);
    setFormData({
      name: "",
      niche: "",
      toneOfVoice: "",
      targetAudience: "",
      signatureHook: "",
      dos: "",
      donts: "",
      isDefault: personas.length === 0,
    });
    setIsEditing(true);
  }

  function handleEditCurrent(p: Persona) {
    setFormData({
      name: p.name,
      niche: p.niche,
      toneOfVoice: p.toneOfVoice,
      targetAudience: p.targetAudience,
      signatureHook: p.signatureHook,
      dos: p.dos,
      donts: p.donts,
      isDefault: p.isDefault,
    });
    setIsEditing(true);
  }

  async function handleSaveForm(e: React.FormEvent) {
    e.preventDefault();
    if (!formData.name.trim()) return;

    try {
      if (activePersona && isEditing && activePersona.id) {
        await api.updatePersona(activePersona.id, formData);
        setMessage({ text: "Persona berhasil diperbarui!", type: "success" });
      } else {
        await api.createPersona(formData);
        setMessage({ text: "Persona baru berhasil dibuat!", type: "success" });
      }
      setIsEditing(false);
      await loadPersonas();
    } catch (err: unknown) {
      setMessage({
        text: err instanceof Error ? err.message : "Gagal menyimpan persona.",
        type: "error",
      });
    }
  }

  async function handleSetDefault(id: string) {
    try {
      await api.setDefaultPersona(id);
      await loadPersonas();
      setMessage({ text: "Persona default aktif diperbarui.", type: "success" });
    } catch {
      // ignore
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Hapus persona ini?")) return;
    try {
      await api.deletePersona(id);
      setActivePersona(null);
      setIsEditing(false);
      await loadPersonas();
      setMessage({ text: "Persona berhasil dihapus.", type: "success" });
    } catch {
      // ignore
    }
  }

  function handleAIGenerated(p: Partial<Persona>, notice?: string) {
    setFormData({
      name: p.name || "",
      niche: p.niche || "",
      toneOfVoice: p.toneOfVoice || "",
      targetAudience: p.targetAudience || "",
      signatureHook: p.signatureHook || "",
      dos: p.dos || "",
      donts: p.donts || "",
      isDefault: personas.length === 0,
    });
    setIsEditing(true);
    setActivePersona(null);
    setMessage({
      text: notice || "Persona berhasil digenerate oleh AI Gemini! Silakan review dan simpan.",
      type: "success",
    });
  }

  return (
    <main className="flex-1 p-5 sm:p-8 max-w-7xl mx-auto w-full space-y-8">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="text-xs font-semibold text-brand-accent uppercase tracking-wider">
            Brand & Creator Identity
          </div>
          <h1 className="mt-1 text-2xl sm:text-3xl font-extrabold text-white">
            Persona Studio
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Tentukan gaya komunikasi, audiens spesifik, dan aturan konten sebelum merancang jadwal.
          </p>
        </div>

        <div className="flex gap-2.5">
          <button
            type="button"
            onClick={() => setShowGenerateModal(true)}
            className="rounded-xl bg-gradient-to-r from-brand to-brand-accent px-4 py-2 text-xs font-bold text-white shadow-md hover:brightness-110 transition-all"
          >
            ✨ AI Persona Generator
          </button>
          <button
            type="button"
            onClick={handleStartNew}
            className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2 text-xs font-semibold text-slate-200 hover:bg-white/[0.08]"
          >
            + Buat Manual
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

      {/* Main Workspace Layout */}
      <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
        {/* Left Column: Persona List */}
        <aside className="space-y-3 rounded-2xl border border-white/10 bg-[#121722] p-4.5 h-fit">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <span className="text-xs font-bold text-white uppercase tracking-wider">
              Daftar Persona ({personas.length})
            </span>
            <button
              onClick={handleStartNew}
              className="text-xs font-bold text-brand-accent hover:underline"
            >
              + Tambah
            </button>
          </div>

          {personas.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400 space-y-2">
              <p>Belum ada persona tersimpan.</p>
              <button
                type="button"
                onClick={() => setShowGenerateModal(true)}
                className="text-brand-accent font-bold underline"
              >
                Buat dengan AI sekarang
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {personas.map((p) => {
                const isSelected = activePersona?.id === p.id && !isEditing;
                return (
                  <div
                    key={p.id}
                    onClick={() => handleSelectPersona(p)}
                    className={`cursor-pointer rounded-xl border p-3.5 transition-all ${
                      isSelected
                        ? "border-brand bg-brand/15 shadow-sm"
                        : "border-white/10 bg-white/[0.02] hover:bg-white/[0.05]"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-white text-sm truncate">{p.name}</h4>
                      {p.isDefault && (
                        <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-300 uppercase">
                          Default
                        </span>
                      )}
                    </div>
                    <div className="mt-1 text-xs text-slate-400 truncate">{p.niche || "Tanpa niche"}</div>
                    <div className="mt-2 text-[11px] text-slate-500 line-clamp-1">
                      {p.toneOfVoice || "Belum ada deskripsi tone"}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </aside>

        {/* Right Column: Persona Detail or Form Editor */}
        <section className="rounded-2xl border border-white/10 bg-[#121722] p-6 shadow-sm">
          {isEditing ? (
            <PersonaEditor
              activePersona={activePersona}
              formData={formData}
              setFormData={setFormData}
              onSave={handleSaveForm}
              onCancel={() => setIsEditing(false)}
            />
          ) : activePersona ? (
            <div className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-extrabold text-white">{activePersona.name}</h2>
                    {activePersona.isDefault && (
                      <span className="rounded-full bg-emerald-500/15 text-emerald-300 px-2.5 py-0.5 text-xs font-bold uppercase">
                        Default Active
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-brand-accent font-semibold">{activePersona.niche}</p>
                </div>

                <div className="flex items-center gap-2">
                  {!activePersona.isDefault && (
                    <button
                      type="button"
                      onClick={() => handleSetDefault(activePersona.id)}
                      className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-3 py-1.5 text-xs font-bold text-emerald-300 hover:bg-emerald-500/20"
                    >
                      ★ Set as Default
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleEditCurrent(activePersona)}
                    className="rounded-xl bg-white/10 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-white/15"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(activePersona.id)}
                    className="rounded-xl border border-rose-500/30 px-3 py-1.5 text-xs font-semibold text-rose-400 hover:bg-rose-500/10"
                  >
                    Hapus
                  </button>
                </div>
              </div>

              <div className="space-y-4 text-xs">
                <div className="rounded-xl bg-white/[0.03] p-4 border border-white/5 space-y-1">
                  <div className="font-bold text-slate-300">Tone of Voice:</div>
                  <p className="text-slate-400 text-sm leading-relaxed">{activePersona.toneOfVoice || "-"}</p>
                </div>

                <div className="rounded-xl bg-white/[0.03] p-4 border border-white/5 space-y-1">
                  <div className="font-bold text-slate-300">Target Audience Persona:</div>
                  <p className="text-slate-400 text-sm leading-relaxed">{activePersona.targetAudience || "-"}</p>
                </div>

                <div className="rounded-xl bg-white/[0.03] p-4 border border-white/5 space-y-1">
                  <div className="font-bold text-slate-300">Signature Hook Style:</div>
                  <p className="text-brand-accent text-sm font-semibold leading-relaxed">
                    &ldquo;{activePersona.signatureHook || "-"}&rdquo;
                  </p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 pt-2">
                  <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/[0.04] p-4 space-y-1.5">
                    <div className="font-bold text-emerald-400">Do&apos;s (Wajib Dilakukan):</div>
                    <pre className="text-slate-300 font-sans whitespace-pre-wrap leading-relaxed">
                      {activePersona.dos || "Belum ada aturan Do's."}
                    </pre>
                  </div>

                  <div className="rounded-xl border border-rose-500/20 bg-rose-500/[0.04] p-4 space-y-1.5">
                    <div className="font-bold text-rose-400">Don&apos;ts (Pantangan Konten):</div>
                    <pre className="text-slate-300 font-sans whitespace-pre-wrap leading-relaxed">
                      {activePersona.donts || "Belum ada aturan Don'ts."}
                    </pre>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="py-20 text-center text-slate-400 space-y-3">
              <div className="text-4xl">🎭</div>
              <h3 className="font-bold text-white text-base">Pilih atau Buat Persona</h3>
              <p className="text-xs max-w-sm mx-auto">
                Persona menentukan suara, tata bahasa, dan tujuan naskah otomatis di seluruh Studio.
              </p>
              <button
                type="button"
                onClick={() => setShowGenerateModal(true)}
                className="rounded-xl bg-brand px-5 py-2.5 text-xs font-bold text-white hover:brightness-110"
              >
                ✨ Buka AI Generator
              </button>
            </div>
          )}
        </section>
      </div>

      <PersonaGeneratorModal
        isOpen={showGenerateModal}
        onClose={() => setShowGenerateModal(false)}
        onGenerated={handleAIGenerated}
      />
    </main>
  );
}
