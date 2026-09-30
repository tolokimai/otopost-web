import type { AdminOverview, AdminPlan, AdminSetting, AdminUser, StudioMenu } from "../types";
import { http } from "../http/client";

export const adminApi = {
  adminOverview: () => http.get<AdminOverview>("/admin/overview"),
  adminPlans: () => http.get<{ plans: AdminPlan[] }>("/admin/plans"),
  adminCreatePlan: (body: unknown) => http.post<AdminPlan>("/admin/plans", body),
  adminUpdatePlan: (id: string, body: unknown) => http.put<AdminPlan>(`/admin/plans/${id}`, body),
  adminDeletePlan: (id: string) => http.delete<void>(`/admin/plans/${id}`),
  adminSettings: () => http.get<{ settings: AdminSetting[] }>("/admin/settings"),
  adminUpdateSetting: (key: string, body: { value: string; clear?: boolean }) =>
    http.put<AdminSetting>(`/admin/settings/${key}`, body),
  adminMenus: () => http.get<{ menus: StudioMenu[] }>("/admin/menus"),
  adminCreateMenu: (body: unknown) => http.post<StudioMenu>("/admin/menus", body),
  adminUpdateMenu: (id: string, body: unknown) => http.put<StudioMenu>(`/admin/menus/${id}`, body),
  adminDeleteMenu: (id: string) => http.delete<void>(`/admin/menus/${id}`),
  adminUsers: (q = "", page = 1, limit = 25) =>
    http.get<{ users: AdminUser[]; total: number; page?: number; limit?: number; totalPages?: number }>(
      `/admin/users?page=${page}&limit=${limit}&search=${encodeURIComponent(q)}`,
    ),
  adminUpdateUser: (id: string, body: unknown) => http.put<AdminUser>(`/admin/users/${id}`, body),
};
