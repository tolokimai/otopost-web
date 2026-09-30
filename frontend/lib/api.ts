import type {
  AdminOverview,
  AdminPlan,
  AdminSetting,
  AdminUser,
  CarouselPayload,
  CarouselProject,
  CarouselRender,
  CarouselSlide,
  CheckoutResponse,
  ClipResult,
  ConnectionTestResult,
  ContentFormat,
  ContentPlanItem,
  CredentialsStatus,
  DashboardStats,
  HooksResponse,
  IntegrationStatus,
  MediaAsset,
  Order,
  OrdersResponse,
  Persona,
  Plan,
  PostingLog,
  RemakeJob,
  SchedulePreferences,
  StudioMenu,
  ThemeIdea,
  TimelineItem,
  TokenResponse,
  TranscriptResponse,
  TranscriptSegment,
  ViralSegment,
  UserOut,
} from "./types";

export * from "./types";

const API_BASE = (
  process.env.NEXT_PUBLIC_API_BASE || "http://localhost:5000"
).replace(/\/+$/, "");

export function mediaUrl(pathOrUrl?: string | null): string {
  if (!pathOrUrl) return "";
  if (pathOrUrl.startsWith("http://") || pathOrUrl.startsWith("https://")) {
    return pathOrUrl;
  }
  const clean = pathOrUrl.startsWith("/") ? pathOrUrl : `/${pathOrUrl}`;
  return `${API_BASE}${clean}`;
}

export class ApiError extends Error {
  code: string;
  status: number;
  details?: unknown;

  constructor(message: string, code = "API_ERROR", status = 400, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

export function setAuthToken(token: string | null) {
  if (typeof window === "undefined") return;
  if (token) {
    localStorage.setItem("otopost_token", token);
  } else {
    localStorage.removeItem("otopost_token");
  }
}

export function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("otopost_token");
}

function authHeader(): Record<string, string> {
  const token = getAuthToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      Accept: "application/json",
      ...authHeader(),
      ...(options.headers || {}),
    },
  });

  const contentType = res.headers.get("content-type") || "";
  const isJson = contentType.includes("application/json");
  const data = isJson ? await res.json().catch(() => null) : null;

  if (!res.ok) {
    const errorObj = data?.error;
    const msg = errorObj?.message || data?.detail || `HTTP ${res.status}`;
    const code = errorObj?.code || `HTTP_${res.status}`;
    throw new ApiError(msg, code, res.status, errorObj?.details);
  }

  if (data && typeof data === "object" && "success" in data && "data" in data) {
    return data.data as T;
  }
  return data as T;
}

const getJSON = <T>(path: string) => request<T>(path, { method: "GET" });
const postJSON = <T>(path: string, body?: unknown) =>
  request<T>(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
const putJSON = <T>(path: string, body?: unknown) =>
  request<T>(path, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
const patchJSON = <T>(path: string, body?: unknown) =>
  request<T>(path, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
const deleteJSON = <T>(path: string) => request<T>(path, { method: "DELETE" });

const uploadForm = <T>(path: string, body: FormData) =>
  request<T>(path, {
    method: "POST",
    body,
  });

export const api = {
  // Auth
  register: (
    reqOrEmail: { email: string; password: string; name?: string } | string,
    password?: string,
    name?: string
  ) => {
    const body =
      typeof reqOrEmail === "object"
        ? reqOrEmail
        : { email: reqOrEmail, password: password || "", name };
    return postJSON<TokenResponse>("/auth/register", body);
  },
  login: (
    reqOrEmail: { email: string; password: string } | string,
    password?: string
  ) => {
    const body =
      typeof reqOrEmail === "object"
        ? reqOrEmail
        : { email: reqOrEmail, password: password || "" };
    return postJSON<TokenResponse>("/auth/login", body);
  },
  me: () => getJSON<UserOut>("/auth/me"),
  getCredentials: () => getJSON<CredentialsStatus>("/auth/credentials"),
  putCredential: (body: { provider: string; value: string }) =>
    putJSON<{ provider: string; configured: boolean }>("/auth/credentials", body),

  // Billing & Plans
  getPlans: () => getJSON<{ plans: Plan[]; provider?: string }>("/billing/plans"),
  checkout: (body: { plan: string; provider?: string }) =>
    postJSON<CheckoutResponse>("/billing/checkout", body),
  simulatePay: (orderId: string) => postJSON<Order>(`/billing/orders/${orderId}/simulate`),
  getOrders: () => getJSON<OrdersResponse>("/billing/orders"),
  getOrder: (orderId: string) => getJSON<Order>(`/billing/orders/${orderId}`),
  getStudioMenus: () => getJSON<{ menus: StudioMenu[] }>("/config/studio-menus"),

  // Dashboard & Auto-Pilot Scheduler
  getDashboardStats: () => getJSON<DashboardStats>("/api/dashboard/stats"),
  getTimeline: (days = 7, platform?: string, statusFilter?: string) => {
    let url = `/api/dashboard/timeline?days=${days}`;
    if (platform) url += `&platform=${encodeURIComponent(platform)}`;
    if (statusFilter) url += `&status_filter=${encodeURIComponent(statusFilter)}`;
    return getJSON<{ timeline: TimelineItem[] }>(url);
  },
  createScheduledPost: (body: {
    title: string;
    format: string;
    media_url: string;
    caption: string;
    hashtags: string;
    platforms: string[];
    scheduled_at: string;
    content_plan_id?: string;
  }) => postJSON<{ ok: boolean; id: string }>("/api/dashboard/posts", body),
  postNow: (postId: string) =>
    postJSON<{ ok: boolean; status: string; postedAt: string }>(
      `/api/dashboard/posts/${postId}/post-now`
    ),
  updatePost: (postId: string, body: Partial<TimelineItem>) =>
    patchJSON<{ ok: boolean }>(`/api/dashboard/posts/${postId}`, body),
  deletePost: (postId: string) => deleteJSON<{ ok: boolean }>(`/api/dashboard/posts/${postId}`),
  retryPost: (postId: string) =>
    postJSON<{ ok: boolean; status: string }>(`/api/dashboard/posts/${postId}/retry`),
  getPostingLogs: (limit = 50) =>
    getJSON<{ logs: PostingLog[] }>(`/api/dashboard/logs?limit=${limit}`),

  // Persona Studio
  getPersonas: () => getJSON<{ personas: Persona[] }>("/api/personas"),
  createPersona: (body: Partial<Persona>) =>
    postJSON<{ ok: boolean; id: string }>("/api/personas", body),
  updatePersona: (id: string, body: Partial<Persona>) =>
    putJSON<{ ok: boolean }>(`/api/personas/${id}`, body),
  deletePersona: (id: string) => deleteJSON<{ ok: boolean }>(`/api/personas/${id}`),
  setDefaultPersona: (id: string) =>
    postJSON<{ ok: boolean }>(`/api/personas/${id}/set-default`),
  generatePersona: (body: { niche: string; name: string; target_audience?: string }) =>
    postJSON<{ ok: boolean; persona: Persona; notice?: string }>("/api/personas/generate", body),

  // Content Plan & Roadmap
  getContentPlans: (personaId?: string, statusFilter?: string) => {
    let url = "/api/content-plans";
    const params: string[] = [];
    if (personaId) params.push(`persona_id=${encodeURIComponent(personaId)}`);
    if (statusFilter) params.push(`status_filter=${encodeURIComponent(statusFilter)}`);
    if (params.length) url += `?${params.join("&")}`;
    return getJSON<{ plans: ContentPlanItem[] }>(url);
  },
  createContentPlan: (body: Partial<ContentPlanItem>) =>
    postJSON<{ ok: boolean; id: string }>("/api/content-plans", body),
  updateContentPlan: (id: string, body: Partial<ContentPlanItem>) =>
    putJSON<{ ok: boolean }>(`/api/content-plans/${id}`, body),
  deleteContentPlan: (id: string) =>
    deleteJSON<{ ok: boolean }>(`/api/content-plans/${id}`),
  generateThemes: (personaId: string) =>
    postJSON<{ ok: boolean; themes: ThemeIdea[] }>("/api/content-plans/generate-themes", {
      persona_id: personaId,
    }),
  generateRoadmap: (body: {
    persona_id: string;
    theme: string;
    duration_days: number;
    formats?: ContentFormat[];
    save_to_db?: boolean;
  }) =>
    postJSON<{ ok: boolean; count: number; roadmap: ContentPlanItem[] }>(
      "/api/content-plans/generate-roadmap",
      body
    ),
  sendToStudio: (planId: string) =>
    postJSON<{
      ok: boolean;
      targetUrl: string;
      payload: ContentPlanItem;
    }>(`/api/content-plans/${planId}/send-to-studio`),

  // Settings & Integrations
  getIntegrations: () =>
    getJSON<{
      integrations: IntegrationStatus[];
      preferences: SchedulePreferences;
    }>("/api/settings/integrations"),
  saveIntegration: (service: string, keyOrToken: string, extraConfig?: Record<string, string>) =>
    postJSON<{ ok: boolean; configured: boolean }>("/api/settings/integrations", {
      service,
      key_or_token: keyOrToken,
      extra_config: extraConfig,
    }),
  testConnection: (service: string, keyOrToken?: string) =>
    postJSON<ConnectionTestResult>("/api/settings/test-connection", {
      service,
      key_or_token: keyOrToken,
    }),
  saveSchedulePreferences: (body: SchedulePreferences) =>
    postJSON<{ ok: boolean }>("/api/settings/schedule-preferences", {
      default_posting_time: body.defaultPostingTime,
      auto_retry_failed: body.autoRetryFailed,
    }),

  // Mode A: Carousel Studio
  carouselGenerate: (body: {
    topic: string;
    audience: string;
    goal: string;
    tone: string;
    slideCount: number;
  }) => postJSON<{ title: string; slides: CarouselSlide[] }>("/carousel/generate", body),
  carouselRender: (body: CarouselPayload) => postJSON<CarouselRender>("/carousel/render", body),
  carouselProjects: () => getJSON<{ projects: CarouselProject[] }>("/carousel/projects"),
  carouselCreateProject: (body: CarouselPayload) =>
    postJSON<CarouselProject>("/carousel/projects", body),
  carouselUpdateProject: (id: string, body: CarouselPayload) =>
    putJSON<CarouselProject>(`/carousel/projects/${id}`, body),
  carouselRenderProject: (id: string) =>
    postJSON<CarouselProject>(`/carousel/projects/${id}/render`, {}),
  carouselDeleteProject: (id: string) => deleteJSON(`/carousel/projects/${id}`),

  // Mode B: Podcast Clip Studio
  transcript: (body: { url: string; langs?: string[] }) =>
    postJSON<TranscriptResponse>("/transcript", body),
  getTranscript: (url: string, langs?: string[]) =>
    postJSON<TranscriptResponse>("/transcript", { url, langs }),
  analyze: (body: {
    topic?: string;
    segments?: TranscriptSegment[];
    transcript?: string;
    maxSegments?: number;
  }) => postJSON<{ segments: ViralSegment[] }>("/ai/analyze-transcript", body),
  analyzeViral: (transcript: string) =>
    postJSON<{ viralSegments: ViralSegment[] }>("/ai/viral-moments", { transcript }),
  generateHooks: (transcript: string, title?: string) =>
    postJSON<HooksResponse>("/ai/hooks-captions", { transcript, title }),
  hooks: (body: { topic: string; style?: string }) =>
    postJSON<HooksResponse>("/ai/hooks-captions", body),
  clipsAsync: (body: unknown) => postJSON<{ job: string; status: string }>("/clips-async", body),
  clipsSync: (body: unknown) => postJSON<{ job: string; clips: ClipResult[] }>("/clips", body),
  clipsStatus: (job: string) =>
    getJSON<{ job: string; status: string; clips: ClipResult[]; error?: string }>(
      `/clips/status/${job}`
    ),
  generateClips: (
    url: string,
    clips: Array<{ id: string; start: number; end: number; title: string }>,
    burnSubtitle = true
  ) => postJSON<{ clips: ClipResult[] }>("/clips", { url, clips, burnSubtitle }),

  // Mode C: Remake & Lipsync
  remakeUpload: (kind: "video" | "photo" | "audio", file: File) => {
    const body = new FormData();
    body.append("kind", kind);
    body.append("file", file);
    return uploadForm<MediaAsset>("/remake/upload", body);
  },
  remakeAssets: () => getJSON<{ assets: MediaAsset[] }>("/remake/assets"),
  remakeDeleteAsset: (id: string) => deleteJSON(`/remake/assets/${id}`),
  museTalkStatus: () =>
    getJSON<Record<string, unknown> & { ready: boolean }>("/remake/musetalk-status"),
  remakeStart: (body: {
    mediaId: string;
    audioId: string;
    mode: "overlay" | "lipsync";
    aspectRatio: string;
    subtitleText: string;
    subtitleStyle: string;
    consentConfirmed: boolean;
  }) => postJSON<RemakeJob>("/remake/jobs", body),
  remakeStatus: (job: string) => getJSON<RemakeJob>(`/remake/jobs/${job}`),

  // Admin Panel
  adminOverview: () => getJSON<AdminOverview>("/admin/overview"),
  adminPlans: () => getJSON<{ plans: AdminPlan[] }>("/admin/plans"),
  adminCreatePlan: (body: unknown) => postJSON<AdminPlan>("/admin/plans", body),
  adminUpdatePlan: (id: string, body: unknown) => putJSON<AdminPlan>(`/admin/plans/${id}`, body),
  adminDeletePlan: (id: string) => deleteJSON(`/admin/plans/${id}`),
  adminSettings: () => getJSON<{ settings: AdminSetting[] }>("/admin/settings"),
  adminUpdateSetting: (key: string, body: { value: string; clear?: boolean }) =>
    putJSON<AdminSetting>(`/admin/settings/${key}`, body),
  adminMenus: () => getJSON<{ menus: StudioMenu[] }>("/admin/menus"),
  adminCreateMenu: (body: unknown) => postJSON<StudioMenu>("/admin/menus", body),
  adminUpdateMenu: (id: string, body: unknown) => putJSON<StudioMenu>(`/admin/menus/${id}`, body),
  adminDeleteMenu: (id: string) => deleteJSON(`/admin/menus/${id}`),
  adminUsers: (q = "", page = 1, limit = 25) =>
    getJSON<{ users: AdminUser[]; total: number; page?: number; limit?: number; totalPages?: number }>(
      `/admin/users?page=${page}&limit=${limit}&search=${encodeURIComponent(q)}`
    ),
  adminUpdateUser: (id: string, body: unknown) => putJSON<AdminUser>(`/admin/users/${id}`, body),
  mediaUrl,
};
