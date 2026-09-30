"use client";

import React, { useState } from "react";
import { api, type AdminPlan, type AdminUser } from "@/lib/api";
import { useTranslation } from "@/lib/i18n";
import { Toast } from "@/components/ui/Toast";
import DataTable, { ColumnDef } from "@/components/ui/DataTable";

export default function UserManager({
  users,
  setUsers,
  plans,
}: {
  users: AdminUser[];
  setUsers: (rows: AdminUser[]) => void;
  plans: AdminPlan[];
}) {
  const { t } = useTranslation();
  const [busyId, setBusyId] = useState<string | null>(null);

  function patch(id: string, values: Partial<AdminUser>) {
    setUsers(users.map((row) => (row.id === id ? { ...row, ...values } : row)));
  }

  async function save(row: AdminUser) {
    setBusyId(row.id);
    try {
      const updated = await api.adminUpdateUser(row.id, {
        name: row.name,
        plan: row.plan,
        credits: Number(row.credits),
        isActive: row.isActive,
        isAdmin: row.isAdmin,
      });
      setUsers(users.map((item) => (item.id === row.id ? updated : item)));
      Toast.success(t("common.save") + " user berhasil");
    } catch (err: any) {
      Toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setBusyId(null);
    }
  }

  const columns: ColumnDef<AdminUser>[] = [
    {
      header: t("admin.users_col_email"),
      accessorKey: "email",
      sortable: true,
      cell: (row) => (
        <div>
          <div className="font-semibold text-token">{row.email}</div>
          <div className="text-[10px] text-token-muted font-mono">{row.id}</div>
        </div>
      ),
    },
    {
      header: t("admin.users_col_name"),
      accessorKey: "name",
      sortable: true,
      cell: (row) => (
        <input
          type="text"
          value={row.name}
          onChange={(e) => patch(row.id, { name: e.target.value })}
          className="w-32 rounded-lg border border-token bg-black/20 px-2 py-1 text-xs text-token focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
      ),
    },
    {
      header: t("admin.users_col_plan"),
      accessorKey: "plan",
      sortable: true,
      cell: (row) => (
        <select
          value={row.plan}
          onChange={(e) => patch(row.id, { plan: e.target.value })}
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
      header: t("admin.users_col_credits"),
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
      header: t("admin.users_col_active"),
      accessorKey: "isActive",
      sortable: true,
      cell: (row) => (
        <input
          type="checkbox"
          checked={row.isActive}
          onChange={(e) => patch(row.id, { isActive: e.target.checked })}
          className="h-4 w-4 rounded accent-indigo-500 cursor-pointer"
        />
      ),
    },
    {
      header: t("admin.users_col_admin"),
      accessorKey: "isAdmin",
      sortable: true,
      cell: (row) => (
        <input
          type="checkbox"
          checked={row.isAdmin}
          onChange={(e) => patch(row.id, { isAdmin: e.target.checked })}
          className="h-4 w-4 rounded accent-amber-500 cursor-pointer"
        />
      ),
    },
    {
      header: t("admin.users_col_created"),
      accessorKey: "createdAt",
      sortable: true,
      cell: (row) => (
        <span className="text-token-muted text-xs">
          {row.createdAt ? new Date(row.createdAt).toLocaleDateString() : "—"}
        </span>
      ),
    },
    {
      header: t("common.actions"),
      cell: (row) => (
        <button
          onClick={() => void save(row)}
          disabled={busyId === row.id}
          className="rounded-lg btn-primary px-3 py-1 font-semibold text-xs transition-opacity disabled:opacity-50"
        >
          {busyId === row.id ? t("common.saving") : t("common.save")}
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <DataTable
        data={users}
        columns={columns}
        keyExtractor={(item) => item.id}
        searchPlaceholder={t("admin.users_search")}
        searchFilter={(item, q) =>
          item.email.toLowerCase().includes(q) ||
          item.name.toLowerCase().includes(q) ||
          item.id.toLowerCase().includes(q)
        }
      />
    </div>
  );
}

