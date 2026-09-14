"use client";

import { useEffect, useState } from "react";
import { api, type AdminSetting } from "@/lib/api";

export default function SettingManager({ settings, setSettings }: { settings: AdminSetting[]; setSettings: (rows: AdminSetting[]) => void }) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  useEffect(() => { setValues(Object.fromEntries(settings.map((row) => [row.key, row.value]))); }, [settings]);

  async function save(row: AdminSetting, clear = false) {
    setBusy(row.key); setError("");
    try {
      const updated = await api.adminUpdateSetting(row.key, { value: values[row.key] || "", clear });
      setSettings(settings.map((item) => (item.key === row.key ? updated : item)));
      setValues((current) => ({ ...current, [row.key]: updated.value }));
    } catch (err) { setError(err instanceof Error ? err.message : String(err)); }
    finally { setBusy(""); }
  }

  const categories = Array.from(new Set(settings.map((row) => row.category)));
  return <div className="space-y-5">
    {error ? <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-200">{error}</div> : null}
    {categories.map((category) => <section key={category} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <h3 className="mb-3 text-sm font-bold uppercase text-brand-accent">{category}</h3>
      <div className="divide-y divide-white/5">{settings.filter((row) => row.category === category).map((row) => <div key={row.key} className="grid gap-3 py-3 sm:grid-cols-[1fr_280px_auto] sm:items-center">
        <div><div className="text-sm font-semibold">{row.label}</div><div className="text-xs text-slate-500">{row.description} · <code>{row.key}</code></div></div>
        {row.valueType === "bool" ? <select value={values[row.key] || "false"} onChange={(e) => setValues({ ...values, [row.key]: e.target.value })} className="rounded-lg bg-slate-950 p-2 text-sm"><option value="true">Aktif</option><option value="false">Nonaktif</option></select> : <input type={row.isSecret ? "password" : row.valueType === "int" ? "number" : "text"} value={values[row.key] || ""} onChange={(e) => setValues({ ...values, [row.key]: e.target.value })} placeholder={row.isSecret && row.hasValue ? "•••••• tersimpan" : ""} className="rounded-lg border border-white/10 bg-black/30 p-2 text-sm" />}
        <div className="flex gap-2"><button onClick={() => void save(row)} disabled={busy === row.key} className="rounded-lg bg-brand px-3 py-2 text-xs font-semibold">Simpan</button>{row.isSecret && row.hasValue ? <button onClick={() => void save(row, true)} className="text-xs text-red-300">Hapus</button> : null}</div>
      </div>)}</div>
    </section>)}
  </div>;
}
