"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

import Header from "@/components/Header";
import { api, type Order } from "@/lib/api";
import { useAuth } from "@/lib/auth";

function ReturnInner() {
  const params = useSearchParams();
  const { refresh } = useAuth();
  const orderId = params.get("order_id") || "";
  const simulate = params.get("simulate") === "1";
  const [order, setOrder] = useState<Order | null>(null);
  const [status, setStatus] = useState<string>("checking");
  const [error, setError] = useState<string | null>(null);
  const started = useRef(false);

  const finalize = useCallback(async () => {
    if (!orderId) {
      setStatus("error");
      setError("Order tidak ditemukan.");
      return;
    }
    try {
      if (simulate) {
        const o = await api.simulatePay(orderId);
        setOrder(o);
        setStatus(o.status === "paid" ? "paid" : o.status);
        await refresh();
        return;
      }
      for (let i = 0; i < 20; i++) {
        const o = await api.getOrder(orderId);
        setOrder(o);
        if (o.status === "paid") {
          setStatus("paid");
          await refresh();
          return;
        }
        if (o.status === "failed" || o.status === "expired") {
          setStatus(o.status);
          return;
        }
        await new Promise((r) => setTimeout(r, 3000));
      }
      setStatus("pending");
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : String(err));
    }
  }, [orderId, simulate, refresh]);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void finalize();
  }, [finalize]);

  return (
    <main className="mx-auto max-w-xl px-4 pb-24">
      <Header />
      <section className="mt-10 rounded-2xl border border-white/10 bg-white/[0.03] p-8 text-center">
        {status === "paid" ? (
          <>
            <div className="mb-3 text-4xl">✅</div>
            <h1 className="text-2xl font-extrabold">Pembayaran berhasil</h1>
            <p className="mt-2 text-slate-400">
              Paket{order ? ` ${order.plan}` : ""} kamu sudah aktif. Selamat berkarya!
            </p>
          </>
        ) : status === "checking" ? (
          <>
            <div className="mb-3 text-4xl">⏳</div>
            <h1 className="text-2xl font-extrabold">Memproses pembayaran…</h1>
            <p className="mt-2 text-slate-400">Mohon tunggu sebentar.</p>
          </>
        ) : status === "pending" ? (
          <>
            <div className="mb-3 text-4xl">🕒</div>
            <h1 className="text-2xl font-extrabold">Menunggu pembayaran</h1>
            <p className="mt-2 text-slate-400">
              Pembayaran belum terkonfirmasi. Jika sudah membayar, status akan otomatis diperbarui.
            </p>
          </>
        ) : status === "error" ? (
          <>
            <div className="mb-3 text-4xl">⚠️</div>
            <h1 className="text-2xl font-extrabold">Terjadi kesalahan</h1>
            <p className="mt-2 text-slate-400">{error}</p>
          </>
        ) : (
          <>
            <div className="mb-3 text-4xl">❌</div>
            <h1 className="text-2xl font-extrabold">Pembayaran {status}</h1>
            <p className="mt-2 text-slate-400">Silakan coba lagi dari halaman harga.</p>
          </>
        )}

        <div className="mt-6 flex justify-center gap-3">
          <Link
            href="/studio"
            className="rounded-xl bg-brand px-5 py-2 text-sm font-semibold text-white"
          >
            Buka Studio
          </Link>
          <Link
            href="/account"
            className="rounded-xl border border-white/15 px-5 py-2 text-sm font-semibold"
          >
            Lihat Akun
          </Link>
        </div>
        {orderId ? <p className="mt-4 text-xs text-slate-600">Order: {orderId}</p> : null}
      </section>
    </main>
  );
}

export default function BillingReturnPage() {
  return (
    <Suspense
      fallback={
        <main className="mx-auto max-w-xl px-4">
          <p className="py-16 text-center text-sm text-slate-400">Memuat…</p>
        </main>
      }
    >
      <ReturnInner />
    </Suspense>
  );
}
