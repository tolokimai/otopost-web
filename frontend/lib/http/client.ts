const API_BASE = (
  process.env.NEXT_PUBLIC_API_BASE || "http://localhost:5000"
).replace(/\/+$/, "");

const TOKEN_KEY = "otopost_token";

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly code = "API_ERROR",
    public readonly status = 400,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export function setAuthToken(token: string | null): void {
  if (typeof window === "undefined") return;
  if (token) window.localStorage.setItem(TOKEN_KEY, token);
  else window.localStorage.removeItem(TOKEN_KEY);
}

export function getAuthToken(): string | null {
  return typeof window === "undefined" ? null : window.localStorage.getItem(TOKEN_KEY);
}

export const getToken = getAuthToken;

export function mediaUrl(pathOrUrl?: string | null): string {
  if (!pathOrUrl) return "";
  if (/^https?:\/\//.test(pathOrUrl)) return pathOrUrl;
  return `${API_BASE}${pathOrUrl.startsWith("/") ? pathOrUrl : `/${pathOrUrl}`}`;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getAuthToken();
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      Accept: "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });
  const isJson = (response.headers.get("content-type") || "").includes("application/json");
  const payload = isJson ? await response.json().catch(() => null) : null;
  if (!response.ok) {
    const error = payload?.error;
    throw new ApiError(
      error?.message || payload?.detail || `HTTP ${response.status}`,
      error?.code || `HTTP_${response.status}`,
      response.status,
      error?.details,
    );
  }
  if (payload && typeof payload === "object" && "success" in payload && "data" in payload) {
    return payload.data as T;
  }
  return payload as T;
}

export const http = {
  get: <T>(path: string) => request<T>(path, { method: "GET" }),
  post: <T>(path: string, body?: unknown) => request<T>(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  }),
  put: <T>(path: string, body?: unknown) => request<T>(path, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  }),
  patch: <T>(path: string, body?: unknown) => request<T>(path, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  }),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
  upload: <T>(path: string, body: FormData) => request<T>(path, { method: "POST", body }),
};
