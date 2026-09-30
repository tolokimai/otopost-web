"use client";

import { CONTENT_FORMATS, type ContentFormat, type ThemeIdea } from "@/lib/api";
import { useTranslation } from "@/lib/i18n";

type ThemeModalProps = {
  isOpen: boolean;
  onClose: () => void;
  themes: ThemeIdea[];
  loading: boolean;
  onSelectTheme: (title: string) => void;
};

export function ThemeModal({ isOpen, onClose, themes, loading, onSelectTheme }: ThemeModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="bg-[#121722] border border-white/10 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-5 max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div>
            <h3 className="text-base font-bold text-white">✨ Ide Konsep Seri / Tema Besar AI</h3>
            <p className="text-xs text-slate-400">Pilih satu tema untuk membuat roadmap 7–30 hari</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">✕</button>
        </div>

        <div className="flex-1 overflow-y-auto space-y-3 pr-1 text-xs">
          {loading ? (
            <div className="py-12 text-center text-slate-400">
              Gemini AI sedang menyusun konsep tema seri konten…
            </div>
          ) : (
            themes.map((t, idx) => (
              <div
                key={idx}
                onClick={() => onSelectTheme(t.title)}
                className="cursor-pointer rounded-xl border border-white/10 bg-white/[0.02] p-4 hover:border-brand hover:bg-brand/10 transition-all space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-white text-sm">{t.title}</h4>
                  <span className="rounded bg-brand/20 px-2 py-0.5 text-[10px] font-bold text-brand-accent">
                    Pilih Tema →
                  </span>
                </div>
                <p className="text-slate-300 leading-relaxed">{t.description}</p>
                <div className="text-[11px] text-slate-500 font-medium">🎯 Target: {t.targetGoal}</div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

type RoadmapModalProps = {
  isOpen: boolean;
  onClose: () => void;
  selectedTheme: string;
  durationDays: number;
  setDurationDays: (d: number) => void;
  selectedFormats: ContentFormat[];
  onToggleFormat: (format: ContentFormat) => void;
  generating: boolean;
  onGenerate: () => void;
};

export function RoadmapModal({
  isOpen,
  onClose,
  selectedTheme,
  durationDays,
  setDurationDays,
  selectedFormats,
  onToggleFormat,
  generating,
  onGenerate,
}: RoadmapModalProps) {
  const { t } = useTranslation();
  if (!isOpen) return null;

  const formatLabels: Record<ContentFormat, string> = {
    CAROUSEL: t("contentPlan.format_carousel"),
    PODCAST_CLIP: t("contentPlan.format_podcast_clip"),
    REMAKE: t("contentPlan.format_remake"),
    REELS: t("contentPlan.format_reels"),
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="bg-[#121722] border border-white/10 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 text-xs">
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <h3 className="text-base font-bold text-white">Rancang Jadwal Roadmap</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white">✕</button>
        </div>

        <div>
          <label className="block font-semibold text-slate-400 mb-1">Tema Terpilih:</label>
          <div className="p-3 bg-black/30 border border-white/10 rounded-xl font-bold text-white text-sm">
            {selectedTheme}
          </div>
        </div>

        <div>
          <label className="block font-semibold text-slate-400 mb-1">Durasi Jadwal Konten:</label>
          <div className="grid grid-cols-3 gap-2">
            {[7, 14, 30].map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDurationDays(d)}
                className={`rounded-xl border p-2.5 font-bold transition-all ${
                  durationDays === d
                    ? "border-brand bg-brand text-white shadow-sm"
                    : "border-white/10 bg-black/30 text-slate-300"
                }`}
              >
                {d} Hari
              </button>
            ))}
          </div>
        </div>

        <fieldset>
          <legend className="mb-2 font-semibold text-slate-400">
            {t("contentPlan.roadmap_content_types")}
          </legend>
          <div className="grid grid-cols-2 gap-2">
            {CONTENT_FORMATS.map((format) => (
              <label
                key={format}
                className="flex items-center gap-2 rounded-lg border border-white/10 bg-black/20 p-2.5 text-slate-200"
              >
                <input
                  type="checkbox"
                  checked={selectedFormats.includes(format)}
                  onChange={() => onToggleFormat(format)}
                  disabled={generating || (selectedFormats.length === 1 && selectedFormats.includes(format))}
                  className="h-4 w-4 accent-indigo-500"
                />
                <span>{formatLabels[format]}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <div className="pt-2 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-white/10 px-4 py-2 font-semibold text-slate-400 hover:text-white"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={onGenerate}
            disabled={generating}
            className="rounded-xl bg-gradient-to-r from-brand to-brand-accent px-5 py-2 font-bold text-white shadow-md hover:brightness-110 disabled:opacity-50"
          >
            {generating ? "Menghasilkan Jadwal…" : `Generate ${durationDays} Hari`}
          </button>
        </div>
      </div>
    </div>
  );
}
