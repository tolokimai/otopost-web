"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

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
import { useTranslation } from "@/lib/i18n";
import { StateRenderer, PageState } from "@/components/ui/StateRenderer";

type Tab = "overview" | "plans" | "settings" | "users" | "menus";

function rupiah(value: number) {
  return "Rp" + Number(value || 0).toLocaleString("id-ID");
}

export default function AdminPage() {
  const { user, loading: authLoading } = useAuth();
  const { t } = useTranslation();
  const router = useRouter();

  const [tab, setTab] = useState<Tab>("overview");
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [plans, setPlans] = useState<AdminPlan[]>([]);
  const [settings, setSettings] = useState<AdminSetting[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [menus, setMenus] = useState<StudioMenu[]>([]);
  const [pageState, setPageState] = useState<PageState>("LOADING");
  const [errorMessage, setErrorMessage] = useState("");

  const TABS: { id: Tab; label: string }[] = [
    { id: "overview", label: t("admin.tab_overview") },
    { id: "plans", label: t("admin.tab_plans") },
    { id: "settings", label: t("admin.tab_settings") },
    { id: "users", label: t("admin.tab_users") },
    { id: "menus", label: t("admin.tab_menus") },
  ];

  useEffect(() => {
    if (!authLoading && (!user || !user.isAdmin)) {
      if (!user) {
        router.replace("/login?next=/admin");
      } else {
        setPageState("FORBIDDEN");
      }
    }
  }, [authLoading, user, router]);

  async function loadData() {
    if (!user?.isAdmin) return;
    setPageState("LOADING");
    setErrorMessage("");
    try {
      const [o, p, s, u, m] = await Promise.all([
        api.adminOverview(),
        api.adminPlans(),
        api.adminSettings(),
        api.adminUsers(),
        api.adminMenus(),
      ]);
      setOverview(o);
      setPlans(p.plans);
      setSettings(s.settings);
      setUsers(u.users);
      setMenus(m.menus);
      setPageState("SUCCESS");
    } catch (err: any) {
      setErrorMessage(err instanceof Error ? err.message : String(err));
      setPageState("ERROR");
    }
  }

  useEffect(() => {
    if (user?.isAdmin) {
      void loadData();
    }
  }, [user]);

  if (authLoading || (!user?.isAdmin && pageState !== "FORBIDDEN")) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-8">
        <Header />
        <StateRenderer state="LOADING">
          <div />
        </StateRenderer>
      </main>
    );
  }

  const cards = overview
    ? [
        ["Total User", overview.users],
        ["User Aktif", overview.activeUsers],
        ["User Berbayar", overview.paidUsers],
        ["Order Lunas", overview.paidOrders],
        ["Total Pendapatan", rupiah(overview.revenue)],
        ["Menu Studio Aktif", overview.menusEnabled],
      ]
    : [];

  return (
    <main className="mx-auto max-w-7xl px-4 pb-24">
      <Header />

      <div className="mb-6 space-y-1">
        <div className="text-xs font-bold tracking-wider text-amber-400 uppercase">
          Owner Control Center
        </div>
        <h1 className="text-3xl font-extrabold text-token">
          {t("admin.title")}
        </h1>
        <p className="text-xs text-token-muted max-w-2xl">
          Pengaturan paket, kuota, secret API, pengguna, dan navigasi Studio disimpan dalam database secara terpusat.
        </p>
      </div>

      {/* Tab Navigation */}
      <nav className="mb-6 flex gap-2 overflow-x-auto border-b border-token pb-3">
        {TABS.map((item) => (
          <button
            key={item.id}
            onClick={() => setTab(item.id)}
            className={`whitespace-nowrap rounded-xl px-4 py-2 text-xs font-semibold transition-all ${
              tab === item.id
                ? "btn-primary shadow-md"
                : "bg-surface hover:bg-surface-hover text-token-muted"
            }`}
          >
            {item.label}
          </button>
        ))}
      </nav>

      {/* Main Content Rendered by State */}
      <StateRenderer
        state={pageState}
        errorMessage={errorMessage}
        onRetry={() => void loadData()}
      >
        {tab === "overview" && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 animate-in fade-in duration-200">
            {cards.map(([label, value]) => (
              <div
                key={String(label)}
                className="rounded-2xl border border-token bg-surface p-5 space-y-1"
              >
                <div className="text-xs font-medium text-token-muted">{label}</div>
                <div className="text-2xl font-extrabold text-token">{value}</div>
              </div>
            ))}
          </div>
        )}

        {tab === "plans" && <PlanManager plans={plans} setPlans={setPlans} />}
        {tab === "settings" && <SettingManager settings={settings} setSettings={setSettings} />}
        {tab === "users" && <UserManager users={users} setUsers={setUsers} plans={plans} />}
        {tab === "menus" && <MenuManager menus={menus} setMenus={setMenus} plans={plans} />}
      </StateRenderer>
    </main>
  );
}

