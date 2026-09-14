"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import Header from "@/components/Header";
import { api, type Plan } from "@/lib/api";
import { useAuth } from "@/lib/auth";

function rupiah(n: number): string {
  if (!n) return "Rp0";
  return "Rp" + n.toLocaleString("id-ID");
}

export default function PricingPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [provider, setProvider] = useState<string>("simulate");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .getPlans()
      .then((r) => {
        if (r.plans && r.plans.length) setPlans(r.plans);
        setProvider(r.provider || "simulate");
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Gagal memuat paket"));
  }, []);

  const buy = useCallback(
    async (planId: string) => {
      setError(null);
      if (!user) {
        router.push("/login?next=/pricing");
        return;
      }
      setBusy(planId);
      try {
        const res = await api.checkout({ plan: planId });
        window.location.href = res.redirectUrl;
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
        setBusy(null);
      }
    },
    [user, router],
  );

  return (
    <main className="mx-auto max-w-5xl px-4 pb-24">
      <Header />
      <section className="py-10 text-center">
        <h1 className="text-3xl font-extrabold sm:text-4xl">Pilih paket langganan</h1>
        <p className="mx-auto mt-3 max-w-xl text-slate-400">
          Bayar pakai QRIS, e-wallet, atau transfer bank. Upgrade kapan saja, berlaku 30 hari.
        </p>
      </section>

      {error ? (
        <div className="mx-auto mb-6 max-w-xl rounded-xl border border-red-500/40 bg-red-500/10 px-3 py-2 text-center text-sm text-red-200">
          {error}
        </div>
      ) : null}

      {plans.length === 0 && !error ? (
        <p className="py-10 text-center text-sm text-slate-500">Memuat paket terbaru…</p>
      ) : null}

      <section className="grid gap-4 sm:grid-cols-3">
        {plans.map((p) => (
          <div
            key={p.id}
            className={`flex flex-col rounded-2xl border p-6 ${
              p.highlight ? "border-brand bg-brand/10" : "border-white/10 bg-white/[0.03]"
            }`}
          >
            <div className="text-sm text-slate-400">{p.name}</div>
            <div className="mt-1 text-3xl font-extrabold">
              {rupiah(p.price)}
              <span className="text-sm font-normal text-slate-500">/{p.durationDays || 30} hari</span>
            </div>
            <ul className="mt-4 flex-1 space-y-2 text-sm text-slate-300">
              {p.features.map((it) => (
                <li key={it}>✓ {it}</li>
              ))}
            </ul>
            {p.purchasable ? (
              <button
                onClick={() => void buy(p.id)}
                disabled={busy === p.id}
                className={`mt-6 rounded-xl px-4 py-2 text-center text-sm font-semibold disabled:opacity-50 ${
                  p.highlight ? "bg-brand text-white" : "border border-white/15"
                }`}
              >
                {busy === p.id ? "Memproses…" : `Langganan ${p.name}`}
              </button>
            ) : (
              <div className="mt-6 rounded-xl border border-white/10 px-4 py-2 text-center text-sm text-slate-400">
                Paket dasar
              </div>
            )}
          </div>
        ))}
      </section>

      <p className="mt-6 text-center text-xs text-slate-500">
        {provider === "simulate"
          ? "Mode simulasi aktif — pembayaran dikonfirmasi otomatis untuk pengujian."
          : "Pembayaran diproses aman lewat Midtrans."}
      </p>
    </main>
  );
}
