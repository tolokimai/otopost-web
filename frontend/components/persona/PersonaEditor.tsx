"use client";

import { type Persona } from "@/lib/api";

type FormState = {
  name: string;
  niche: string;
  toneOfVoice: string;
  targetAudience: string;
  signatureHook: string;
  dos: string;
  donts: string;
  isDefault: boolean;
};

type Props = {
  activePersona: Persona | null;
  formData: FormState;
  setFormData: (val: FormState) => void;
  onSave: (e: React.FormEvent) => void;
  onCancel: () => void;
};

export default function PersonaEditor({
  activePersona,
  formData,
  setFormData,
  onSave,
  onCancel,
}: Props) {
  return (
    <form onSubmit={onSave} className="space-y-5">
      <div className="flex items-center justify-between border-b border-white/10 pb-3">
        <h3 className="text-base font-bold text-white">
          {activePersona ? `Edit Persona: ${activePersona.name}` : "Buat Persona Baru"}
        </h3>
        <button
          type="button"
          onClick={onCancel}
          className="text-xs text-slate-400 hover:text-white"
        >
          Batal
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1">
            Nama Brand / Kreator *
          </label>
          <input
            type="text"
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Contoh: Tech Guru ID"
            className="w-full rounded-xl border border-white/10 bg-black/30 p-2.5 text-xs text-white focus:outline-none focus:border-brand"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1">
            Niche / Industri
          </label>
          <input
            type="text"
            value={formData.niche}
            onChange={(e) => setFormData({ ...formData, niche: e.target.value })}
            placeholder="Contoh: AI & Teknologi, Keuangan, Edukasi Bisnis"
            className="w-full rounded-xl border border-white/10 bg-black/30 p-2.5 text-xs text-white focus:outline-none focus:border-brand"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold text-slate-300 mb-1">
          Tone of Voice (Gaya Bicara)
        </label>
        <input
          type="text"
          value={formData.toneOfVoice}
          onChange={(e) => setFormData({ ...formData, toneOfVoice: e.target.value })}
          placeholder="Contoh: Santai, energik, edukatif, provokatif solutif"
          className="w-full rounded-xl border border-white/10 bg-black/30 p-2.5 text-xs text-white focus:outline-none focus:border-brand"
        />
      </div>

      <div>
        <label className="block text-xs font-semibold text-slate-300 mb-1">
          Target Audience Persona
        </label>
        <textarea
          rows={3}
          value={formData.targetAudience}
          onChange={(e) => setFormData({ ...formData, targetAudience: e.target.value })}
          placeholder="Karakteristik, rentang usia, problem utama, dan minat audiens..."
          className="w-full rounded-xl border border-white/10 bg-black/30 p-2.5 text-xs text-white focus:outline-none focus:border-brand"
        />
      </div>

      <div>
        <label className="block text-xs font-semibold text-slate-300 mb-1">
          Signature Hook Style
        </label>
        <textarea
          rows={2}
          value={formData.signatureHook}
          onChange={(e) => setFormData({ ...formData, signatureHook: e.target.value })}
          placeholder="Pola kalimat pembuka 3 detik pertama yang jadi ciri khas..."
          className="w-full rounded-xl border border-white/10 bg-black/30 p-2.5 text-xs text-white focus:outline-none focus:border-brand"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-xs font-semibold text-emerald-400 mb-1">
            Do&apos;s (Wajib Dilakukan)
          </label>
          <textarea
            rows={4}
            value={formData.dos}
            onChange={(e) => setFormData({ ...formData, dos: e.target.value })}
            placeholder="- Berikan aksi praktis&#10;- Sertakan analogi sehari-hari&#10;- Jelaskan langkah 1-2-3"
            className="w-full rounded-xl border border-white/10 bg-black/30 p-2.5 text-xs text-white focus:outline-none focus:border-brand font-mono"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-rose-400 mb-1">
            Don&apos;ts (Dilarang dalam Konten)
          </label>
          <textarea
            rows={4}
            value={formData.donts}
            onChange={(e) => setFormData({ ...formData, donts: e.target.value })}
            placeholder="- Jangan pakai jargon asing tanpa arti&#10;- Jangan jualan di awal kalimat&#10;- Hindari nada menggurui"
            className="w-full rounded-xl border border-white/10 bg-black/30 p-2.5 text-xs text-white focus:outline-none focus:border-brand font-mono"
          />
        </div>
      </div>

      <label className="flex items-center gap-2 cursor-pointer pt-2">
        <input
          type="checkbox"
          checked={formData.isDefault}
          onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
          className="rounded border-white/20 text-brand focus:ring-brand"
        />
        <span className="text-xs text-slate-300 font-semibold">
          Jadikan Persona Default untuk seluruh AI Generator
        </span>
      </label>

      <div className="flex gap-3 pt-3">
        <button
          type="submit"
          className="rounded-xl bg-gradient-to-r from-brand to-brand-accent px-6 py-2.5 text-xs font-bold text-white shadow-md hover:brightness-110"
        >
          Simpan Persona
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-xl border border-white/15 px-4 py-2.5 text-xs font-semibold text-slate-400 hover:text-white"
        >
          Batal
        </button>
      </div>
    </form>
  );
}
