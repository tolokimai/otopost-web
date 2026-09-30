"use client";

import { type ContentPlanItem } from "@/lib/api";

type FormState = {
  dayNumber: number;
  topic: string;
  hook: string;
  outline: string;
  format: string;
  status: string;
  caption: string;
  hashtags: string;
};

type Props = {
  isOpen: boolean;
  onClose: () => void;
  editingPlan: ContentPlanItem | null;
  form: FormState;
  setForm: (f: FormState) => void;
  onSave: (e: React.FormEvent) => void;
};

export default function PlanEditModal({
  isOpen,
  onClose,
  editingPlan,
  form,
  setForm,
  onSave,
}: Props) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
      <form
        onSubmit={onSave}
        className="bg-[#121722] border border-white/10 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 text-xs max-h-[85vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <h3 className="text-base font-bold text-white">
            {editingPlan ? "Edit Item Rencana" : "Tambah Item Konten Manual"}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white"
          >
            ✕
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block font-semibold text-slate-300 mb-1">Hari Ke-</label>
            <input
              type="number"
              min={1}
              value={form.dayNumber}
              onChange={(e) => setForm({ ...form, dayNumber: Number(e.target.value) })}
              className="w-full rounded-xl border border-white/10 bg-black/30 p-2.5 text-white"
            />
          </div>
          <div>
            <label className="block font-semibold text-slate-300 mb-1">Format Konten</label>
            <select
              value={form.format}
              onChange={(e) => setForm({ ...form, format: e.target.value })}
              className="w-full rounded-xl border border-white/10 bg-black/30 p-2.5 text-white"
            >
              <option value="CAROUSEL">CAROUSEL</option>
              <option value="PODCAST_CLIP">PODCAST_CLIP</option>
              <option value="REMAKE">REMAKE</option>
              <option value="REELS">REELS</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block font-semibold text-slate-300 mb-1">Topik Utama *</label>
          <input
            type="text"
            required
            value={form.topic}
            onChange={(e) => setForm({ ...form, topic: e.target.value })}
            placeholder="Judul / topik pembahasan hari ini"
            className="w-full rounded-xl border border-white/10 bg-black/30 p-2.5 text-white"
          />
        </div>

        <div>
          <label className="block font-semibold text-slate-300 mb-1">Hook Kalimat Pembuka</label>
          <textarea
            rows={2}
            value={form.hook}
            onChange={(e) => setForm({ ...form, hook: e.target.value })}
            placeholder="Hook 3 detik pertama..."
            className="w-full rounded-xl border border-white/10 bg-black/30 p-2.5 text-white"
          />
        </div>

        <div>
          <label className="block font-semibold text-slate-300 mb-1">Outline Poin & CTA</label>
          <textarea
            rows={3}
            value={form.outline}
            onChange={(e) => setForm({ ...form, outline: e.target.value })}
            placeholder="Poin bahasan & call to action penutup..."
            className="w-full rounded-xl border border-white/10 bg-black/30 p-2.5 text-white"
          />
        </div>

        <div className="pt-2 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-white/10 px-4 py-2 font-semibold text-slate-400 hover:text-white"
          >
            Batal
          </button>
          <button
            type="submit"
            className="rounded-xl bg-gradient-to-r from-brand to-brand-accent px-5 py-2 font-bold text-white shadow-md hover:brightness-110"
          >
            Simpan
          </button>
        </div>
      </form>
    </div>
  );
}
