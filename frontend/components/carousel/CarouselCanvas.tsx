"use client";

import React from "react";
import type { CarouselDesign, CarouselSlide } from "@/lib/api";

const ASPECT_CLASS: Record<string, string> = {
  "1:1": "aspect-square",
  "4:5": "aspect-[4/5]",
  "3:4": "aspect-[3/4]",
  "9:16": "aspect-[9/16]",
  "16:9": "aspect-video",
};

const THEMES: Record<string, string> = {
  "Solid Dark": "from-zinc-950 to-zinc-900",
  "Solid Light": "from-slate-100 to-slate-300",
  "Gradient Indigo": "from-slate-950 to-indigo-700",
  "Gradient Sunset": "from-rose-950 to-orange-500",
  "Cyber Neon": "from-fuchsia-950 to-indigo-900",
  Luxury: "from-zinc-950 to-amber-950",
  Minimal: "from-white to-slate-200",
};

export default function CarouselCanvas({
  slide,
  design,
  index,
  total,
}: {
  slide: CarouselSlide;
  design: CarouselDesign;
  index: number;
  total: number;
}) {
  const isLight = ["Solid Light", "Minimal"].includes(design.backgroundTheme) && !slide.imageBase64;

  return (
    <div
      className={`relative w-full max-w-[460px] overflow-hidden rounded-2xl bg-gradient-to-br shadow-2xl transition-all duration-300 ${
        ASPECT_CLASS[design.aspectRatio] || ASPECT_CLASS["4:5"]
      } ${THEMES[design.backgroundTheme] || THEMES["Gradient Indigo"]}`}
      style={{
        color: isLight ? "#111827" : design.textColorHex,
        backgroundImage: slide.imageBase64
          ? `linear-gradient(#0008,#0008),url(${slide.imageBase64})`
          : undefined,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      <div
        className="absolute -right-16 -top-16 h-52 w-52 rounded-full opacity-20"
        style={{ backgroundColor: design.accentColorHex }}
      />
      <div className="absolute inset-x-[9%] top-[12%] text-center">
        {slide.subtext ? (
          <span
            className="rounded-full px-3 py-1 text-[10px] font-bold uppercase text-white shadow-sm"
            style={{ backgroundColor: design.accentColorHex }}
          >
            {slide.subtext}
          </span>
        ) : null}
      </div>
      <div className="absolute inset-x-[9%] top-[25%] text-center">
        <h2
          className="text-2xl font-extrabold leading-tight sm:text-3xl"
          style={{
            fontSize: `${design.baseFontScale * 2}rem`,
            textShadow: design.textEffect === "shadow" ? "0 4px 10px #0009" : undefined,
          }}
        >
          {slide.headline}
        </h2>
      </div>
      <div className="absolute inset-x-[12%] top-[56%] text-center text-xs leading-relaxed opacity-90 sm:text-sm">
        {slide.body}
      </div>
      <div className="absolute inset-x-[9%] bottom-[6%] flex justify-between text-[10px] opacity-75">
        <span>{design.watermarkText}</span>
        <span>
          {design.showPageNumber
            ? `${String(index + 1).padStart(2, "0")} / ${String(total).padStart(2, "0")}`
            : ""}
        </span>
      </div>
    </div>
  );
}
