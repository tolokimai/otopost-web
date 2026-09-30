"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api, type Plan } from "@/lib/api";
import { useTranslation } from "@/lib/i18n";

function formatCurrency(n: number, locale: string): string {
  if (!n) return locale === "id" ? "Rp0" : "$0";
  return "Rp" + n.toLocaleString(locale === "id" ? "id-ID" : "en-US");
}

export default function PricingPreview() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [error, setError] = useState(false);
  const { t, locale } = useTranslation();

  useEffect(() => {
    api
      .getPlans()
      .then((data) => setPlans(data.plans))
      .catch(() => setError(true));
  }, []);

  if (error) {
    return (
      <div className="text-center text-sm text-muted">
        {t("common.error")}{" "}
        <Link href="/pricing" className="font-bold text-brand hover:underline">
          {t("billing.choose_plan")} →
        </Link>
      </div>
    );
  }

  if (!plans.length) {
    return (
      <div className="py-8 text-center text-sm text-muted">
        <div className="mx-auto mb-2 h-5 w-5 animate-spin rounded-full border-2 border-brand border-t-transparent" />
        <p>{t("common.loading")}</p>
      </div>
    );
  }

  return (
    <div className="grid gap-6 sm:grid-cols-3">
      {plans.map((plan) => {
        const isHighlight = Boolean(plan.highlight);
        return (
          <div
            key={plan.id}
            className={`relative flex flex-col rounded-2xl border p-6 transition-all ${
              isHighlight
                ? "border-brand bg-brand/10 shadow-lg ring-1 ring-brand"
                : "border-token bg-surface hover:border-brand/40 shadow-sm"
            }`}
          >
            {isHighlight && (
              <span className="absolute -top-3 right-6 rounded-full bg-brand px-3 py-0.5 text-xs font-bold text-white shadow-sm">
                {t("billing.popular_badge")}
              </span>
            )}
            <div className="text-sm font-semibold text-muted">{plan.name}</div>
            <div className="mt-2 text-3xl font-extrabold tracking-tight text-token">
              {formatCurrency(plan.price, locale)}
              <span className="text-xs font-normal text-muted ml-1">
                {t("billing.per_days", { days: plan.durationDays || 30 })}
              </span>
            </div>
            <ul className="mt-6 min-h-28 flex-1 space-y-2 text-sm text-token">
              {plan.features.map((item) => (
                <li key={item} className="flex items-center gap-2">
                  <span className="text-brand font-bold">✓</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <Link
              href="/pricing"
              className={`mt-6 block w-full rounded-xl py-2.5 text-center text-sm font-bold transition-all ${
                isHighlight
                  ? "bg-gradient-to-r from-brand to-brand-accent text-white shadow-md hover:brightness-110"
                  : "border border-token bg-surface-hover text-token hover:border-brand"
              }`}
            >
              {t("billing.subscribe_plan", { name: plan.name })}
            </Link>
          </div>
        );
      })}
    </div>
  );
}

