import type { ConnectionTestResult, IntegrationStatus, SchedulePreferences } from "../types";
import { http } from "../http/client";

export const settingsApi = {
  getIntegrations: () => http.get<{
    integrations: IntegrationStatus[];
    preferences: SchedulePreferences;
  }>("/api/settings/integrations"),
  saveIntegration: (
    service: string,
    keyOrToken: string,
    extraConfig?: Record<string, string>,
  ) => http.post<{ ok: boolean; configured: boolean }>("/api/settings/integrations", {
    service,
    key_or_token: keyOrToken,
    extra_config: extraConfig,
  }),
  testConnection: (service: string, keyOrToken?: string) =>
    http.post<ConnectionTestResult>("/api/settings/test-connection", {
      service,
      key_or_token: keyOrToken,
    }),
  saveSchedulePreferences: (body: SchedulePreferences) =>
    http.post<{ ok: boolean }>("/api/settings/schedule-preferences", {
      default_posting_time: body.defaultPostingTime,
      auto_retry_failed: body.autoRetryFailed,
    }),
};
