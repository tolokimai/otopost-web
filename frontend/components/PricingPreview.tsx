"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api, type Plan } from "@/lib/api";

function rupiah(value: number) { return value ? "Rp" + value.toLocaleString("id-ID") : "Rp0"; }

export default function PricingPreview() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [error, setError] = useState(false);
  useEffect(() => { api.getPlans().then((data) => setPlans(data.plans)).catch(() => setError(true)); }, []);
  if (error) return <div className="text-center text-sm text-slate-400">Harga sedang tidak dapat dimuat. <Link href="/pricing" className="text-brand-accent">Coba lagi →</Link></div>;
  if (!plans.length) return <div className="text-center text-sm text-slate-500">Memuat paket terbaru…</div>;
  return <div className="grid gap-4 sm:grid-cols-3">{plans.map((plan) => <div key={plan.id} className={`rounded-2xl border p-6 ${plan.highlight ? "border-brand bg-brand/10" : "border-white/10 bg-white/[0.03]"}`}><div className="text-sm text-slate-400">{plan.name}</div><div className="mt-1 text-3xl font-extrabold">{rupiah(plan.price)}<span className="text-sm font-normal text-slate-500">/{plan.durationDays || 30} hari</span></div><ul className="mt-4 min-h-28 space-y-2 text-sm text-slate-300">{plan.features.map((item) => <li key={item}>✓ {item}</li>)}</ul><Link href="/pricing" className={`mt-6 block rounded-xl px-4 py-2 text-center text-sm font-semibold ${plan.highlight ? "bg-brand" : "border border-white/15"}`}>Pilih {plan.name}</Link></div>)}</div>;
}
