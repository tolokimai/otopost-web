"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState, type FormEvent } from "react";

import { Toast } from "@/components/ui/Toast";
import { useAuth } from "@/lib/auth";
import { useTranslation } from "@/lib/i18n";

function RegisterForm() {
  const { register } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const { t } = useTranslation();
  const next = params.get("next") || "/studio";
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (password.length < 8) {
      Toast.warning(t("auth.min_password"));
      return;
    }
    setBusy(true);
    try {
      await register(email.trim(), password, name.trim());
      router.replace(next);
    } catch (err) {
      Toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 text-token">
      <Link href="/" className="mb-8 flex items-center gap-2 self-center">
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-brand to-brand-accent text-white shadow-md text-xl">
          🎬
        </span>
        <span className="text-xl font-extrabold tracking-tight">
          OtoPost <span className="text-brand">Studio</span>
        </span>
      </Link>

      <div className="rounded-2xl border border-token bg-surface p-7 shadow-lg">
        <h1 className="mb-1 text-2xl font-extrabold tracking-tight">
          {t("auth.register_title")}
        </h1>
        <p className="mb-6 text-xs text-muted">
          {t("auth.register_desc")}
        </p>

        <form onSubmit={submit} className="flex flex-col gap-3.5">
          <div>
            <label className="mb-1 block text-xs font-semibold text-muted">
              {t("auth.name")}
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("auth.name_optional")}
              autoComplete="name"
              className="w-full rounded-xl border border-token bg-surface px-4 py-2.5 text-sm focus:border-brand focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-muted">
              {t("auth.email")}
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@domain.com"
              autoComplete="email"
              className="w-full rounded-xl border border-token bg-surface px-4 py-2.5 text-sm focus:border-brand focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-muted">
              {t("auth.password")}
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t("auth.password_min_hint")}
              autoComplete="new-password"
              className="w-full rounded-xl border border-token bg-surface px-4 py-2.5 text-sm focus:border-brand focus:outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={busy}
            className="mt-3 w-full rounded-xl bg-gradient-to-r from-brand to-brand-accent py-3 text-sm font-bold text-white shadow-md hover:brightness-110 disabled:opacity-50 transition-all active:scale-[0.99]"
          >
            {busy ? t("common.processing") : t("auth.register_btn")}
          </button>
        </form>

        <p className="mt-5 text-center text-xs text-muted">
          {t("auth.have_account")}{" "}
          <Link href="/login" className="font-bold text-brand hover:underline">
            {t("auth.login_btn")}
          </Link>
        </p>
      </div>
    </main>
  );
}

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center text-muted text-sm">
          Loading…
        </div>
      }
    >
      <RegisterForm />
    </Suspense>
  );
}

