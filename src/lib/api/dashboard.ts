import { AUTH_API_BASE_URL } from "@/lib/api/auth-client";
import { ApiError } from "@/lib/api/client";
import type { AllAdvancedParams, AllAdvancedTotals } from "@/types/api";

/**
 * TM backend route that relays WSO2's `/wso2Dashboard/allAdvanced`. WSO2 is never
 * called from the browser (see ADVANCED_API.md); change this if the backend
 * mounts the route elsewhere.
 */
export const ALL_ADVANCED_PATH = "/api/dashboard/all-advanced";

/** Per-source live totals from WSO2. Needs the session cookie like the auth calls. */
export async function getAllAdvanced(params: AllAdvancedParams): Promise<AllAdvancedTotals> {
  const search = new URLSearchParams({
    startDate: params.startDate,
    endDate: params.endDate,
    source: "all",
  });
  const url = `${AUTH_API_BASE_URL}${ALL_ADVANCED_PATH}?${search}`;

  const response = await fetch(url, {
    credentials: "include",
    cache: "no-store",
    headers: { Accept: "application/json" },
  });
  const body = await response.json().catch(() => null);

  if (!response.ok || !body?.success) {
    throw new ApiError(
      body?.error?.details ?? body?.message ?? `Request failed with status ${response.status}`,
      response.status,
      url,
    );
  }
  return body.data as AllAdvancedTotals;
}
