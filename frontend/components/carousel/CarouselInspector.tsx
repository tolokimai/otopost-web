"use client";

import React from "react";
import type { CarouselDesign, CarouselSlide } from "@/lib/api";

const THEME_NAMES = [
  "Solid Dark",
  "Solid Light",
  "Gradient Indigo",
  "Gradient Sunset",
  "Cyber Neon",
  "Luxury",
  "Minimal",
];

interface CarouselInspectorProps {
  title: string;
  setTitle: (title: string) => void;
  current: CarouselSlide | undefined;
  active: number;
  patchSlide: (index: number, patch: Partial<CarouselSlide>) => void;
  moveSlide: (index: number, delta: number) => void;
  removeSlide: (index: number) => void;
  design: CarouselDesign;
  setDesign: React.Dispatch<React.SetStateAction<CarouselDesign>>;
  readDataUrl: (file: File) => Promise<string>;
}

export default function CarouselInspector({
  title,
  setTitle,
  current,
  active,
  patchSlide,
  moveSlide,
  removeSlide,
  design,
  setDesign,
  readDataUrl,
}: CarouselInspectorProps) {
  return (
    <aside className="space-y-4 rounded-2xl border border-token bg-surface p-4 text-xs">
      <div>
        <label className="block text-[11px] font-semibold text-token-muted mb-1">
          Judul Project
        </label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full rounded-xl border border-token bg-black/20 p-2 font-semibold text-token focus:outline-none focus:ring-1 focus:ring-brand"
        />
      </div>

      {current && (
        <div className="space-y-3">
          <label className="block text-token-muted">
            Label Subteks
            <input
              value={current.subtext}
              onChange={(e) => patchSlide(active, { subtext: e.target.value })}
              className="mt-1 w-full rounded-xl border border-token bg-black/20 p-2 text-token focus:outline-none focus:ring-1 focus:ring-brand"
            />
          </label>
          <label className="block text-token-muted">
            Headline Slide
            <textarea
              value={current.headline}
              onChange={(e) => patchSlide(active, { headline: e.target.value })}
              rows={2}
              className="mt-1 w-full rounded-xl border border-token bg-black/20 p-2 text-token focus:outline-none focus:ring-1 focus:ring-brand"
            />
          </label>
          <label className="block text-token-muted">
            Body Konten
            <textarea
              value={current.body}
              onChange={(e) => patchSlide(active, { body: e.target.value })}
              rows={3}
              className="mt-1 w-full rounded-xl border border-token bg-black/20 p-2 text-token focus:outline-none focus:ring-1 focus:ring-brand"
            />
          </label>
          <label className="block text-token-muted">
            Background Foto
            <input
              type="file"
              accept="image/*"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (file) {
                  patchSlide(active, { imageBase64: await readDataUrl(file) });
                }
              }}
              className="mt-1 block w-full text-[11px]"
            />
          </label>
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={() => moveSlide(active, -1)}
              className="rounded-lg border border-token px-3 py-1 hover:bg-surface-hover text-token"
            >
              ↑ Geser
            </button>
            <button
              type="button"
              onClick={() => moveSlide(active, 1)}
              className="rounded-lg border border-token px-3 py-1 hover:bg-surface-hover text-token"
            >
              ↓ Geser
            </button>
            <button
              type="button"
              onClick={() => removeSlide(active)}
              className="ml-auto text-xs text-red-400 hover:text-red-300"
            >
              Hapus Slide
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2 border-t border-token pt-3">
        <label className="text-token-muted">
          Rasio
          <select
            value={design.aspectRatio}
            onChange={(e) => setDesign({ ...design, aspectRatio: e.target.value })}
            className="mt-1 w-full rounded-lg border border-token bg-black/40 p-1.5 text-token"
          >
            {["1:1", "4:5", "3:4", "9:16", "16:9"].map((v) => (
              <option key={v}>{v}</option>
            ))}
          </select>
        </label>
        <label className="text-token-muted">
          Font
          <select
            value={design.fontFamily}
            onChange={(e) => setDesign({ ...design, fontFamily: e.target.value })}
            className="mt-1 w-full rounded-lg border border-token bg-black/40 p-1.5 text-token"
          >
            {["Sans", "Rounded", "Serif", "Monospace"].map((v) => (
              <option key={v}>{v}</option>
            ))}
          </select>
        </label>
      </div>

      <label className="block text-token-muted">
        Tema Warna
        <select
          value={design.backgroundTheme}
          onChange={(e) => setDesign({ ...design, backgroundTheme: e.target.value })}
          className="mt-1 w-full rounded-lg border border-token bg-black/40 p-1.5 text-token"
        >
          {THEME_NAMES.map((v) => (
            <option key={v}>{v}</option>
          ))}
        </select>
      </label>

      <div className="grid grid-cols-2 gap-2">
        <label className="text-token-muted">
          Teks
          <input
            type="color"
            value={design.textColorHex}
            onChange={(e) => setDesign({ ...design, textColorHex: e.target.value })}
            className="mt-1 h-8 w-full rounded-lg cursor-pointer bg-transparent"
          />
        </label>
        <label className="text-token-muted">
          Aksen
          <input
            type="color"
            value={design.accentColorHex}
            onChange={(e) => setDesign({ ...design, accentColorHex: e.target.value })}
            className="mt-1 h-8 w-full rounded-lg cursor-pointer bg-transparent"
          />
        </label>
      </div>

      <label className="block text-token-muted">
        Watermark
        <input
          value={design.watermarkText}
          onChange={(e) => setDesign({ ...design, watermarkText: e.target.value })}
          className="mt-1 w-full rounded-xl border border-token bg-black/20 p-2 text-token"
        />
      </label>
    </aside>
  );
}
