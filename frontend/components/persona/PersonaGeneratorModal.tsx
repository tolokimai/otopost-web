"use client";

import { useState } from "react";
import { api, type Persona } from "@/lib/api";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onGenerated: (persona: Partial<Persona>, notice?: string) => void;
};

export default function PersonaGeneratorModal({ isOpen, onClose, onGenerated }: Props) {
  const [genNiche, setGenNiche] = useState("");
  const [genName, setGenName] = useState("");
  const [genAudience, setGenAudience] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  if (!isOpen) return null;

  async function handleRunAIGenerator() {
    if (!genNiche.trim() || !genName.trim()) {
      alert("Masukkan Niche dan Nama Brand/Kreator terlebih dahulu.");
      return;
    }

    setIsGenerating(true);
    try {
      const res = await api.generatePersona({
        niche: genNiche.trim(),
        name: genName.trim(),
        target_audience: genAudience.trim(),
      });

      onGenerated(
        {
          name: res.persona.name,
          niche: res.persona.niche,
          toneOfVoice: res.persona.toneOfVoice,
          targetAudience: res.persona.targetAudience,
          signatureHook: res.persona.signatureHook,
          dos: res.persona.dos,
          donts: res.persona.donts,
        },
        res.notice
      );
      onClose();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Gagal men-generate persona.");
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="bg-[#121722] border border-white/10 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div>
            <h3 className="text-base font-bold text-white">✨ AI Persona Generator</h3>
            <p className="text-xs text-slate-400">Ditenagai Google Gemini AI</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            ✕
          </button>
        </div>

        <div className="space-y-3.5 text-xs">
          <div>
            <label className="block font-semibold text-slate-300 mb-1">
              Niche / Industri Konten *
            </label>
            <input
              type="text"
              value={genNiche}
              onChange={(e) => setGenNiche(e.target.value)}
              placeholder="Contoh: Digital Marketing, Fitness & Diet, Coding"
              className="w-full rounded-xl border border-white/10 bg-black/30 p-2.5 text-white focus:outline-none focus:border-brand"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-300 mb-1">
              Nama Brand atau Kreator *
            </label>
            <input
              type="text"
              value={genName}
              onChange={(e) => setGenName(e.target.value)}
              placeholder="Contoh: Coach Fajar, StartupKita"
              className="w-full rounded-xl border border-white/10 bg-black/30 p-2.5 text-white focus:outline-none focus:border-brand"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-300 mb-1">
              Target Audiens Awal (Opsional)
            </label>
            <input
              type="text"
              value={genAudience}
              onChange={(e) => setGenAudience(e.target.value)}
              placeholder="Contoh: Mahasiswa, fresh graduate, atau pebisnis muda"
              className="w-full rounded-xl border border-white/10 bg-black/30 p-2.5 text-white focus:outline-none focus:border-brand"
            />
          </div>
        </div>

        <div className="pt-2 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-white/10 px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleRunAIGenerator}
            disabled={isGenerating}
            className="rounded-xl bg-gradient-to-r from-brand to-brand-accent px-5 py-2 text-xs font-bold text-white shadow-md hover:brightness-110 disabled:opacity-50"
          >
            {isGenerating ? "AI Sedang Menganalisis…" : "Generate Persona"}
          </button>
        </div>
      </div>
    </div>
  );
}
