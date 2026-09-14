export type TranscriptSegment = { startSec: number; text: string };

export type TranscriptResponse = {
  videoId?: string | null;
  title?: string | null;
  channelName?: string | null;
  durationSec?: number | null;
  hasTranscript: boolean;
  transcriptText: string;
  segments: TranscriptSegment[];
};

export type ViralSegment = {
  startSec: number;
  endSec: number;
  durationFormatted: string;
  title: string;
  hook: string;
  reasonWhyViral: string;
  transcriptSnippet: string;
};

export type ClipResult = {
  index: number;
  title: string;
  startSec: number;
  endSec: number;
  reframed: boolean;
  subtitled: boolean;
  downloadUrl: string;
};

export type HooksResponse = {
  viralHook: string;
  caption: string;
  hashtags: string;
  subtitles: string[];
};

export type UserOut = {
  id: string;
  email: string;
  name: string;
  plan: string;
  credits: number;
  planExpiresAt?: string | null;
  isAdmin: boolean;
};

export type TokenResponse = {
  accessToken: string;
  tokenType: string;
  user: UserOut;
};

export type ProviderStatus = { provider: string; configured: boolean };
export type CredentialsStatus = { providers: ProviderStatus[] };

export type Plan = {
  id: string;
  name: string;
  price: number;
  credits: number;
  durationDays?: number;
  features: string[];
  purchasable: boolean;
  highlight: boolean;
};

export type PlansResponse = { plans: Plan[]; currency: string; provider: string };

export type CheckoutResponse = {
  orderId: string;
  redirectUrl: string;
  provider: string;
  simulate: boolean;
  token: string;
};

export type Order = {
  orderId: string;
  plan: string;
  amount: number;
  currency: string;
  status: string;
  creditsGranted: number;
  createdAt?: string | null;
  paidAt?: string | null;
};

export type OrdersResponse = { orders: Order[] };

export type StudioMenu = {
  id: string;
  label: string;
  description: string;
  icon: string;
  href: string;
  isEnabled: boolean;
  isReady: boolean;
  requiredPlan: string;
  sortOrder: number;
};

export type CarouselSlide = {
  headline: string;
  body: string;
  subtext: string;
  imageBase64?: string | null;
};

export type CarouselDesign = {
  aspectRatio: string;
  backgroundTheme: string;
  typographyStyle: string;
  fontFamily: string;
  textColorHex: string;
  accentColorHex: string;
  baseFontScale: number;
  textEffect: string;
  ctaText: string;
  watermarkText: string;
  showPageNumber: boolean;
  showSwipe: boolean;
  logoBase64?: string | null;
};

export type CarouselPayload = { title: string; slides: CarouselSlide[]; design: CarouselDesign };
export type CarouselRender = { job: string; images: string[]; zipUrl: string };
export type CarouselProject = {
  id: string;
  title: string;
  status: string;
  payload: CarouselPayload;
  output: CarouselRender | Record<string, never>;
  createdAt?: string | null;
  updatedAt?: string | null;
};

export type MediaAsset = {
  id: string;
  kind: "video" | "photo" | "audio";
  name: string;
  contentType: string;
  sizeBytes: number;
  url: string;
  createdAt?: string | null;
};

export type RemakeJob = {
  job: string;
  status: string;
  mode: string;
  progress: number;
  downloadUrl: string;
  error: string;
  lipsyncApplied: boolean;
};

export type AdminPlan = Plan & { isActive: boolean; sortOrder: number };
export type AdminSetting = {
  key: string;
  value: string;
  valueType: string;
  category: string;
  label: string;
  description: string;
  isSecret: boolean;
  hasValue: boolean;
};
export type AdminUser = {
  id: string;
  email: string;
  name: string;
  plan: string;
  credits: number;
  planExpiresAt?: string | null;
  isActive: boolean;
  isAdmin: boolean;
  createdAt?: string | null;
};
export type AdminOverview = {
  users: number;
  activeUsers: number;
  paidUsers: number;
  orders: number;
  paidOrders: number;
  revenue: number;
  plans: number;
  menusEnabled: number;
};

const BASE = (process.env.NEXT_PUBLIC_API_BASE || "").replace(/\/$/, "");
const TOKEN_KEY = "otopost_token";

let authToken: string | null = null;

export function setAuthToken(token: string | null): void {
  authToken = token;
}

export function getToken(): string | null {
  if (authToken) return authToken;
  if (typeof window !== "undefined") return window.localStorage.getItem(TOKEN_KEY);
  return null;
}

function apiUrl(path: string): string {
  return `${BASE}${path}`;
}

export function mediaUrl(u: string): string {
  if (!u) return "";
  if (/^https?:\/\//.test(u)) return u;
  return apiUrl(u);
}

function authHeaders(): Record<string, string> {
  const t = getToken();
  return t ? { Authorization: `Bearer ${t}` } : {};
}

async function parseError(res: Response): Promise<string> {
  try {
    const data = (await res.json()) as { detail?: string };
    return data.detail || "";
  } catch {
    return "";
  }
}

async function postJSON<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(apiUrl(path), {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const detail = await parseError(res);
    throw new Error(`HTTP ${res.status}${detail ? ": " + detail : ""}`);
  }
  return (await res.json()) as T;
}

async function getJSON<T>(path: string): Promise<T> {
  const res = await fetch(apiUrl(path), { headers: { ...authHeaders() } });
  if (!res.ok) {
    const detail = await parseError(res);
    throw new Error(`HTTP ${res.status}${detail ? ": " + detail : ""}`);
  }
  return (await res.json()) as T;
}

async function putJSON<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(apiUrl(path), {
    method: "PUT",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const detail = await parseError(res);
    throw new Error(`HTTP ${res.status}${detail ? ": " + detail : ""}`);
  }
  return (await res.json()) as T;
}

async function deleteJSON(path: string): Promise<void> {
  const res = await fetch(apiUrl(path), { method: "DELETE", headers: { ...authHeaders() } });
  if (!res.ok) {
    const detail = await parseError(res);
    throw new Error(`HTTP ${res.status}${detail ? ": " + detail : ""}`);
  }
}

async function uploadForm<T>(path: string, body: FormData): Promise<T> {
  const res = await fetch(apiUrl(path), {
    method: "POST",
    headers: { ...authHeaders() },
    body,
  });
  if (!res.ok) {
    const detail = await parseError(res);
    throw new Error(`HTTP ${res.status}${detail ? ": " + detail : ""}`);
  }
  return (await res.json()) as T;
}

export const api = {
  transcript: (body: { url: string; langs?: string[] }) =>
    postJSON<TranscriptResponse>("/transcript", body),
  analyze: (body: {
    topic?: string;
    segments?: TranscriptSegment[];
    transcript?: string;
    maxSegments?: number;
  }) => postJSON<{ segments: ViralSegment[] }>("/ai/analyze-transcript", body),
  clipsAsync: (body: unknown) => postJSON<{ job: string; status: string }>("/clips-async", body),
  clipsSync: (body: unknown) => postJSON<{ job: string; clips: ClipResult[] }>("/clips", body),
  clipsStatus: (job: string) =>
    getJSON<{ job: string; status: string; clips: ClipResult[]; error?: string }>(
      `/clips/status/${job}`,
    ),
  hooks: (body: { topic: string; style?: string }) =>
    postJSON<HooksResponse>("/ai/hooks-captions", body),
  register: (body: { email: string; password: string; name?: string }) =>
    postJSON<TokenResponse>("/auth/register", body),
  login: (body: { email: string; password: string }) =>
    postJSON<TokenResponse>("/auth/login", body),
  me: () => getJSON<UserOut>("/auth/me"),
  getCredentials: () => getJSON<CredentialsStatus>("/auth/credentials"),
  putCredential: (body: { provider: string; value: string }) =>
    putJSON<ProviderStatus>("/auth/credentials", body),
  getPlans: () => getJSON<PlansResponse>("/billing/plans"),
  checkout: (body: { plan: string }) => postJSON<CheckoutResponse>("/billing/checkout", body),
  simulatePay: (orderId: string) => postJSON<Order>(`/billing/simulate/${orderId}/pay`, {}),
  getOrders: () => getJSON<OrdersResponse>("/billing/orders"),
  getOrder: (orderId: string) => getJSON<Order>(`/billing/orders/${orderId}`),
  getStudioMenus: () => getJSON<{ menus: StudioMenu[] }>("/config/studio-menus"),

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

  remakeUpload: (kind: "video" | "photo" | "audio", file: File) => {
    const body = new FormData();
    body.append("kind", kind);
    body.append("file", file);
    return uploadForm<MediaAsset>("/remake/upload", body);
  },
  remakeAssets: () => getJSON<{ assets: MediaAsset[] }>("/remake/assets"),
  remakeDeleteAsset: (id: string) => deleteJSON(`/remake/assets/${id}`),
  museTalkStatus: () => getJSON<Record<string, unknown> & { ready: boolean }>("/remake/musetalk-status"),
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
  adminUsers: (q = "") => getJSON<{ users: AdminUser[]; total: number }>(`/admin/users?q=${encodeURIComponent(q)}`),
  adminUpdateUser: (id: string, body: unknown) => putJSON<AdminUser>(`/admin/users/${id}`, body),
  mediaUrl,
};
