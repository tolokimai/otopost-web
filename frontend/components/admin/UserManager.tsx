"use client";

import { useState } from "react";
import { api, type AdminPlan, type AdminUser } from "@/lib/api";

export default function UserManager({ users, setUsers, plans }: { users: AdminUser[]; setUsers: (rows: AdminUser[]) => void; plans: AdminPlan[] }) {
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  function patch(id: string, values: Partial<AdminUser>) { setUsers(users.map((row) => (row.id === id ? { ...row, ...values } : row))); }
  async function search() { setBusy("search"); try { setUsers((await api.adminUsers(q)).users); } catch (err) { setError(err instanceof Error ? err.message : String(err)); } finally { setBusy(""); } }
  async function save(row: AdminUser) {
    setBusy(row.id); setError("");
    try {
      const updated = await api.adminUpdateUser(row.id, { name: row.name, plan: row.plan, credits: Number(row.credits), isActive: row.isActive, isAdmin: row.isAdmin });
      setUsers(users.map((item) => (item.id === row.id ? updated : item)));
    } catch (err) { setError(err instanceof Error ? err.message : String(err)); }
    finally { setBusy(""); }
  }
  return <div className="space-y-4">
    <div className="flex gap-2"><input value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") void search(); }} placeholder="Cari email atau nama…" className="flex-1 rounded-xl border border-white/10 bg-black/30 p-3 text-sm" /><button onClick={() => void search()} disabled={busy === "search"} className="rounded-xl bg-brand px-5 text-sm font-semibold">Cari</button></div>
    {error ? <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-200">{error}</div> : null}
    <div className="overflow-x-auto rounded-2xl border border-white/10"><table className="min-w-[900px] w-full text-left text-xs"><thead className="bg-white/5 text-slate-400"><tr>{["User", "Nama", "Paket", "Kredit", "Aktif", "Admin", "Terdaftar", "Aksi"].map((h) => <th key={h} className="p-3">{h}</th>)}</tr></thead><tbody>{users.map((row) => <tr key={row.id} className="border-t border-white/5"><td className="p-3"><div className="font-semibold">{row.email}</div><div className="text-[10px] text-slate-600">{row.id}</div></td><td className="p-2"><input value={row.name} onChange={(e) => patch(row.id, { name: e.target.value })} className="w-32 rounded bg-black/30 p-2" /></td><td className="p-2"><select value={row.plan} onChange={(e) => patch(row.id, { plan: e.target.value })} className="rounded bg-slate-950 p-2">{plans.filter((p) => p.isActive).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></td><td className="p-2"><input type="number" value={row.credits} onChange={(e) => patch(row.id, { credits: Number(e.target.value) })} className="w-20 rounded bg-black/30 p-2" /></td><td className="p-3"><input type="checkbox" checked={row.isActive} onChange={(e) => patch(row.id, { isActive: e.target.checked })} /></td><td className="p-3"><input type="checkbox" checked={row.isAdmin} onChange={(e) => patch(row.id, { isAdmin: e.target.checked })} /></td><td className="p-3 text-slate-500">{row.createdAt ? new Date(row.createdAt).toLocaleDateString("id-ID") : "—"}</td><td className="p-2"><button onClick={() => void save(row)} disabled={busy === row.id} className="rounded bg-brand px-3 py-2 font-semibold">Simpan</button></td></tr>)}</tbody></table></div>
  </div>;
}
