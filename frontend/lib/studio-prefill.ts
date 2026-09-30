import type { ContentPlanItem } from "./types";

const PREFILL_KEY = "otopost_prefill";

export function consumeStudioPlanPrefill(): ContentPlanItem | null {
  if (typeof window === "undefined") return null;
  const raw = window.sessionStorage.getItem(PREFILL_KEY);
  if (!raw) return null;
  window.sessionStorage.removeItem(PREFILL_KEY);

  try {
    const value = JSON.parse(raw) as Partial<ContentPlanItem>;
    if (typeof value.id !== "string" || typeof value.topic !== "string") return null;
    return {
      id: value.id,
      personaId: value.personaId || value.persona_id,
      dayNumber: Number(value.dayNumber) || 1,
      scheduledDate: typeof value.scheduledDate === "string" ? value.scheduledDate : undefined,
      topic: value.topic,
      hook: typeof value.hook === "string" ? value.hook : "",
      outline: typeof value.outline === "string" ? value.outline : "",
      format: typeof value.format === "string" ? value.format : "CAROUSEL",
      status: typeof value.status === "string" ? value.status : "DRAFT",
      caption: typeof value.caption === "string" ? value.caption : "",
      hashtags: typeof value.hashtags === "string" ? value.hashtags : "",
      createdAt: typeof value.createdAt === "string" ? value.createdAt : undefined,
    };
  } catch {
    return null;
  }
}

export function formatPlanBrief(plan: ContentPlanItem): string {
  return [
    plan.topic,
    plan.hook && `Hook:\n${plan.hook}`,
    plan.outline && `Outline:\n${plan.outline}`,
    plan.caption && `Caption:\n${plan.caption}`,
    plan.hashtags && `Hashtags:\n${plan.hashtags}`,
  ]
    .filter(Boolean)
    .join("\n\n");
}
