"use client";

import { useState } from "react";
import { api, type ClipResult, type HooksResponse } from "@/lib/api";

function Field({
  label,
  value,
  onCopy,
  copied,
}: {
  label: string;
  value: string;
  onCopy: () => void;
  copied: boolean;
}) {
  return (
    <div className="rounded-lg bg-black/30 p-2">
      <div className="mb-1 flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-wide text-slate-500">{label}</span>
        <button onClick={onCopy} className="text-[10px] text-brand-accent">
          {copied ? "✓ Tersalin" : "Salin"}
        </button>
      </div>
      <div className="whitespace-pre-wrap text-slate-200">{value}</div>
    </div>
  );
}

export default function ClipCard({
  clip,
  content,
  onGenerate,
  generating,
}: {
  clip: ClipResult;
  content?: HooksResponse;
  onGenerate: (clip: ClipResult) => void;
  generating: boolean;
}) {
  const [copied, setCopied] = useState<string | null>(null);
  const src = api.mediaUrl(clip.downloadUrl);

  function copy(text: string, key: string) {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(text);
    }
    setCopied(key);
    setTimeout(() => setCopied(null), 1200);
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-black/20">
      <video src={src} controls playsInline className="aspect-[9/16] w-full bg-black object-contain" />
      <div className="p-3">
        <div className="mb-1 text-sm font-semibold">{clip.title}</div>
        <div className="mb-2 flex flex-wrap gap-1">
          {clip.reframed ? (
            <span className="rounded-full bg-brand/20 px-2 py-0.5 text-[10px] text-brand-accent">
              reframed
            </span>
          ) : null}
          {clip.subtitled ? (
            <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] text-emerald-300">
              subtitle
            </span>
          ) : null}
        </div>
        <div className="flex gap-2">
          <a
            href={src}
            download
            className="flex-1 rounded-lg bg-white/10 px-3 py-2 text-center text-xs font-semibold hover:bg-white/20"
          >
            ⬇️ Unduh
          </a>
          <button
            onClick={() => onGenerate(clip)}
            disabled={generating}
            className="flex-1 rounded-lg bg-brand px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
          >
            {generating ? "Membuat…" : "✨ Caption AI"}
          </button>
        </div>
        {content ? (
          <div className="mt-3 space-y-2 text-xs">
            <Field
              label="Hook"
              value={content.viralHook}
              onCopy={() => copy(content.viralHook, "hook")}
              copied={copied === "hook"}
            />
            <Field
              label="Caption"
              value={content.caption}
              onCopy={() => copy(content.caption, "cap")}
              copied={copied === "cap"}
            />
            <Field
              label="Hashtags"
              value={content.hashtags}
              onCopy={() => copy(content.hashtags, "tag")}
              copied={copied === "tag"}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}
