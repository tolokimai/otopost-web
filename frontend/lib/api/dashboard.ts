import type { DashboardStats, PostingLog, TimelineItem } from "../types";
import { http } from "../http/client";

export const dashboardApi = {
  getDashboardStats: () => http.get<DashboardStats>("/api/dashboard/stats"),
  getTimeline: (days = 7, platform?: string, statusFilter?: string) => {
    const params = new URLSearchParams({ days: String(days) });
    if (platform) params.set("platform", platform);
    if (statusFilter) params.set("status_filter", statusFilter);
    return http.get<{ timeline: TimelineItem[] }>(`/api/dashboard/timeline?${params}`);
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
  }) => http.post<{ ok: boolean; id: string }>("/api/dashboard/posts", body),
  postNow: (postId: string) =>
    http.post<{ ok: boolean; status: string; postedAt: string }>(
      `/api/dashboard/posts/${postId}/post-now`,
    ),
  updatePost: (postId: string, body: Partial<TimelineItem>) =>
    http.patch<{ ok: boolean }>(`/api/dashboard/posts/${postId}`, body),
  deletePost: (postId: string) =>
    http.delete<{ ok: boolean }>(`/api/dashboard/posts/${postId}`),
  retryPost: (postId: string) =>
    http.post<{ ok: boolean; status: string }>(`/api/dashboard/posts/${postId}/retry`),
  getPostingLogs: (limit = 50) =>
    http.get<{ logs: PostingLog[] }>(`/api/dashboard/logs?limit=${limit}`),
};
