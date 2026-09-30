import type { CredentialsStatus, TokenResponse, UserOut } from "../types";
import { http } from "../http/client";

export const authApi = {
  register: (
    reqOrEmail: { email: string; password: string; name?: string } | string,
    password?: string,
    name?: string,
  ) => http.post<TokenResponse>("/auth/register", typeof reqOrEmail === "object"
    ? reqOrEmail : { email: reqOrEmail, password: password || "", name }),
  login: (
    reqOrEmail: { email: string; password: string } | string,
    password?: string,
  ) => http.post<TokenResponse>("/auth/login", typeof reqOrEmail === "object"
    ? reqOrEmail : { email: reqOrEmail, password: password || "" }),
  me: () => http.get<UserOut>("/auth/me"),
  getCredentials: () => http.get<CredentialsStatus>("/auth/credentials"),
  putCredential: (body: { provider: string; value: string }) =>
    http.put<{ provider: string; configured: boolean }>("/auth/credentials", body),
};
