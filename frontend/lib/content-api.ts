import { getToken } from "./api";

const BASE = (process.env.NEXT_PUBLIC_API_BASE || "").replace(/\/$/, "");

export type Persona = { id: string; name: string; brandName: string; niche: string; audience: string; painPoints: string[]; aspirations: string[]; tone: string; language: string; offers: string[]; channels: string[]; differentiators: string; brandStory: string; contentPillars: string[]; isDefault: boolean; createdAt?: string | null; updatedAt?: string | null };
export type PersonaDraft = Omit<Persona, "id" | "createdAt" | "updatedAt">;
export type ContentPlan = { id: string; personaId?: string | null; title: string; goal: string; campaign: string; durationDays: 7 | 30; startDate: string; status: "draft" | "active" | "archived"; strategy: { positioning?: string; contentMix?: string[]; conversionPath?: string; notes?: string }; itemCount?: number; createdAt?: string | null; updatedAt?: string | null };
export type ContentStatus = "draft" | "review" | "approved" | "in_production" | "scheduled" | "published" | "failed";
export type StudioWorkflow = "carousel" | "podcast" | "remake" | "self-video" | "ai-video";
export type ContentItem = { id: string; planId?: string | null; personaId?: string | null; scheduledDate?: string | null; channel: string; format: string; pillar: string; title: string; hook: string; angle: string; objective: string; cta: string; brief: string; keywords: string[]; workflow: StudioWorkflow; status: ContentStatus; sourceProjectId?: string | null; outputUrl: string; externalPostId: string; lastError: string; sortOrder: number; publishedAt?: string | null; createdAt?: string | null; updatedAt?: string | null };

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getToken();
  const headers = new Headers(init?.headers || {});
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (init?.body && !(init.body instanceof FormData)) headers.set("Content-Type", "application/json");
  const response = await fetch(`${BASE}${path}`, { ...init, headers });
  if (!response.ok) {
    let detail = "";
    try { detail = String(((await response.json()) as { detail?: string }).detail || ""); } catch { /* status is enough */ }
    throw new Error(`HTTP ${response.status}${detail ? `: ${detail}` : ""}`);
  }
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

function qs(values: Record<string, string | number | undefined | null>): string {
  const params = new URLSearchParams();
  Object.entries(values).forEach(([key, value]) => { if (value !== undefined && value !== null && value !== "") params.set(key, String(value)); });
  return params.size ? `?${params}` : "";
}

export const contentApi = {
  listPersonas: () => request<{ personas: Persona[] }>("/personas"),
  generatePersona: (body: { brandName: string; niche: string; offer?: string; audienceHint?: string; channels: string[]; language?: string }) => request<{ persona: PersonaDraft; creditsRemaining: number }>("/personas/generate", { method: "POST", body: JSON.stringify(body) }),
  createPersona: (body: PersonaDraft) => request<Persona>("/personas", { method: "POST", body: JSON.stringify(body) }),
  updatePersona: (id: string, body: Partial<PersonaDraft>) => request<Persona>(`/personas/${id}`, { method: "PUT", body: JSON.stringify(body) }),
  deletePersona: (id: string) => request<void>(`/personas/${id}`, { method: "DELETE" }),
  listPlans: () => request<{ plans: ContentPlan[] }>("/content-plans"),
  getPlan: (id: string) => request<{ plan: ContentPlan; items: ContentItem[] }>(`/content-plans/${id}`),
  generatePlan: (body: { personaId: string; title?: string; durationDays: 7 | 30; startDate: string; goal: string; campaign?: string; channels: string[]; workflows: StudioWorkflow[]; postsPerWeek: number }) => request<{ plan: ContentPlan; items: ContentItem[]; creditsRemaining: number }>("/content-plans/generate", { method: "POST", body: JSON.stringify(body) }),
  updatePlan: (id: string, body: Partial<Pick<ContentPlan, "title" | "goal" | "campaign" | "status">>) => request<ContentPlan>(`/content-plans/${id}`, { method: "PUT", body: JSON.stringify(body) }),
  deletePlan: (id: string) => request<void>(`/content-plans/${id}`, { method: "DELETE" }),
  listItems: (filters: { status?: string; workflow?: string; planId?: string; scheduledFrom?: string; scheduledTo?: string; limit?: number; offset?: number } = {}) => request<{ items: ContentItem[]; total: number; offset: number }>(`/content-library${qs(filters)}`),
  createItem: (body: Partial<ContentItem> & { title: string }) => request<ContentItem>("/content-library", { method: "POST", body: JSON.stringify(body) }),
  updateItem: (id: string, body: Partial<ContentItem> & { clearScheduledDate?: boolean }) => request<ContentItem>(`/content-library/${id}`, { method: "PUT", body: JSON.stringify(body) }),
  duplicateItem: (id: string) => request<ContentItem>(`/content-library/${id}/duplicate`, { method: "POST", body: "{}" }),
  handoffItem: (id: string, workflow?: StudioWorkflow) => request<{ item: ContentItem; targetUrl: string; workflow: StudioWorkflow; prefill: Record<string, string> }>(`/content-library/${id}/handoff`, { method: "POST", body: JSON.stringify({ workflow }) }),
  deleteItem: (id: string) => request<void>(`/content-library/${id}`, { method: "DELETE" }),
};
