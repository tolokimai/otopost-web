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
  mediaUrl,
};
