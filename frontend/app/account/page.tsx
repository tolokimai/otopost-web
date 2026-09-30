"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import Header from "@/components/Header";
import { Confirm } from "@/components/ui/Confirm";
import { Toast } from "@/components/ui/Toast";
import { api, type Order } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useTranslation } from "@/lib/i18n";

export default function AccountPage() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const { t, locale } = useTranslation();

  const [geminiKey, setGeminiKey] = useState("");
  const [configured, setConfigured] = useState(false);
  const [busy, setBusy] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    if (!loading && !user) router.replace("/login?next=/account");
  }, [loading, user, router]);

  const loadCreds = useCallback(async () => {
    try {
      const c = await api.getCredentials();
      const g = c.providers.find((p) => p.provider === "gemini");
      setConfigured(Boolean(g?.configured));
    } catch {
      // Non-critical, ignore
    }
  }, []);

  const loadOrders = useCallback(async () => {
    try {
      const r = await api.getOrders();
      setOrders(r.orders);
    } catch {
      // Non-critical, ignore
    }
  }, []);

  useEffect(() => {
    if (user) {
      void loadCreds();
      void loadOrders();
    }
  }, [user, loadCreds, loadOrders]);

  async function saveKey() {
    setBusy(true);
    try {
      const res = await api.putCredential({ provider: "gemini", value: geminiKey.trim() });
      setConfigured(res.configured);
      setGeminiKey("");
      Toast.success(res.configured ? t("auth.key_saved") : t("auth.key_deleted"));
    } catch (err) {
      Toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  function removeKey() {
    Confirm.delete(t("auth.gemini_key_title"), async () => {
      setBusy(true);
      try {
        await api.putCredential({ provider: "gemini", value: "" });
        setConfigured(false);
        setGeminiKey("");
        Toast.success(t("auth.key_deleted"));
      } catch (err) {
        Toast.error(err instanceof Error ? err.message : String(err));
      } finally {
        setBusy(false);
      }
    });
  }

  if (loading || !user) {
    return (
      <main className="mx-auto max-w-3xl px-4">
        <Header />
        <div className="py-20 text-center text-sm text-muted">
          <div className="mx-auto mb-3 h-6 w-6 animate-spin rounded-full border-2 border-brand border-t-transparent" />
          <p>{t("common.loading")}</p>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-4xl px-4 pb-24 text-token">
      <Header />
      <h1 className="mb-6 text-2xl font-extrabold tracking-tight">
        {t("auth.account_settings")}
      </h1>

      <section className="mb-8 grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-token bg-surface p-5 shadow-sm">
          <div className="text-xs font-semibold text-muted">{t("auth.email")}</div>
          <div className="mt-1 truncate font-bold text-base">{user.email}</div>
        </div>

        <div className="rounded-2xl border border-token bg-surface p-5 shadow-sm">
          <div className="text-xs font-semibold text-muted">{t("auth.current_plan")}</div>
          <div className="mt-1 font-bold text-base capitalize">{user.plan}</div>
          {user.planExpiresAt && (
            <div className="mt-1 text-xs text-muted">
              {t("auth.plan_expires", {
                date: new Date(user.planExpiresAt).toLocaleDateString(locale === "id" ? "id-ID" : "en-US"),
              })}
            </div>
          )}
          <Link
            href="/pricing"
            className="mt-2 inline-block text-xs font-bold text-brand hover:underline"
          >
            {user.plan === "free" ? t("auth.upgrade_plan") : t("auth.renew_plan")}
          </Link>
        </div>

        <div className="rounded-2xl border border-token bg-surface p-5 shadow-sm">
          <div className="text-xs font-semibold text-muted">{t("auth.credits_remaining")}</div>
          <div className="mt-1 font-extrabold text-2xl text-brand">{user.credits}</div>
        </div>
      </section>

      <section className="mb-8 rounded-2xl border border-token bg-surface p-6 shadow-sm">
        <h2 className="mb-1 text-base font-bold">{t("auth.gemini_key_title")}</h2>
        <p className="mb-4 text-xs text-muted leading-relaxed">
          {t("auth.gemini_key_desc")}{" "}
          <span className="font-semibold">
            Status:{" "}
            <span className={configured ? "text-emerald-400" : "text-amber-400"}>
              {configured ? t("auth.key_configured") : t("auth.key_not_configured")}
            </span>
          </span>
        </p>

        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            type="password"
            value={geminiKey}
            onChange={(e) => setGeminiKey(e.target.value)}
            placeholder="AIzaSy…"
            className="flex-1 rounded-xl border border-token bg-surface px-4 py-2.5 text-sm focus:border-brand focus:outline-none"
          />
          <button
            type="button"
            onClick={saveKey}
            disabled={busy || !geminiKey.trim()}
            className="rounded-xl bg-brand px-6 py-2.5 text-sm font-bold text-white shadow-md hover:brightness-110 disabled:opacity-50 transition-all"
          >
            {busy ? t("common.processing") : t("auth.save_btn")}
          </button>
          {configured && (
            <button
              type="button"
              onClick={removeKey}
              disabled={busy}
              className="rounded-xl border border-token bg-surface-hover px-5 py-2.5 text-sm font-semibold text-rose-400 hover:bg-rose-500/10 hover:border-rose-500/30 disabled:opacity-50 transition-all"
            >
              {t("auth.delete_btn")}
            </button>
          )}
        </div>
      </section>

      <section className="mb-8 rounded-2xl border border-token bg-surface p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-bold">{t("auth.order_history")}</h2>
          <Link href="/pricing" className="text-xs font-bold text-brand hover:underline">
            {t("auth.upgrade_plan")}
          </Link>
        </div>

        {orders.length === 0 ? (
          <p className="text-sm text-muted">{t("auth.no_orders")}</p>
        ) : (
          <div className="divide-y divide-token text-sm">
            {orders.map((o) => (
              <div key={o.orderId} className="flex items-center justify-between py-3">
                <div>
                  <div className="font-bold capitalize">{o.plan}</div>
                  <div className="text-xs text-muted">
                    {o.createdAt
                      ? new Date(o.createdAt).toLocaleString(locale === "id" ? "id-ID" : "en-US")
                      : o.orderId}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold">
                    Rp{o.amount.toLocaleString(locale === "id" ? "id-ID" : "en-US")}
                  </div>
                  <div
                    className={`text-xs font-semibold uppercase ${
                      o.status === "paid"
                        ? "text-emerald-400"
                        : o.status === "pending"
                          ? "text-amber-400"
                          : "text-muted"
                    }`}
                  >
                    {o.status}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <button
        type="button"
        onClick={() => {
          logout();
          router.replace("/");
        }}
        className="rounded-xl border border-token bg-surface-hover px-6 py-2.5 text-sm font-semibold text-rose-400 hover:bg-rose-500/10 hover:border-rose-500/30 transition-all"
      >
        {t("auth.logout")}
      </button>
    </main>
  );
}
