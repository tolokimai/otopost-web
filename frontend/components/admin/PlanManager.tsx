"use client";

import React, { useState } from "react";
import { api, type AdminPlan } from "@/lib/api";
import { useTranslation } from "@/lib/i18n";
import { Toast } from "@/components/ui/Toast";
import { Confirm } from "@/components/ui/Confirm";
import DataTable, { ColumnDef } from "@/components/ui/DataTable";

export default function PlanManager({
  plans,
  setPlans,
}: {
  plans: AdminPlan[];
  setPlans: (rows: AdminPlan[]) => void;
}) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState({ id: "", name: "", price: 0, credits: 0, durationDays: 30 });
  const [busyId, setBusyId] = useState<string | null>(null);

  function patch(id: string, values: Partial<AdminPlan>) {
    setPlans(plans.map((row) => (row.id === id ? { ...row, ...values } : row)));
  }

  async function save(row: AdminPlan) {
    setBusyId(row.id);
    try {
      const updated = await api.adminUpdatePlan(row.id, {
        name: row.name,
        price: Number(row.price),
        credits: Number(row.credits),
        durationDays: Number(row.durationDays || 30),
        features: row.features,
        purchasable: row.purchasable,
        highlight: row.highlight,
        isActive: row.isActive,
        sortOrder: Number(row.sortOrder),
      });
      setPlans(plans.map((item) => (item.id === row.id ? updated : item)));
      Toast.success(t("common.save") + " paket berhasil");
    } catch (err: any) {
      Toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setBusyId(null);
    }
  }

  async function create() {
    if (!draft.id.trim() || !draft.name.trim()) {
      Toast.error("ID dan Nama paket wajib diisi");
      return;
    }
    setBusyId("new");
    try {
      const created = await api.adminCreatePlan({
        ...draft,
        features: [],
        purchasable: true,
        highlight: false,
        isActive: true,
        sortOrder: plans.length * 10 + 10,
      });
      setPlans([...plans, created]);
      setDraft({ id: "", name: "", price: 0, credits: 0, durationDays: 30 });
      Toast.success(t("common.create") + " paket berhasil");
    } catch (err: any) {
      Toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setBusyId(null);
    }
  }

  function remove(id: string) {
    Confirm.delete(`Hapus paket "${id}"? Tindakan ini tidak dapat dibatalkan.`, async () => {
      setBusyId(id);
      try {
        await api.adminDeletePlan(id);
        setPlans(plans.filter((item) => item.id !== id));
        Toast.success(t("common.delete") + " paket berhasil");
      } catch (err: any) {
        Toast.error(err instanceof Error ? err.message : String(err));
      } finally {
        setBusyId(null);
      }
    });
  }

  const columns: ColumnDef<AdminPlan>[] = [
    {
      header: t("admin.plans_col_id"),
      accessorKey: "id",
      sortable: true,
      cell: (row) => (
        <div>
          <div className="text-[10px] text-token-muted font-mono">{row.id}</div>
          <input
            type="text"
            value={row.name}
            onChange={(e) => patch(row.id, { name: e.target.value })}
            className="w-28 rounded-lg border border-token bg-black/20 px-2 py-1 text-xs text-token focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>
      ),
    },
    {
      header: t("admin.plans_col_price"),
      accessorKey: "price",
      sortable: true,
      cell: (row) => (
        <input
          type="number"
          value={row.price}
          onChange={(e) => patch(row.id, { price: Number(e.target.value) })}
          className="w-24 rounded-lg border border-token bg-black/20 px-2 py-1 text-xs text-token focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
      ),
    },
    {
      header: t("admin.plans_col_credits"),
      accessorKey: "credits",
      sortable: true,
      cell: (row) => (
        <input
          type="number"
          value={row.credits}
          onChange={(e) => patch(row.id, { credits: Number(e.target.value) })}
          className="w-20 rounded-lg border border-token bg-black/20 px-2 py-1 text-xs text-token focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
      ),
    },
    {
      header: t("admin.plans_col_days"),
      accessorKey: "durationDays",
      sortable: true,
      cell: (row) => (
        <input
          type="number"
          value={row.durationDays || 30}
          onChange={(e) => patch(row.id, { durationDays: Number(e.target.value) })}
          className="w-16 rounded-lg border border-token bg-black/20 px-2 py-1 text-xs text-token focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
      ),
    },
    {
      header: t("admin.plans_col_features"),
      cell: (row) => (
        <textarea
          value={row.features.join("\n")}
          onChange={(e) => patch(row.id, { features: e.target.value.split("\n").filter(Boolean) })}
          rows={3}
          className="w-48 rounded-lg border border-token bg-black/20 p-1.5 text-xs text-token focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
      ),
    },
    {
      header: t("admin.plans_col_purchasable"),
      cell: (row) => (
        <input
          type="checkbox"
          checked={row.purchasable}
          onChange={(e) => patch(row.id, { purchasable: e.target.checked })}
          className="h-4 w-4 rounded accent-indigo-500 cursor-pointer"
        />
      ),
    },
    {
      header: t("admin.plans_col_highlight"),
      cell: (row) => (
        <input
          type="checkbox"
          checked={row.highlight}
          onChange={(e) => patch(row.id, { highlight: e.target.checked })}
          className="h-4 w-4 rounded accent-amber-500 cursor-pointer"
        />
      ),
    },
    {
      header: t("admin.plans_col_active"),
      cell: (row) => (
        <input
          type="checkbox"
          checked={row.isActive}
          onChange={(e) => patch(row.id, { isActive: e.target.checked })}
          className="h-4 w-4 rounded accent-emerald-500 cursor-pointer"
        />
      ),
    },
    {
      header: t("common.actions"),
      cell: (row) => (
        <div className="flex flex-col gap-1.5">
          <button
            onClick={() => void save(row)}
            disabled={busyId === row.id}
            className="rounded-lg btn-primary px-3 py-1 font-semibold text-xs"
          >
            {busyId === row.id ? t("common.saving") : t("common.save")}
          </button>
          <button
            onClick={() => remove(row.id)}
            disabled={busyId === row.id}
            className="text-xs text-red-400 hover:text-red-300 transition-colors text-left"
          >
            {t("common.delete")}
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <DataTable
        data={plans}
        columns={columns}
        keyExtractor={(item) => item.id}
        searchPlaceholder="Cari paket..."
      />

      {/* Add New Plan Form */}
      <div className="rounded-2xl border border-token bg-surface p-4 space-y-3">
        <h4 className="text-sm font-semibold text-token">{t("admin.plans_add_new")}</h4>
        <div className="grid gap-2 sm:grid-cols-6">
          <input
            placeholder="id-paket"
            value={draft.id}
            onChange={(e) => setDraft({ ...draft, id: e.target.value })}
            className="rounded-xl border border-token bg-black/20 p-2 text-xs text-token focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
          <input
            placeholder="Nama Paket"
            value={draft.name}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            className="rounded-xl border border-token bg-black/20 p-2 text-xs text-token focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
          <input
            type="number"
            placeholder="Harga (IDR)"
            value={draft.price}
            onChange={(e) => setDraft({ ...draft, price: Number(e.target.value) })}
            className="rounded-xl border border-token bg-black/20 p-2 text-xs text-token focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
          <input
            type="number"
            placeholder="Kredit"
            value={draft.credits}
            onChange={(e) => setDraft({ ...draft, credits: Number(e.target.value) })}
            className="rounded-xl border border-token bg-black/20 p-2 text-xs text-token focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
          <input
            type="number"
            placeholder="Durasi Hari"
            value={draft.durationDays}
            onChange={(e) => setDraft({ ...draft, durationDays: Number(e.target.value) })}
            className="rounded-xl border border-token bg-black/20 p-2 text-xs text-token focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
          <button
            onClick={() => void create()}
            disabled={busyId === "new"}
            className="rounded-xl btn-primary px-3 py-2 text-xs font-semibold"
          >
            {busyId === "new" ? t("common.saving") : `+ ${t("admin.tab_plans")}`}
          </button>
        </div>
      </div>
    </div>
  );
}

