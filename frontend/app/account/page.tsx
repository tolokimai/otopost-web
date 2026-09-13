"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import Header from "@/components/Header";
import { api, type Order } from "@/lib/api";
import { useAuth } from "@/lib/auth";

export default function AccountPage() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const [geminiKey, setGeminiKey] = useState("");
  const [configured, setConfigured] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
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
      // abaikan
    }
  }, []);

  const loadOrders = useCallback(async () => {
    try {
      const r = await api.getOrders();
      setOrders(r.orders);
    } catch {
      // abaikan
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
    setMsg(null);
    setError(null);
    try {
      const res = await api.putCredential({ provider: "gemini", value: geminiKey.trim() });
      setConfigured(res.configured);
      setGeminiKey("");
      setMsg(res.configured ? "API key Gemini tersimpan (terenkripsi)." : "API key dihapus.");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  async function removeKey() {
    setBusy(true);
    setMsg(null);
    setError(null);
    try {
      await api.putCredential({ provider: "gemini", value: "" });
      setConfigured(false);
      setGeminiKey("");
      setMsg("API key dihapus.");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  if (loading || !user) {
    return (
      <main className="mx-auto max-w-3xl px-4">
        <Header />
        <p className="py-10 text-center text-sm text-slate-400">Memuat…</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl px-4 pb-24">
      <Header />
      <h1 className="mb-6 text-2xl font-extrabold">Akun</h1>

      <section className="mb-6 grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <div className="text-xs text-slate-400">Email</div>
          <div className="mt-1 truncate font-semibold">{user.email}</div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <div className="text-xs text-slate-400">Paket</div>
          <div className="mt-1 font-semibold capitalize">{user.plan}</div>
          {user.planExpiresAt ? (
            <div className="mt-1 text-xs text-slate-500">
              Berlaku s/d {new Date(user.planExpiresAt).toLocaleDateString("id-ID")}
            </div>
          ) : null}
          <Link
            href="/pricing"
            className="mt-2 inline-block text-xs font-semibold text-brand-accent"
          >
            {user.plan === "free" ? "Upgrade →" : "Perpanjang / ubah →"}
          </Link>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <div className="text-xs text-slate-400">Kredit</div>
          <div className="mt-1 font-semibold">{user.credits}</div>
        </div>
      </section>

      <section className="mb-6 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
        <h2 className="mb-1 text-lg font-bold">API Key Gemini (opsional)</h2>
        <p className="mb-3 text-sm text-slate-400">
          Pakai API key Google Gemini milikmu sendiri agar kuota AI tidak dibatasi server.
          Disimpan terenkripsi di server. Status:{" "}
          <span className={configured ? "text-green-400" : "text-slate-300"}>
            {configured ? "sudah diatur" : "belum ada"}
          </span>
          .
        </p>
        {msg ? (
          <div className="mb-3 rounded-xl border border-green-500/40 bg-green-500/10 px-3 py-2 text-sm text-green-200">
            {msg}
          </div>
        ) : null}
        {error ? (
          <div className="mb-3 rounded-xl border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">
            {error}
          </div>
        ) : null}
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            type="password"
            value={geminiKey}
            onChange={(e) => setGeminiKey(e.target.value)}
            placeholder="AIza…"
            className="flex-1 rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm outline-none focus:border-brand"
          />
          <button
            onClick={saveKey}
            disabled={busy || !geminiKey.trim()}
            className="rounded-xl bg-brand px-5 py-3 text-sm font-semibold text-white disabled:opacity-50"
          >
            Simpan
          </button>
          {configured ? (
            <button
              onClick={removeKey}
              disabled={busy}
              className="rounded-xl border border-white/15 px-5 py-3 text-sm font-semibold disabled:opacity-50"
            >
              Hapus
            </button>
          ) : null}
        </div>
      </section>

      <section className="mb-6 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold">Riwayat pembayaran</h2>
          <Link href="/pricing" className="text-xs font-semibold text-brand-accent">
            Beli paket →
          </Link>
        </div>
        {orders.length === 0 ? (
          <p className="text-sm text-slate-400">Belum ada transaksi.</p>
        ) : (
          <div className="divide-y divide-white/5 text-sm">
            {orders.map((o) => (
              <div key={o.orderId} className="flex items-center justify-between py-2">
                <div>
                  <div className="font-semibold capitalize">{o.plan}</div>
                  <div className="text-xs text-slate-500">
                    {o.createdAt ? new Date(o.createdAt).toLocaleString("id-ID") : o.orderId}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-semibold">Rp{o.amount.toLocaleString("id-ID")}</div>
                  <div
                    className={`text-xs ${
                      o.status === "paid"
                        ? "text-green-400"
                        : o.status === "pending"
                          ? "text-yellow-400"
                          : "text-slate-500"
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
        onClick={() => {
          logout();
          router.replace("/");
        }}
        className="rounded-xl border border-white/15 px-5 py-3 text-sm font-semibold"
      >
        Keluar
      </button>
    </main>
  );
}
