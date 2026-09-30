import type { CheckoutResponse, Order, OrdersResponse, Plan, StudioMenu } from "../types";
import { http } from "../http/client";

export const billingApi = {
  getPlans: () => http.get<{ plans: Plan[]; provider?: string }>("/billing/plans"),
  checkout: (body: { plan: string; provider?: string }) =>
    http.post<CheckoutResponse>("/billing/checkout", body),
  simulatePay: (orderId: string) =>
    http.post<Order>(`/billing/orders/${orderId}/simulate`),
  getOrders: () => http.get<OrdersResponse>("/billing/orders"),
  getOrder: (orderId: string) => http.get<Order>(`/billing/orders/${orderId}`),
  getStudioMenus: () => http.get<{ menus: StudioMenu[] }>("/config/studio-menus"),
};
