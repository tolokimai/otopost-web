"use client";

import { useState } from "react";
import { api, type AdminPlan, type StudioMenu } from "@/lib/api";

export default function MenuManager({ menus, setMenus, plans }: { menus: StudioMenu[]; setMenus: (rows: StudioMenu[]) => void; plans: AdminPlan[] }) {
  const [draft, setDraft] = useState({ id: "", label: "", icon: "✨", href: "/studio/", requiredPlan: "free" });
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  function patch(id: string, values: Partial<StudioMenu>) { setMenus(menus.map((row) => (row.id === id ? { ...row, ...values } : row))); }
  async function save(row: StudioMenu) {
    setBusy(row.id); setError("");
    try { const updated = await api.adminUpdateMenu(row.id, { label: row.label, description: row.description, icon: row.icon, href: row.href, isEnabled: row.isEnabled, isReady: row.isReady, requiredPlan: row.requiredPlan, sortOrder: Number(row.sortOrder) }); setMenus(menus.map((item) => item.id === row.id ? updated : item)); }
    catch (err) { setError(err instanceof Error ? err.message : String(err)); } finally { setBusy(""); }
  }
  async function create() {
    setBusy("new"); setError("");
    try { const created = await api.adminCreateMenu({ ...draft, description: "", isEnabled: true, isReady: false, sortOrder: menus.length * 10 + 10 }); setMenus([...menus, created]); setDraft({ id: "", label: "", icon: "✨", href: "/studio/", requiredPlan: "free" }); }
    catch (err) { setError(err instanceof Error ? err.message : String(err)); } finally { setBusy(""); }
  }
  async function remove(id: string) { if (!confirm(`Hapus menu ${id}?`)) return; try { await api.adminDeleteMenu(id); setMenus(menus.filter((m) => m.id !== id)); } catch (err) { setError(err instanceof Error ? err.message : String(err)); } }
  return <div className="space-y-4">
    {error ? <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-200">{error}</div> : null}
    <div className="grid gap-3">{menus.map((row) => <div key={row.id} className="grid gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4 lg:grid-cols-[50px_1fr_1.4fr_130px_80px_80px_75px_auto] lg:items-center">
      <input value={row.icon} onChange={(e) => patch(row.id, { icon: e.target.value })} className="rounded bg-black/30 p-2 text-center" /><div><div className="text-[10px] text-slate-500">{row.id}</div><input value={row.label} onChange={(e) => patch(row.id, { label: e.target.value })} className="w-full rounded bg-black/30 p-2 text-sm font-semibold" /></div><div><input value={row.href} onChange={(e) => patch(row.id, { href: e.target.value })} className="mb-1 w-full rounded bg-black/30 p-2 text-xs" /><input value={row.description} onChange={(e) => patch(row.id, { description: e.target.value })} className="w-full rounded bg-black/30 p-2 text-xs" /></div><select value={row.requiredPlan} onChange={(e) => patch(row.id, { requiredPlan: e.target.value })} className="rounded bg-slate-950 p-2 text-xs">{plans.filter((p) => p.isActive).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select><label className="text-xs"><input type="checkbox" checked={row.isEnabled} onChange={(e) => patch(row.id, { isEnabled: e.target.checked })} /> Tampil</label><label className="text-xs"><input type="checkbox" checked={row.isReady} onChange={(e) => patch(row.id, { isReady: e.target.checked })} /> Siap</label><input type="number" value={row.sortOrder} onChange={(e) => patch(row.id, { sortOrder: Number(e.target.value) })} className="rounded bg-black/30 p-2 text-xs" /><div className="flex gap-2"><button onClick={() => void save(row)} disabled={busy === row.id} className="rounded bg-brand px-3 py-2 text-xs font-semibold">Simpan</button><button onClick={() => void remove(row.id)} className="text-xs text-red-300">×</button></div>
    </div>)}</div>
    <div className="grid gap-2 rounded-2xl border border-white/10 p-4 sm:grid-cols-6"><input placeholder="id-menu" value={draft.id} onChange={(e) => setDraft({ ...draft, id: e.target.value })} className="rounded bg-black/30 p-2 text-sm" /><input placeholder="Label" value={draft.label} onChange={(e) => setDraft({ ...draft, label: e.target.value })} className="rounded bg-black/30 p-2 text-sm" /><input placeholder="Icon" value={draft.icon} onChange={(e) => setDraft({ ...draft, icon: e.target.value })} className="rounded bg-black/30 p-2 text-sm" /><input placeholder="/studio/path" value={draft.href} onChange={(e) => setDraft({ ...draft, href: e.target.value })} className="rounded bg-black/30 p-2 text-sm" /><select value={draft.requiredPlan} onChange={(e) => setDraft({ ...draft, requiredPlan: e.target.value })} className="rounded bg-slate-950 p-2 text-sm">{plans.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select><button onClick={() => void create()} className="rounded bg-brand p-2 text-sm font-semibold">+ Menu</button></div>
  </div>;
}
