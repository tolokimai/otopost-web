"use client";

import React, { useEffect, useState } from "react";
import { api, type AdminSetting } from "@/lib/api";
import { useTranslation } from "@/lib/i18n";
import { Toast } from "@/components/ui/Toast";
import { Confirm } from "@/components/ui/Confirm";

export default function SettingManager({
  settings,
  setSettings,
}: {
  settings: AdminSetting[];
  setSettings: (rows: AdminSetting[]) => void;
}) {
  const { t } = useTranslation();
  const [values, setValues] = useState<Record<string, string>>({});
  const [busyKey, setBusyKey] = useState<string | null>(null);

  useEffect(() => {
    setValues(Object.fromEntries(settings.map((row) => [row.key, row.value])));
  }, [settings]);

  async function save(row: AdminSetting, clear = false) {
    setBusyKey(row.key);
    try {
      const updated = await api.adminUpdateSetting(row.key, {
        value: values[row.key] || "",
        clear,
      });
      setSettings(settings.map((item) => (item.key === row.key ? updated : item)));
      setValues((current) => ({ ...current, [row.key]: updated.value }));
      Toast.success(t("common.save") + ` "${row.label}" berhasil`);
    } catch (err: any) {
      Toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setBusyKey(null);
    }
  }

  function clearSecret(row: AdminSetting) {
    Confirm.delete(`Hapus kunci rahasia "${row.label}"?`, async () => {
      await save(row, true);
    });
  }

  const categories = Array.from(new Set(settings.map((row) => row.category)));

  return (
    <div className="space-y-6">
      {categories.map((category) => (
        <section
          key={category}
          className="rounded-2xl border border-token bg-surface p-5 space-y-4"
        >
          <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-400">
            {category}
          </h3>
          <div className="divide-y divide-white/5">
            {settings
              .filter((row) => row.category === category)
              .map((row) => (
                <div
                  key={row.key}
                  className="grid gap-3 py-3.5 sm:grid-cols-[1fr_280px_auto] sm:items-center"
                >
                  <div>
                    <div className="text-sm font-semibold text-token">{row.label}</div>
                    <div className="text-xs text-token-muted">
                      {row.description} · <code className="text-indigo-400 font-mono text-[11px]">{row.key}</code>
                    </div>
                  </div>

                  <div>
                    {row.valueType === "bool" ? (
                      <select
                        value={values[row.key] || "false"}
                        onChange={(e) =>
                          setValues({ ...values, [row.key]: e.target.value })
                        }
                        className="w-full rounded-xl border border-token bg-black/40 px-3 py-2 text-xs text-token focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      >
                        <option value="true">Aktif (True)</option>
                        <option value="false">Nonaktif (False)</option>
                      </select>
                    ) : (
                      <input
                        type={
                          row.isSecret
                            ? "password"
                            : row.valueType === "int"
                            ? "number"
                            : "text"
                        }
                        value={values[row.key] || ""}
                        onChange={(e) =>
                          setValues({ ...values, [row.key]: e.target.value })
                        }
                        placeholder={
                          row.isSecret && row.hasValue ? "•••••••• (Tersimpan aman)" : ""
                        }
                        className="w-full rounded-xl border border-token bg-black/20 px-3 py-2 text-xs text-token focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => void save(row)}
                      disabled={busyKey === row.key}
                      className="rounded-xl btn-primary px-3.5 py-1.5 text-xs font-semibold"
                    >
                      {busyKey === row.key ? t("common.saving") : t("common.save")}
                    </button>
                    {row.isSecret && row.hasValue ? (
                      <button
                        onClick={() => clearSecret(row)}
                        disabled={busyKey === row.key}
                        className="text-xs text-red-400 hover:text-red-300 transition-colors"
                      >
                        {t("common.delete")}
                      </button>
                    ) : null}
                  </div>
                </div>
              ))}
          </div>
        </section>
      ))}
    </div>
  );
}

