"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import Header from "@/components/Header";
import { useAuth } from "@/lib/auth";
import { contentApi, type ContentItem, type ContentStatus, type StudioWorkflow } from "@/lib/content-api";

const STATUSES: Array<{ id: ContentStatus | ""; label: string }> = [{ id: "", label: "Semua" }, { id: "draft", label: "Draft" }, { id: "review", label: "Review" }, { id: "approved", label: "Approved" }, { id: "in_production", label: "Produksi" }, { id: "scheduled", label: "Terjadwal" }, { id: "published", label: "Published" }, { id: "failed", label: "Failed" }];
const WORKFLOWS: StudioWorkflow[] = ["carousel", "podcast", "remake", "self-video", "ai-video"];

export default function LibraryPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [items, setItems] = useState<ContentItem[]>([]);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState<ContentStatus | "">("");
  const [workflowFilter, setWorkflowFilter] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [draft, setDraft] = useState({ title: "", hook: "", workflow: "carousel" as StudioWorkflow, channel: "Instagram", scheduledDate: "" });
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { if (!loading && !user) router.replace("/login?next=/library"); }, [loading, user, router]);
  useEffect(() => { if (user) void reload(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [user, statusFilter, workflowFilter]);

  async function reload() {
    setBusy("Memuat content library…"); setError(null);
    try { const result = await contentApi.listItems({ status: statusFilter, workflow: workflowFilter, limit: 200 }); setItems(result.items); setTotal(result.total); }
    catch (err) { setError(err instanceof Error ? err.message : String(err)); } finally { setBusy(null); }
  }

  async function create() {
    if (!draft.title.trim()) return setError("Judul ide wajib diisi.");
    setBusy("Menyimpan ide…");
    try { await contentApi.createItem({ title: draft.title, hook: draft.hook, workflow: draft.workflow, channel: draft.channel, format: draft.workflow === "carousel" ? "Carousel" : "Short Video", scheduledDate: draft.scheduledDate || undefined, status: "draft" }); setDraft({ title: "", hook: "", workflow: "carousel", channel: "Instagram", scheduledDate: "" }); setShowCreate(false); await reload(); }
    catch (err) { setError(err instanceof Error ? err.message : String(err)); setBusy(null); }
  }

  async function updateStatus(item: ContentItem, next: ContentStatus) {
    setBusy(`Mengubah status ${item.title}…`); setError(null);
    try { const updated = await contentApi.updateItem(item.id, { status: next }); setItems((current) => current.map((value) => value.id === item.id ? updated : value)); }
    catch (err) { setError(err instanceof Error ? err.message : String(err)); } finally { setBusy(null); }
  }

  async function handoff(item: ContentItem) {
    setBusy(`Mengirim ${item.title} ke Studio…`); setError(null);
    try { window.location.assign((await contentApi.handoffItem(item.id, item.workflow)).targetUrl); }
    catch (err) { setError(err instanceof Error ? err.message : String(err)); setBusy(null); }
  }

  async function duplicate(item: ContentItem) { setBusy("Menduplikasi konten…"); try { await contentApi.duplicateItem(item.id); await reload(); } catch (err) { setError(err instanceof Error ? err.message : String(err)); setBusy(null); } }
  async function remove(item: ContentItem) { if (!window.confirm(`Hapus “${item.title}”?`)) return; setBusy("Menghapus konten…"); try { await contentApi.deleteItem(item.id); await reload(); } catch (err) { setError(err instanceof Error ? err.message : String(err)); setBusy(null); } }

  if (loading || !user) return <main className="mx-auto max-w-7xl px-4"><Header /><p className="py-12 text-center text-sm text-slate-400">Memuat…</p></main>;

  return <main className="mx-auto max-w-7xl px-4 pb-24">
    <Header />
    <div className="mb-7 flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-accent">Content Engine · Langkah 3</p><h1 className="mt-1 text-3xl font-extrabold">Content Library</h1><p className="mt-2 max-w-2xl text-sm text-slate-400">Approval queue dari ide sampai published. Hanya konten approved yang dapat dikirim ke workflow Studio.</p></div><div className="flex gap-2"><Link href="/planner" className="rounded-xl border border-white/15 px-4 py-2 text-sm">← Planner</Link><button onClick={() => setShowCreate((value) => !value)} className="rounded-xl bg-brand px-4 py-2 text-sm font-bold">+ Ide manual</button></div></div>
    {busy ? <div className="mb-4 rounded-xl border border-brand/40 bg-brand/10 p-3 text-sm">⏳ {busy}</div> : null}{error ? <div className="mb-4 rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-200">{error}</div> : null}
    {showCreate ? <section className="mb-5 rounded-2xl border border-brand/30 bg-brand/5 p-5"><h2 className="mb-3 font-bold">Tambah ide konten</h2><div className="grid gap-3 md:grid-cols-2"><input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} placeholder="Judul ide" className="input" /><input value={draft.hook} onChange={(e) => setDraft({ ...draft, hook: e.target.value })} placeholder="Hook" className="input" /><select value={draft.workflow} onChange={(e) => setDraft({ ...draft, workflow: e.target.value as StudioWorkflow })} className="input">{WORKFLOWS.map((value) => <option key={value}>{value}</option>)}</select><div className="grid grid-cols-2 gap-2"><input value={draft.channel} onChange={(e) => setDraft({ ...draft, channel: e.target.value })} placeholder="Channel" className="input" /><input type="date" value={draft.scheduledDate} onChange={(e) => setDraft({ ...draft, scheduledDate: e.target.value })} className="input" /></div></div><button onClick={() => void create()} className="mt-3 rounded-xl bg-brand px-5 py-2 text-sm font-bold">Simpan draft</button></section> : null}
    <section className="mb-5 flex flex-wrap items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.03] p-4"><span className="mr-1 text-xs text-slate-400">Status</span>{STATUSES.map((value) => <button key={value.id || "all"} onClick={() => setStatusFilter(value.id)} className={`rounded-lg px-3 py-1 text-xs ${statusFilter === value.id ? "bg-brand text-white" : "border border-white/10"}`}>{value.label}</button>)}<select value={workflowFilter} onChange={(e) => setWorkflowFilter(e.target.value)} className="ml-auto rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-xs"><option value="">Semua workflow</option>{WORKFLOWS.map((value) => <option key={value}>{value}</option>)}</select><span className="text-xs text-slate-500">{total} konten</span></section>
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{items.map((item) => <article key={item.id} className="flex flex-col rounded-2xl border border-white/10 bg-white/[0.03] p-5"><div className="flex items-start justify-between gap-3"><div className="text-xs text-slate-400">{item.scheduledDate || "Tanpa tanggal"} · {item.channel}</div><span className="rounded-full border border-white/10 px-2 py-1 text-[10px] uppercase">{item.workflow}</span></div><h2 className="mt-2 font-bold">{item.title}</h2><p className="mt-2 line-clamp-3 text-sm text-slate-300">{item.hook || item.brief || "Belum ada hook/brief."}</p><div className="mt-auto pt-5"><select value={item.status} onChange={(e) => void updateStatus(item, e.target.value as ContentStatus)} className="w-full rounded-xl border border-white/10 bg-slate-950 p-2 text-xs">{STATUSES.filter((value) => value.id).map((value) => <option key={value.id} value={value.id}>{value.label}</option>)}</select><div className="mt-3 flex flex-wrap gap-2">{item.status === "approved" ? <button onClick={() => void handoff(item)} className="rounded-lg bg-brand px-3 py-2 text-xs font-bold">Kirim ke Studio →</button> : <span className="rounded-lg bg-black/20 px-3 py-2 text-[10px] text-slate-500">Approve dulu untuk handoff</span>}<button onClick={() => void duplicate(item)} className="rounded-lg border border-white/10 px-3 py-2 text-xs">Duplikat</button><button onClick={() => void remove(item)} className="rounded-lg border border-red-500/30 px-3 py-2 text-xs text-red-300">Hapus</button></div></div></article>)}</div>
    {!busy && items.length === 0 ? <div className="rounded-2xl border border-dashed border-white/15 p-12 text-center text-sm text-slate-400">Belum ada konten pada filter ini.</div> : null}
  </main>;
}
