import { type ViralSegment } from "@/lib/api";

export default function SegmentCard({
  seg,
  index,
  selected,
  onToggle,
}: {
  seg: ViralSegment;
  index: number;
  selected: boolean;
  onToggle: (i: number) => void;
}) {
  return (
    <label
      className={`flex cursor-pointer gap-3 rounded-xl border p-3 transition ${
        selected ? "border-brand bg-brand/5" : "border-white/10 bg-black/20"
      }`}
    >
      <input
        type="checkbox"
        checked={selected}
        onChange={() => onToggle(index)}
        className="mt-1 h-4 w-4 accent-[#7c5cff]"
      />
      <div className="min-w-0">
        <div className="text-sm font-semibold">{seg.title}</div>
        <div className="mt-0.5 text-xs text-brand-accent">{seg.durationFormatted}</div>
        {seg.hook ? <div className="mt-1 text-xs text-slate-300">💬 {seg.hook}</div> : null}
        {seg.transcriptSnippet ? (
          <div className="mt-1 line-clamp-2 text-xs text-slate-500">{seg.transcriptSnippet}</div>
        ) : null}
        {seg.reasonWhyViral ? (
          <div className="mt-1 text-xs text-amber-400/80">🔥 {seg.reasonWhyViral}</div>
        ) : null}
      </div>
    </label>
  );
}
