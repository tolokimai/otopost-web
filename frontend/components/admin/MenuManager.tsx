"use client";

import React, { useState } from "react";
import { api, type AdminPlan, type StudioMenu } from "@/lib/api";
import { useTranslation } from "@/lib/i18n";
import { Toast } from "@/components/ui/Toast";
import { Confirm } from "@/components/ui/Confirm";
import DataTable, { ColumnDef } from "@/components/ui/DataTable";

export default function MenuManager({
  menus,
  setMenus,
  plans,
}: {
  menus: StudioMenu[];
  setMenus: (rows: StudioMenu[]) => void;
  plans: AdminPlan[];
}) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState({
    id: "",
    label: "",
    icon: "✨",
    href: "/studio/",
    requiredPlan: "free",
  });
  const [busyId, setBusyId] = useState<string | null>(null);

  function patch(id: string, values: Partial<StudioMenu>) {
    setMenus(menus.map((row) => (row.id === id ? { ...row, ...values } : row)));
  }

  async function save(row: StudioMenu) {
    setBusyId(row.id);
    try {
      const updated = await api.adminUpdateMenu(row.id, {
        label: row.label,
        description: row.description,
        icon: row.icon,
        href: row.href,
        isEnabled: row.isEnabled,
        isReady: row.isReady,
        requiredPlan: row.requiredPlan,
        sortOrder: Number(row.sortOrder),
      });
      setMenus(menus.map((item) => (item.id === row.id ? updated : item)));
      Toast.success(t("common.save") + " menu berhasil");
    } catch (err: any) {
      Toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setBusyId(null);
    }
  }

  async function create() {
    if (!draft.id.trim() || !draft.label.trim()) {
      Toast.error("ID dan Label menu wajib diisi");
      return;
    }
    setBusyId("new");
    try {
      const created = await api.adminCreateMenu({
        ...draft,
        description: "",
        isEnabled: true,
        isReady: false,
        sortOrder: menus.length * 10 + 10,
      });
      setMenus([...menus, created]);
      setDraft({ id: "", label: "", icon: "✨", href: "/studio/", requiredPlan: "free" });
      Toast.success(t("common.create") + " menu berhasil");
    } catch (err: any) {
      Toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setBusyId(null);
    }
  }

  function remove(id: string) {
    Confirm.delete(`Hapus menu studio "${id}"?`, async () => {
      setBusyId(id);
      try {
        await api.adminDeleteMenu(id);
        setMenus(menus.filter((m) => m.id !== id));
        Toast.success(t("common.delete") + " menu berhasil");
      } catch (err: any) {
        Toast.error(err instanceof Error ? err.message : String(err));
      } finally {
        setBusyId(null);
      }
    });
  }

  const columns: ColumnDef<StudioMenu>[] = [
    {
      header: "Ikon",
      accessorKey: "icon",
      cell: (row) => (
        <input
          type="text"
          value={row.icon}
          onChange={(e) => patch(row.id, { icon: e.target.value })}
          className="w-12 rounded-lg border border-token bg-black/20 p-1.5 text-center text-sm text-token focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
      ),
    },
    {
      header: "ID & Label",
      accessorKey: "label",
      sortable: true,
      cell: (row) => (
        <div>
          <div className="text-[10px] text-token-muted font-mono">{row.id}</div>
          <input
            type="text"
            value={row.label}
            onChange={(e) => patch(row.id, { label: e.target.value })}
            className="w-32 rounded-lg border border-token bg-black/20 px-2 py-1 text-xs font-semibold text-token focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>
      ),
    },
    {
      header: "Path & Deskripsi",
      accessorKey: "href",
      cell: (row) => (
        <div className="space-y-1">
          <input
            type="text"
            value={row.href}
            onChange={(e) => patch(row.id, { href: e.target.value })}
            className="w-48 rounded-lg border border-token bg-black/20 px-2 py-1 text-xs text-token focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
          <input
            type="text"
            value={row.description}
            onChange={(e) => patch(row.id, { description: e.target.value })}
            placeholder="Deskripsi..."
            className="w-48 rounded-lg border border-token bg-black/20 px-2 py-1 text-[11px] text-token-muted focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>
      ),
    },
    {
      header: "Syarat Paket",
      accessorKey: "requiredPlan",
      cell: (row) => (
        <select
          value={row.requiredPlan}
          onChange={(e) => patch(row.id, { requiredPlan: e.target.value })}
          className="rounded-lg border border-token bg-black/40 px-2 py-1 text-xs text-token focus:outline-none focus:ring-1 focus:ring-indigo-500"
        >
          {plans
            .filter((p) => p.isActive)
            .map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
        </select>
      ),
    },
    {
      header: "Tampil",
      accessorKey: "isEnabled",
      cell: (row) => (
        <input
          type="checkbox"
          checked={row.isEnabled}
          onChange={(e) => patch(row.id, { isEnabled: e.target.checked })}
          className="h-4 w-4 rounded accent-indigo-500 cursor-pointer"
        />
      ),
    },
    {
      header: "Siap",
      accessorKey: "isReady",
      cell: (row) => (
        <input
          type="checkbox"
          checked={row.isReady}
          onChange={(e) => patch(row.id, { isReady: e.target.checked })}
          className="h-4 w-4 rounded accent-emerald-500 cursor-pointer"
        />
      ),
    },
    {
      header: "Urutan",
      accessorKey: "sortOrder",
      sortable: true,
      cell: (row) => (
        <input
          type="number"
          value={row.sortOrder}
          onChange={(e) => patch(row.id, { sortOrder: Number(e.target.value) })}
          className="w-16 rounded-lg border border-token bg-black/20 px-2 py-1 text-xs text-token focus:outline-none focus:ring-1 focus:ring-indigo-500"
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
        data={menus}
        columns={columns}
        keyExtractor={(item) => item.id}
        searchPlaceholder="Cari menu studio..."
      />

      {/* Add New Menu Form */}
      <div className="rounded-2xl border border-token bg-surface p-4 space-y-3">
        <h4 className="text-sm font-semibold text-token">{t("admin.menus_add_new")}</h4>
        <div className="grid gap-2 sm:grid-cols-6">
          <input
            placeholder="id-menu"
            value={draft.id}
            onChange={(e) => setDraft({ ...draft, id: e.target.value })}
            className="rounded-xl border border-token bg-black/20 p-2 text-xs text-token focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
          <input
            placeholder="Label Menu"
            value={draft.label}
            onChange={(e) => setDraft({ ...draft, label: e.target.value })}
            className="rounded-xl border border-token bg-black/20 p-2 text-xs text-token focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
          <input
            placeholder="Ikon"
            value={draft.icon}
            onChange={(e) => setDraft({ ...draft, icon: e.target.value })}
            className="rounded-xl border border-token bg-black/20 p-2 text-xs text-token focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
          <input
            placeholder="/studio/path"
            value={draft.href}
            onChange={(e) => setDraft({ ...draft, href: e.target.value })}
            className="rounded-xl border border-token bg-black/20 p-2 text-xs text-token focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
          <select
            value={draft.requiredPlan}
            onChange={(e) => setDraft({ ...draft, requiredPlan: e.target.value })}
            className="rounded-xl border border-token bg-black/40 p-2 text-xs text-token focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            {plans.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <button
            onClick={() => void create()}
            disabled={busyId === "new"}
            className="rounded-xl btn-primary px-3 py-2 text-xs font-semibold"
          >
            {busyId === "new" ? t("common.saving") : `+ ${t("admin.tab_menus")}`}
          </button>
        </div>
      </div>
    </div>
  );
}

