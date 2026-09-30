"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import Header from "@/components/Header";
import { Toast } from "@/components/ui/Toast";
import { api, type Plan } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useTranslation } from "@/lib/i18n";

function formatCurrency(n: number, locale: string): string {
  if (!n) return locale === "id" ? "Rp0" : "$0";
  if (locale === "id") {
    return "Rp" + n.toLocaleString("id-ID");
  }
  return "Rp" + n.toLocaleString("en-US");
}

export default function PricingPage() {
  const { user } = useAuth();
  const router = useRouter();
  const { t, locale } = useTranslation();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [provider, setProvider] = useState<string>("simulate");
  const [busy, setBusy] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api
      .getPlans()
      .then((r) => {
        if (r.plans && r.plans.length) setPlans(r.plans);
        setProvider(r.provider || "simulate");
      })
      .catch((err) => {
        Toast.error(err instanceof Error ? err.message : t("common.error"));
      })
      .finally(() => {
        setLoading(false);
      });
  }, [t]);

  const buy = useCallback(
    async (planId: string) => {
      if (!user) {
        router.push("/login?next=/pricing");
        return;
      }
      setBusy(planId);
      try {
        const res = await api.checkout({ plan: planId });
        window.location.href = res.redirectUrl;
      } catch (err) {
        Toast.error(err instanceof Error ? err.message : String(err));
        setBusy(null);
      }
    },
    [user, router],
  );

  return (
    <main className="mx-auto max-w-5xl px-4 pb-24 text-token">
      <Header />
      <section className="py-12 text-center">
        <h1 className="text-3xl font-extrabold sm:text-4xl tracking-tight">
          {t("billing.choose_plan")}
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-muted text-sm sm:text-base">
          {t("billing.pricing_subtitle")}
        </p>
      </section>

      {loading && (
        <div className="py-16 text-center text-sm text-muted">
          <div className="mx-auto mb-3 h-6 w-6 animate-spin rounded-full border-2 border-brand border-t-transparent" />
          <p>{t("common.loading")}</p>
        </div>
      )}

      {!loading && plans.length > 0 && (
        <section className="grid gap-6 sm:grid-cols-3">
          {plans.map((p) => {
            const isHighlighted = Boolean(p.highlight);
            return (
              <div
                key={p.id}
                className={`relative flex flex-col rounded-2xl border p-6 transition-all ${
                  isHighlighted
                    ? "border-brand bg-brand/10 shadow-lg ring-1 ring-brand"
                    : "border-token bg-surface hover:border-brand/40 shadow-sm"
                }`}
              >
                {isHighlighted && (
                  <span className="absolute -top-3 right-6 rounded-full bg-brand px-3 py-0.5 text-xs font-bold text-white shadow-sm">
                    {t("billing.popular_badge")}
                  </span>
                )}

                <div className="text-sm font-semibold text-muted">{p.name}</div>
                <div className="mt-2 text-3xl font-extrabold tracking-tight">
                  {formatCurrency(p.price, locale)}
                  <span className="text-xs font-normal text-muted ml-1">
                    {t("billing.per_days", { days: p.durationDays || 30 })}
                  </span>
                </div>

                <ul className="mt-6 flex-1 space-y-2.5 text-sm text-token">
                  {p.features.map((it) => (
                    <li key={it} className="flex items-center gap-2">
                      <span className="text-brand font-bold">✓</span>
                      <span>{it}</span>
                    </li>
                  ))}
                </ul>

                {p.purchasable ? (
                  <button
                    type="button"
                    onClick={() => void buy(p.id)}
                    disabled={busy === p.id}
                    className={`mt-8 w-full rounded-xl py-3 text-center text-sm font-bold transition-all disabled:opacity-50 ${
                      isHighlighted
                        ? "bg-gradient-to-r from-brand to-brand-accent text-white shadow-md hover:brightness-110"
                        : "border border-token bg-surface-hover text-token hover:border-brand"
                    }`}
                  >
                    {busy === p.id ? t("common.processing") : t("billing.subscribe_plan", { name: p.name })}
                  </button>
                ) : (
                  <div className="mt-8 w-full rounded-xl border border-token bg-surface-hover py-3 text-center text-sm font-semibold text-muted">
                    {t("billing.basic_plan")}
                  </div>
                )}
              </div>
            );
          })}
        </section>
      )}

      <p className="mt-10 text-center text-xs text-muted">
        {provider === "simulate"
          ? t("billing.payment_simulation_note")
          : t("billing.midtrans_note")}
      </p>
    </main>
  );
}

