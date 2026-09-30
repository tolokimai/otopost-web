"use client";

import { useState } from "react";
import { api, type ContentPlanItem } from "@/lib/api";
import { useTranslation } from "@/lib/i18n";
import { Toast } from "@/components/ui/Toast";

type Props = {
  plan: ContentPlanItem;
  onChange: (plan: ContentPlanItem) => void;
};

export default function StudioPlanPrefill({ plan, onChange }: Props) {
  const { t } = useTranslation();
  const [saving, setSaving] = useState(false);

  function update(field: "topic" | "hook" | "outline" | "caption" | "hashtags", value: string) {
    onChange({ ...plan, [field]: value });
  }

  async function save() {
    setSaving(true);
    try {
      await api.updateContentPlan(plan.id, {
        topic: plan.topic,
        hook: plan.hook,
        outline: plan.outline,
        caption: plan.caption,
        hashtags: plan.hashtags,
      });
      Toast.success(t("contentPlan.studio_plan_saved"));
    } catch (error) {
      Toast.error(error instanceof Error ? error.message : t("contentPlan.studio_plan_save_error"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="mb-6 space-y-3 border-s-4 border-brand bg-surface p-4" aria-label={t("contentPlan.studio_plan_title")}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-bold text-token">{t("contentPlan.studio_plan_title")}</h2>
          <p className="text-xs text-token-muted">
            {t("contentPlan.studio_plan_meta", { day: plan.dayNumber, format: plan.format })}
          </p>
        </div>
        <button
          type="button"
          onClick={() => void save()}
          disabled={saving}
          className="rounded-lg btn-primary px-3 py-2 text-xs font-semibold disabled:opacity-50"
        >
          {saving ? t("contentPlan.studio_plan_saving") : t("contentPlan.studio_plan_save")}
        </button>
      </div>

      <label className="block text-xs text-token-muted">
        {t("contentPlan.field_topic")}
        <input value={plan.topic} onChange={(event) => update("topic", event.target.value)} className="mt-1 w-full rounded-lg border border-token bg-surface-hover p-2 text-sm text-token" />
      </label>
      <label className="block text-xs text-token-muted">
        {t("contentPlan.field_hook")}
        <textarea value={plan.hook} onChange={(event) => update("hook", event.target.value)} rows={2} className="mt-1 w-full rounded-lg border border-token bg-surface-hover p-2 text-sm text-token" />
      </label>
      <label className="block text-xs text-token-muted">
        {t("contentPlan.field_outline")}
        <textarea value={plan.outline} onChange={(event) => update("outline", event.target.value)} rows={3} className="mt-1 w-full rounded-lg border border-token bg-surface-hover p-2 text-sm text-token" />
      </label>
      <div className="grid gap-3 md:grid-cols-2">
        <label className="block text-xs text-token-muted">
          {t("contentPlan.field_caption")}
          <textarea value={plan.caption} onChange={(event) => update("caption", event.target.value)} rows={3} className="mt-1 w-full rounded-lg border border-token bg-surface-hover p-2 text-sm text-token" />
        </label>
        <label className="block text-xs text-token-muted">
          {t("contentPlan.field_hashtags")}
          <textarea value={plan.hashtags} onChange={(event) => update("hashtags", event.target.value)} rows={3} className="mt-1 w-full rounded-lg border border-token bg-surface-hover p-2 text-sm text-token" />
        </label>
      </div>
    </section>
  );
}
