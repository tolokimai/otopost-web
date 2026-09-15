"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";

import Header from "@/components/Header";
import { useAuth } from "@/lib/auth";
import { contentApi, type Persona, type PersonaDraft } from "@/lib/content-api";

const EMPTY: PersonaDraft = { name: "", brandName: "", niche: "", audience: "", painPoints: [], aspirations: [], tone: "Profesional, hangat, dan jelas", language: "Bahasa Indonesia", offers: [], channels: ["Instagram", "TikTok"], differentiators: "", brandStory: "", contentPillars: [], isDefault: false };
const toList = (value: string) => value.split(/[\n,]/).map((item) => item.trim()).filter(Boolean);

export default function PersonasPage() {
  const { user, loading, refresh: refreshAuth } = useAuth();
  const router = useRouter();
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<PersonaDraft>({ ...EMPTY });
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { if (!loading && !user) router.replace("/login?next=/personas"); }, [loading, user, router]);
  useEffect(() => { if (user) void reload(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [user]);

  async function reload() {
    try { setPersonas((await contentApi.listPersonas()).personas); } catch (err) { setError(err instanceof Error ? err.message : String(err)); }
  }

  function choose(p: Persona) {
    setEditingId(p.id);
    setForm({ name: p.name, brandName: p.brandName, niche: p.niche, audience: p.audience, painPoints: p.painPoints, aspirations: p.aspirations, tone: p.tone, language: p.language, offers: p.offers, channels: p.channels, differentiators: p.differentiators, brandStory: p.brandStory, contentPillars: p.contentPillars, isDefault: p.isDefault });
    setError(null);
  }

  function reset() { setEditingId(null); setForm({ ...EMPTY, channels: ["Instagram", "TikTok"] }); }

  async function generate() {
    if (!form.brandName.trim() || !form.niche.trim()) return setError("Isi nama brand dan niche terlebih dahulu.");
    setBusy("AI sedang menyusun persona…"); setError(null);
    try {
      const result = await contentApi.generatePersona({ brandName: form.brandName, niche: form.niche, offer: form.offers[0] || "", audienceHint: form.audience, channels: form.channels.length ? form.channels : ["Instagram"], language: form.language });
      setForm({ ...result.persona, name: result.persona.name || form.brandName });
      await refreshAuth();
    } catch (err) { setError(err instanceof Error ? err.message : String(err)); } finally { setBusy(null); }
  }

  async function save() {
    if (!form.name.trim()) return setError("Nama persona wajib diisi.");
    setBusy("Menyimpan persona…"); setError(null);
    try { if (editingId) await contentApi.updatePersona(editingId, form); else await contentApi.createPersona(form); await reload(); reset(); }
    catch (err) { setError(err instanceof Error ? err.message : String(err)); } finally { setBusy(null); }
  }

  async function remove(id: string) {
    if (!window.confirm("Hapus persona ini? Plan dan konten lama tetap disimpan tanpa persona.")) return;
    setBusy("Menghapus persona…");
    try { await contentApi.deletePersona(id); if (editingId === id) reset(); await reload(); }
    catch (err) { setError(err instanceof Error ? err.message : String(err)); } finally { setBusy(null); }
  }

  if (loading || !user) return <main className="mx-auto max-w-6xl px-4"><Header /><p className="py-12 text-center text-sm text-slate-400">Memuat…</p></main>;

  return <main className="mx-auto max-w-6xl px-4 pb-24">
    <Header />
    <div className="mb-7 flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-accent">Content Engine · Langkah 1</p><h1 className="mt-1 text-3xl font-extrabold">Brand Persona</h1><p className="mt-2 max-w-2xl text-sm text-slate-400">Sumber kebenaran untuk audiens, offer, tone, dan pilar konten. Generator memakai 1 kredit setelah hasil AI valid.</p></div><Link href="/planner" className="rounded-xl bg-brand px-4 py-2 text-sm font-bold">Lanjut ke Planner →</Link></div>
    {busy ? <Notice>{`⏳ ${busy}`}</Notice> : null}{error ? <Notice error>{error}</Notice> : null}
    <div className="grid gap-5 lg:grid-cols-[300px_1fr]">
      <aside className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"><div className="mb-3 flex items-center justify-between"><h2 className="font-bold">Persona tersimpan</h2><button onClick={reset} className="rounded-lg border border-white/15 px-2 py-1 text-xs">+ Baru</button></div><div className="space-y-2">{personas.length === 0 ? <p className="rounded-xl border border-dashed border-white/15 p-4 text-xs text-slate-400">Belum ada persona.</p> : null}{personas.map((p) => <button key={p.id} onClick={() => choose(p)} className={`w-full rounded-xl border p-3 text-left ${editingId === p.id ? "border-brand bg-brand/10" : "border-white/10 bg-black/20"}`}><div className="flex justify-between gap-2"><span className="font-semibold">{p.name}</span>{p.isDefault ? <span className="text-[10px] text-amber-300">DEFAULT</span> : null}</div><p className="mt-1 line-clamp-2 text-xs text-slate-400">{p.brandName} · {p.niche}</p></button>)}</div></aside>
      <section className="space-y-5 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
        <div className="grid gap-3 sm:grid-cols-2"><Field label="Nama persona"><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Persona utama" className="input" /></Field><Field label="Nama brand"><input value={form.brandName} onChange={(e) => setForm({ ...form, brandName: e.target.value })} placeholder="OtoPost" className="input" /></Field><Field label="Niche"><input value={form.niche} onChange={(e) => setForm({ ...form, niche: e.target.value })} placeholder="Creator economy" className="input" /></Field><Field label="Bahasa"><input value={form.language} onChange={(e) => setForm({ ...form, language: e.target.value })} className="input" /></Field></div>
        <Field label="Target audiens"><textarea value={form.audience} onChange={(e) => setForm({ ...form, audience: e.target.value })} rows={3} placeholder="Profil, tahap bisnis, kebiasaan, konteks pembelian…" className="input" /></Field>
        <div className="grid gap-3 sm:grid-cols-2"><ListField label="Pain points" value={form.painPoints} onChange={(v) => setForm({ ...form, painPoints: v })} /><ListField label="Aspirasi" value={form.aspirations} onChange={(v) => setForm({ ...form, aspirations: v })} /><ListField label="Offer / produk" value={form.offers} onChange={(v) => setForm({ ...form, offers: v })} /><ListField label="Channel" value={form.channels} onChange={(v) => setForm({ ...form, channels: v })} /><ListField label="Pilar konten" value={form.contentPillars} onChange={(v) => setForm({ ...form, contentPillars: v })} /><Field label="Tone of voice"><textarea value={form.tone} onChange={(e) => setForm({ ...form, tone: e.target.value })} rows={4} className="input" /></Field></div>
        <Field label="Pembeda utama"><textarea value={form.differentiators} onChange={(e) => setForm({ ...form, differentiators: e.target.value })} rows={3} className="input" /></Field><Field label="Brand story"><textarea value={form.brandStory} onChange={(e) => setForm({ ...form, brandStory: e.target.value })} rows={4} className="input" /></Field>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.isDefault} onChange={(e) => setForm({ ...form, isDefault: e.target.checked })} /> Jadikan persona default</label>
        <div className="flex flex-wrap gap-2"><button onClick={() => void generate()} disabled={!!busy} className="rounded-xl border border-brand px-4 py-2 text-sm font-bold text-brand-accent disabled:opacity-40">✨ Generate dengan AI</button><button onClick={() => void save()} disabled={!!busy} className="rounded-xl bg-brand px-5 py-2 text-sm font-bold disabled:opacity-40">{editingId ? "Simpan perubahan" : "Simpan persona"}</button>{editingId ? <button onClick={() => void remove(editingId)} disabled={!!busy} className="rounded-xl border border-red-500/40 px-4 py-2 text-sm text-red-300">Hapus</button> : null}</div>
      </section>
    </div>
  </main>;
}

function Field({ label, children }: { label: string; children: ReactNode }) { return <label className="block text-xs text-slate-400"><span className="mb-1 block">{label}</span>{children}</label>; }
function ListField({ label, value, onChange }: { label: string; value: string[]; onChange: (value: string[]) => void }) { return <Field label={`${label} · satu per baris`}><textarea value={value.join("\n")} onChange={(e) => onChange(toList(e.target.value))} rows={4} className="input" /></Field>; }
function Notice({ children, error = false }: { children: ReactNode; error?: boolean }) { return <div className={`mb-4 rounded-xl border p-3 text-sm ${error ? "border-red-500/40 bg-red-500/10 text-red-200" : "border-brand/40 bg-brand/10"}`}>{children}</div>; }
