import { AUTH_API_BASE_URL } from "@/lib/api/auth-client";
import { ApiError } from "@/lib/api/client";
// Dummy data, for working without the backend: uncomment this import and the two
// lines at the top of `getAllAdvanced`.
// import { generateMockAllAdvanced } from "@/lib/mock/all-advanced-data";
// import { mockDelay } from "@/lib/mock/overview-data";
import type {
  AllAdvancedParams,
  AllAdvancedTotals,
  DailyTransactionParams,
  DailyTransactionTotals,
} from "@/types/api";

/**
 * TM backend route that relays WSO2's `/wso2DashboardAPI/allAdvanced`. WSO2 is never
 * called from the browser (see ADVANCED_API.md); change this if the backend
 * mounts the route elsewhere.
 */
export const ALL_ADVANCED_PATH = "/api/dashboard/all-advanced";

/** Per-source live totals from WSO2. Needs the session cookie like the auth calls. */
export async function getAllAdvanced(params: AllAdvancedParams): Promise<AllAdvancedTotals> {
  // Dummy data instead of the live call:
  // await mockDelay();
  // return generateMockAllAdvanced(params);

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

/** TM backend route for per-day totals, relayed from WSO2 like `ALL_ADVANCED_PATH`. */
export const DAILY_TRANSACTION_PATH = "/api/dashboard/daily-transaction";

/** Per-day live totals for one source (or all). Needs the session cookie like `getAllAdvanced`. */
export async function getDailyTransaction(params: DailyTransactionParams): Promise<DailyTransactionTotals> {
  const search = new URLSearchParams({
    startDate: params.startDate,
    endDate: params.endDate,
    source: params.source ?? "all",
  });
  const url = `${AUTH_API_BASE_URL}${DAILY_TRANSACTION_PATH}?${search}`;

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
  return body.data as DailyTransactionTotals;
}
