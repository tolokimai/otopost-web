"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

import { api, setAuthToken, type UserOut } from "./api";

const TOKEN_KEY = "otopost_token";

type AuthState = {
  user: UserOut | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name?: string) => Promise<void>;
  logout: () => void;
  refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

function storeToken(token: string | null): void {
  if (typeof window === "undefined") return;
  if (token) window.localStorage.setItem(TOKEN_KEY, token);
  else window.localStorage.removeItem(TOKEN_KEY);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserOut | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const token =
      typeof window !== "undefined" ? window.localStorage.getItem(TOKEN_KEY) : null;
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }
    setAuthToken(token);
    try {
      const me = await api.me();
      setUser(me);
    } catch {
      storeToken(null);
      setAuthToken(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const login = useCallback(async (email: string, password: string) => {
    const res = await api.login({ email, password });
    storeToken(res.accessToken);
    setAuthToken(res.accessToken);
    setUser(res.user);
  }, []);

  const register = useCallback(
    async (email: string, password: string, name?: string) => {
      const res = await api.register({ email, password, name });
      storeToken(res.accessToken);
      setAuthToken(res.accessToken);
      setUser(res.user);
    },
    [],
  );

  const logout = useCallback(() => {
    storeToken(null);
    setAuthToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth harus dipakai di dalam AuthProvider");
  return ctx;
}
