"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import Header from "@/components/Header";
import MenuManager from "@/components/admin/MenuManager";
import PlanManager from "@/components/admin/PlanManager";
import SettingManager from "@/components/admin/SettingManager";
import UserManager from "@/components/admin/UserManager";
import {
  api,
  type AdminOverview,
  type AdminPlan,
  type AdminSetting,
  type AdminUser,
  type StudioMenu,
} from "@/lib/api";
import { useAuth } from "@/lib/auth";

type Tab = "overview" | "plans" | "settings" | "users" | "menus";
const TABS: { id: Tab; label: string }[] = [
  { id: "overview", label: "Ringkasan" },
  { id: "plans", label: "Paket" },
  { id: "settings", label: "Settings" },
  { id: "users", label: "User" },
  { id: "menus", label: "Menu Studio" },
];

function rupiah(value: number) { return "Rp" + Number(value || 0).toLocaleString("id-ID"); }

export default function AdminPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("overview");
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [plans, setPlans] = useState<AdminPlan[]>([]);
  const [settings, setSettings] = useState<AdminSetting[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [menus, setMenus] = useState<StudioMenu[]>([]);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!loading && (!user || !user.isAdmin)) router.replace(user ? "/studio" : "/login?next=/admin");
  }, [loading, user, router]);

  useEffect(() => {
    if (!user?.isAdmin) return;
    setBusy(true);
    Promise.all([
      api.adminOverview(), api.adminPlans(), api.adminSettings(), api.adminUsers(), api.adminMenus(),
    ]).then(([o, p, s, u, m]) => {
      setOverview(o); setPlans(p.plans); setSettings(s.settings); setUsers(u.users); setMenus(m.menus);
    }).catch((err) => setError(err instanceof Error ? err.message : String(err))).finally(() => setBusy(false));
  }, [user]);

  if (loading || !user?.isAdmin) return <main className="mx-auto max-w-6xl px-4"><Header /><p className="py-10 text-center text-sm text-slate-400">Memeriksa akses admin…</p></main>;

  const cards = overview ? [
    ["Total user", overview.users], ["User aktif", overview.activeUsers], ["User berbayar", overview.paidUsers],
    ["Order lunas", overview.paidOrders], ["Pendapatan tercatat", rupiah(overview.revenue)], ["Menu aktif", overview.menusEnabled],
  ] : [];

  return <main className="mx-auto max-w-7xl px-4 pb-24">
    <Header />
    <div className="mb-6"><div className="text-xs font-semibold text-amber-300">OWNER CONTROL CENTER</div><h1 className="mt-1 text-3xl font-extrabold">Admin OtoPost</h1><p className="mt-2 text-sm text-slate-400">Paket, billing, user, secret, dan menu Studio tersimpan di database—perubahan tidak perlu rebuild frontend.</p></div>
    <nav className="mb-6 flex gap-2 overflow-x-auto border-b border-white/10 pb-3">{TABS.map((item) => <button key={item.id} onClick={() => setTab(item.id)} className={`whitespace-nowrap rounded-lg px-4 py-2 text-sm ${tab === item.id ? "bg-brand font-semibold" : "bg-white/5 text-slate-400"}`}>{item.label}</button>)}</nav>
    {busy ? <div className="rounded-xl border border-brand/30 bg-brand/10 p-4 text-sm">⏳ Memuat konfigurasi admin…</div> : null}
    {error ? <div className="mb-4 rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-200">{error}</div> : null}
    {!busy && tab === "overview" ? <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{cards.map(([label, value]) => <div key={String(label)} className="rounded-2xl border border-white/10 bg-white/[0.03] p-5"><div className="text-xs text-slate-500">{label}</div><div className="mt-2 text-2xl font-extrabold">{value}</div></div>)}</div> : null}
    {!busy && tab === "plans" ? <PlanManager plans={plans} setPlans={setPlans} /> : null}
    {!busy && tab === "settings" ? <SettingManager settings={settings} setSettings={setSettings} /> : null}
    {!busy && tab === "users" ? <UserManager users={users} setUsers={setUsers} plans={plans} /> : null}
    {!busy && tab === "menus" ? <MenuManager menus={menus} setMenus={setMenus} plans={plans} /> : null}
  </main>;
}
