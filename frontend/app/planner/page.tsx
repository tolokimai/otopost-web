"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import Header from "@/components/Header";
import { useAuth } from "@/lib/auth";
import { contentApi, type ContentItem, type ContentPlan, type Persona, type StudioWorkflow } from "@/lib/content-api";

const CHANNELS = ["Instagram", "TikTok", "YouTube", "LinkedIn"];
const WORKFLOWS: Array<{ id: StudioWorkflow; label: string }> = [{ id: "carousel", label: "Carousel" }, { id: "podcast", label: "Podcast Clip" }, { id: "remake", label: "Remake" }];

export default function PlannerPage() {
  const { user, loading, refresh: refreshAuth } = useAuth();
  const router = useRouter();
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [plans, setPlans] = useState<ContentPlan[]>([]);
  const [activePlan, setActivePlan] = useState<ContentPlan | null>(null);
  const [items, setItems] = useState<ContentItem[]>([]);
  const [personaId, setPersonaId] = useState("");
  const [durationDays, setDurationDays] = useState<7 | 30>(7);
  const [startDate, setStartDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [goal, setGoal] = useState("Pertumbuhan audiens dan konversi");
  const [campaign, setCampaign] = useState("");
  const [channels, setChannels] = useState<string[]>(["Instagram", "TikTok"]);
  const [workflows, setWorkflows] = useState<StudioWorkflow[]>(["carousel"]);
  const [postsPerWeek, setPostsPerWeek] = useState(5);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { if (!loading && !user) router.replace("/login?next=/planner"); }, [loading, user, router]);
  useEffect(() => { if (user) void loadBase(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [user]);

  async function loadBase() {
    setError(null);
    try {
      const [personaResult, planResult] = await Promise.all([contentApi.listPersonas(), contentApi.listPlans()]);
      setPersonas(personaResult.personas); setPlans(planResult.plans);
      const preferred = personaResult.personas.find((item) => item.isDefault) || personaResult.personas[0];
      if (preferred && !personaId) setPersonaId(preferred.id);
      if (planResult.plans[0]) await openPlan(planResult.plans[0].id);
    } catch (err) { setError(err instanceof Error ? err.message : String(err)); }
  }

  async function openPlan(id: string) {
    setBusy("Membuka content plan…");
    try { const result = await contentApi.getPlan(id); setActivePlan(result.plan); setItems(result.items); }
    catch (err) { setError(err instanceof Error ? err.message : String(err)); } finally { setBusy(null); }
  }

  function toggleChannel(value: string) { setChannels((current) => current.includes(value) ? current.filter((item) => item !== value) : [...current, value]); }
  function toggleWorkflow(value: StudioWorkflow) { setWorkflows((current) => current.includes(value) ? current.filter((item) => item !== value) : [...current, value]); }

  async function generate() {
    if (!personaId) return setError("Buat dan pilih Persona terlebih dahulu.");
    if (!channels.length || !workflows.length) return setError("Pilih minimal satu channel dan workflow.");
    setBusy(`AI menyusun kalender ${durationDays} hari…`); setError(null);
    try {
      const result = await contentApi.generatePlan({ personaId, durationDays, startDate, goal, campaign, channels, workflows, postsPerWeek });
      setActivePlan(result.plan); setItems(result.items); setPlans((current) => [result.plan, ...current.filter((item) => item.id !== result.plan.id)]);
      await refreshAuth();
    } catch (err) { setError(err instanceof Error ? err.message : String(err)); } finally { setBusy(null); }
  }

  async function setStatus(item: ContentItem, next: ContentItem["status"]) {
    setBusy(`Mengubah status ${item.title}…`);
    try { const updated = await contentApi.updateItem(item.id, { status: next }); setItems((current) => current.map((value) => value.id === item.id ? updated : value)); }
    catch (err) { setError(err instanceof Error ? err.message : String(err)); } finally { setBusy(null); }
  }

  async function handoff(item: ContentItem) {
    setBusy(`Mengirim ${item.title} ke Studio…`); setError(null);
    try { window.location.assign((await contentApi.handoffItem(item.id, item.workflow)).targetUrl); }
    catch (err) { setError(err instanceof Error ? err.message : String(err)); setBusy(null); }
  }

  if (loading || !user) return <main className="mx-auto max-w-7xl px-4"><Header /><p className="py-12 text-center text-sm text-slate-400">Memuat…</p></main>;

  return <main className="mx-auto max-w-7xl px-4 pb-24">
    <Header />
    <div className="mb-7 flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-accent">Content Engine · Langkah 2</p><h1 className="mt-1 text-3xl font-extrabold">AI Content Planner</h1><p className="mt-2 max-w-2xl text-sm text-slate-400">Ubah persona menjadi kalender 7/30 hari. Hasil harus disetujui sebelum masuk Studio.</p></div><Link href="/library" className="rounded-xl border border-brand px-4 py-2 text-sm font-bold text-brand-accent">Buka Library →</Link></div>
    {busy ? <div className="mb-4 rounded-xl border border-brand/40 bg-brand/10 p-3 text-sm">⏳ {busy}</div> : null}{error ? <div className="mb-4 rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-200">{error}</div> : null}
    <section className="mb-6 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4"><label className="text-xs text-slate-400">Persona<select value={personaId} onChange={(e) => setPersonaId(e.target.value)} className="input mt-1"><option value="">Pilih persona…</option>{personas.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label className="text-xs text-slate-400">Mulai<input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="input mt-1" /></label><label className="text-xs text-slate-400">Posting/minggu<input type="number" min={1} max={14} value={postsPerWeek} onChange={(e) => setPostsPerWeek(Number(e.target.value))} className="input mt-1" /></label><div className="text-xs text-slate-400">Durasi<div className="mt-1 grid grid-cols-2 gap-2">{([7, 30] as const).map((days) => <button key={days} onClick={() => setDurationDays(days)} className={`rounded-xl border p-3 text-sm font-bold ${durationDays === days ? "border-brand bg-brand/15" : "border-white/10"}`}>{days} hari</button>)}</div></div></div>
      <div className="mt-4 grid gap-3 md:grid-cols-2"><label className="text-xs text-slate-400">Tujuan<input value={goal} onChange={(e) => setGoal(e.target.value)} className="input mt-1" /></label><label className="text-xs text-slate-400">Campaign / offer<input value={campaign} onChange={(e) => setCampaign(e.target.value)} placeholder="Launch ebook September" className="input mt-1" /></label></div>
      <div className="mt-4 grid gap-4 md:grid-cols-2"><ChoiceGroup label="Channel" values={CHANNELS} selected={channels} onToggle={toggleChannel} /><ChoiceGroup label="Workflow Studio" values={WORKFLOWS.map((item) => item.id)} selected={workflows} onToggle={(value) => toggleWorkflow(value as StudioWorkflow)} labels={Object.fromEntries(WORKFLOWS.map((item) => [item.id, item.label]))} /></div>
      <button onClick={() => void generate()} disabled={!!busy || !personaId} className="mt-5 rounded-xl bg-gradient-to-r from-brand to-brand-accent px-6 py-3 text-sm font-extrabold disabled:opacity-40">✨ Generate Content Plan · 1 kredit</button>
    </section>
    <div className="grid gap-5 lg:grid-cols-[280px_1fr]">
      <aside className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"><h2 className="mb-3 font-bold">Plan tersimpan</h2><div className="space-y-2">{plans.map((plan) => <button key={plan.id} onClick={() => void openPlan(plan.id)} className={`w-full rounded-xl border p-3 text-left ${activePlan?.id === plan.id ? "border-brand bg-brand/10" : "border-white/10"}`}><div className="font-semibold">{plan.title}</div><div className="mt-1 text-xs text-slate-400">{plan.durationDays} hari · {plan.itemCount ?? 0} konten</div></button>)}</div></aside>
      <section>{activePlan ? <div className="mb-4 rounded-2xl border border-white/10 bg-white/[0.03] p-5"><div className="flex flex-wrap items-center justify-between gap-2"><div><h2 className="text-xl font-bold">{activePlan.title}</h2><p className="text-xs text-slate-400">{activePlan.goal} · mulai {activePlan.startDate}</p></div><span className="rounded-full bg-brand/15 px-3 py-1 text-xs uppercase text-brand-accent">{activePlan.status}</span></div>{activePlan.strategy.positioning ? <p className="mt-3 text-sm text-slate-300">{activePlan.strategy.positioning}</p> : null}</div> : null}<div className="space-y-3">{items.map((item) => <article key={item.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0 flex-1"><div className="text-xs text-slate-400">{item.scheduledDate || "Tanpa tanggal"} · {item.channel} · {item.workflow}</div><h3 className="mt-1 font-bold">{item.title}</h3><p className="mt-1 text-sm text-slate-300">{item.hook}</p><p className="mt-2 text-xs text-slate-500">CTA: {item.cta || "—"}</p></div><span className="rounded-full border border-white/10 px-2 py-1 text-[10px] uppercase">{item.status}</span></div><div className="mt-3 flex flex-wrap gap-2">{item.status === "draft" ? <button onClick={() => void setStatus(item, "review")} className="rounded-lg border border-white/15 px-3 py-1 text-xs">Kirim review</button> : null}{item.status === "review" ? <button onClick={() => void setStatus(item, "approved")} className="rounded-lg bg-green-500 px-3 py-1 text-xs font-bold text-black">Setujui</button> : null}{item.status === "approved" ? <button onClick={() => void handoff(item)} className="rounded-lg bg-brand px-3 py-1 text-xs font-bold">Kirim ke Studio →</button> : null}</div></article>)}</div></section>
    </div>
  </main>;
}

function ChoiceGroup({ label, values, selected, onToggle, labels = {} }: { label: string; values: string[]; selected: string[]; onToggle: (value: string) => void; labels?: Record<string, string> }) { return <div><div className="mb-2 text-xs text-slate-400">{label}</div><div className="flex flex-wrap gap-2">{values.map((value) => <button key={value} onClick={() => onToggle(value)} className={`rounded-lg border px-3 py-2 text-xs ${selected.includes(value) ? "border-brand bg-brand/15 text-brand-accent" : "border-white/10"}`}>{labels[value] || value}</button>)}</div></div>; }
