import type { ContentFormat, ContentPlanItem, Persona, ThemeIdea } from "../types";
import { http } from "../http/client";

export const contentApi = {
  getPersonas: () => http.get<{ personas: Persona[] }>("/api/personas"),
  createPersona: (body: Partial<Persona>) =>
    http.post<{ ok: boolean; id: string }>("/api/personas", body),
  updatePersona: (id: string, body: Partial<Persona>) =>
    http.put<{ ok: boolean }>(`/api/personas/${id}`, body),
  deletePersona: (id: string) => http.delete<{ ok: boolean }>(`/api/personas/${id}`),
  setDefaultPersona: (id: string) =>
    http.post<{ ok: boolean }>(`/api/personas/${id}/set-default`),
  generatePersona: (body: { niche: string; name: string; target_audience?: string }) =>
    http.post<{ ok: boolean; persona: Persona; notice?: string }>("/api/personas/generate", body),
  getContentPlans: (personaId?: string, statusFilter?: string) => {
    const params = new URLSearchParams();
    if (personaId) params.set("persona_id", personaId);
    if (statusFilter) params.set("status_filter", statusFilter);
    const query = params.toString();
    return http.get<{ plans: ContentPlanItem[] }>(`/api/content-plans${query ? `?${query}` : ""}`);
  },
  createContentPlan: (body: Partial<ContentPlanItem>) =>
    http.post<{ ok: boolean; id: string }>("/api/content-plans", body),
  updateContentPlan: (id: string, body: Partial<ContentPlanItem>) =>
    http.put<{ ok: boolean }>(`/api/content-plans/${id}`, body),
  deleteContentPlan: (id: string) =>
    http.delete<{ ok: boolean }>(`/api/content-plans/${id}`),
  generateThemes: (personaId: string) =>
    http.post<{ ok: boolean; themes: ThemeIdea[] }>("/api/content-plans/generate-themes", {
      persona_id: personaId,
    }),
  generateRoadmap: (body: {
    persona_id: string;
    theme: string;
    duration_days: number;
    formats?: ContentFormat[];
    save_to_db?: boolean;
  }) => http.post<{ ok: boolean; count: number; roadmap: ContentPlanItem[] }>(
    "/api/content-plans/generate-roadmap",
    body,
  ),
  sendToStudio: (planId: string) =>
    http.post<{ ok: boolean; targetUrl: string; payload: ContentPlanItem }>(
      `/api/content-plans/${planId}/send-to-studio`,
    ),
};
