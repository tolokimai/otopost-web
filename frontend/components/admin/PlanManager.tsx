"use client";

import { useState } from "react";
import { api, type AdminPlan } from "@/lib/api";

export default function PlanManager({ plans, setPlans }: { plans: AdminPlan[]; setPlans: (rows: AdminPlan[]) => void }) {
  const [draft, setDraft] = useState({ id: "", name: "", price: 0, credits: 0, durationDays: 30 });
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");

  function patch(id: string, values: Partial<AdminPlan>) {
    setPlans(plans.map((row) => (row.id === id ? { ...row, ...values } : row)));
  }

  async function save(row: AdminPlan) {
    setBusy(row.id); setError("");
    try {
      const updated = await api.adminUpdatePlan(row.id, {
        name: row.name, price: Number(row.price), credits: Number(row.credits),
        durationDays: Number(row.durationDays || 30), features: row.features,
        purchasable: row.purchasable, highlight: row.highlight,
        isActive: row.isActive, sortOrder: Number(row.sortOrder),
      });
      setPlans(plans.map((item) => (item.id === row.id ? updated : item)));
    } catch (err) { setError(err instanceof Error ? err.message : String(err)); }
    finally { setBusy(""); }
  }

  async function create() {
    if (!draft.id || !draft.name) return;
    setBusy("new"); setError("");
    try {
      const created = await api.adminCreatePlan({ ...draft, features: [], purchasable: true, highlight: false, isActive: true, sortOrder: plans.length * 10 + 10 });
      setPlans([...plans, created]);
      setDraft({ id: "", name: "", price: 0, credits: 0, durationDays: 30 });
    } catch (err) { setError(err instanceof Error ? err.message : String(err)); }
    finally { setBusy(""); }
  }

  async function remove(id: string) {
    if (!window.confirm(`Hapus paket ${id}?`)) return;
    setBusy(id); setError("");
    try { await api.adminDeletePlan(id); setPlans(plans.filter((item) => item.id !== id)); }
    catch (err) { setError(err instanceof Error ? err.message : String(err)); }
    finally { setBusy(""); }
  }

  return <div className="space-y-4">
    {error ? <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-200">{error}</div> : null}
    <div className="overflow-x-auto rounded-2xl border border-white/10">
      <table className="min-w-[1050px] w-full text-left text-xs">
        <thead className="bg-white/5 text-slate-400"><tr>{["ID/Nama", "Harga", "Kredit", "Hari", "Fitur (satu/baris)", "Beli", "Sorot", "Aktif", "Urutan", "Aksi"].map((h) => <th key={h} className="p-3">{h}</th>)}</tr></thead>
        <tbody>{plans.map((row) => <tr key={row.id} className="border-t border-white/5 align-top">
          <td className="p-2"><div className="mb-1 text-[10px] text-slate-500">{row.id}</div><input value={row.name} onChange={(e) => patch(row.id, { name: e.target.value })} className="w-28 rounded bg-black/30 p-2" /></td>
          <td className="p-2"><input type="number" value={row.price} onChange={(e) => patch(row.id, { price: Number(e.target.value) })} className="w-24 rounded bg-black/30 p-2" /></td>
          <td className="p-2"><input type="number" value={row.credits} onChange={(e) => patch(row.id, { credits: Number(e.target.value) })} className="w-20 rounded bg-black/30 p-2" /></td>
          <td className="p-2"><input type="number" value={row.durationDays || 30} onChange={(e) => patch(row.id, { durationDays: Number(e.target.value) })} className="w-16 rounded bg-black/30 p-2" /></td>
          <td className="p-2"><textarea value={row.features.join("\n")} onChange={(e) => patch(row.id, { features: e.target.value.split("\n").filter(Boolean) })} rows={4} className="w-52 rounded bg-black/30 p-2" /></td>
          <td className="p-3"><input type="checkbox" checked={row.purchasable} onChange={(e) => patch(row.id, { purchasable: e.target.checked })} /></td>
          <td className="p-3"><input type="checkbox" checked={row.highlight} onChange={(e) => patch(row.id, { highlight: e.target.checked })} /></td>
          <td className="p-3"><input type="checkbox" checked={row.isActive} onChange={(e) => patch(row.id, { isActive: e.target.checked })} /></td>
          <td className="p-2"><input type="number" value={row.sortOrder} onChange={(e) => patch(row.id, { sortOrder: Number(e.target.value) })} className="w-16 rounded bg-black/30 p-2" /></td>
          <td className="space-y-2 p-2"><button onClick={() => void save(row)} disabled={busy === row.id} className="block rounded bg-brand px-3 py-2 font-semibold">Simpan</button><button onClick={() => void remove(row.id)} className="text-red-300">Hapus</button></td>
        </tr>)}</tbody>
      </table>
    </div>
    <div className="grid gap-2 rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:grid-cols-6">
      <input placeholder="id-paket" value={draft.id} onChange={(e) => setDraft({ ...draft, id: e.target.value })} className="rounded bg-black/30 p-2 text-sm" />
      <input placeholder="Nama" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} className="rounded bg-black/30 p-2 text-sm" />
      <input type="number" placeholder="Harga" value={draft.price} onChange={(e) => setDraft({ ...draft, price: Number(e.target.value) })} className="rounded bg-black/30 p-2 text-sm" />
      <input type="number" placeholder="Kredit" value={draft.credits} onChange={(e) => setDraft({ ...draft, credits: Number(e.target.value) })} className="rounded bg-black/30 p-2 text-sm" />
      <input type="number" placeholder="Hari" value={draft.durationDays} onChange={(e) => setDraft({ ...draft, durationDays: Number(e.target.value) })} className="rounded bg-black/30 p-2 text-sm" />
      <button onClick={() => void create()} disabled={busy === "new"} className="rounded bg-brand px-3 py-2 text-sm font-semibold">+ Paket</button>
    </div>
  </div>;
}
