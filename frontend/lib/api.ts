import { adminApi } from "./api/admin";
import { authApi } from "./api/auth";
import { billingApi } from "./api/billing";
import { contentApi } from "./api/content";
import { dashboardApi } from "./api/dashboard";
import { settingsApi } from "./api/settings";
import { studioApi } from "./api/studio";
import { mediaUrl } from "./http/client";

export * from "./types";
export { ApiError, getAuthToken, mediaUrl, setAuthToken } from "./http/client";

export const api = {
  ...authApi,
  ...billingApi,
  ...dashboardApi,
  ...contentApi,
  ...settingsApi,
  ...studioApi,
  ...adminApi,
  mediaUrl,
};
