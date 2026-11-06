import { IPS_PARTS, isPlaceholderSource } from "@/config/wso2-sources";
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
  SourceTotals,
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
  return mergeIps(body.data as Record<string, SourceTotals>);
}

/** Adds `a` and `b`, treating a missing side as zero. */
function addTotals(a: SourceTotals | undefined, b: SourceTotals | undefined): SourceTotals {
  return {
    totalTransactions: (a?.totalTransactions ?? 0) + (b?.totalTransactions ?? 0),
    totalAmount: (a?.totalAmount ?? 0) + (b?.totalAmount ?? 0),
  };
}

/** Replaces WSO2's separate IPS sources with one `ips` entry holding their sum. */
function mergeIps(data: Record<string, SourceTotals>): AllAdvancedTotals {
  const merged: Record<string, SourceTotals> = { ...data };
  if (IPS_PARTS.some((part) => part in data)) {
    merged.ips = IPS_PARTS.reduce((sum, part) => addTotals(sum, data[part]), addTotals(undefined, undefined));
  }
  for (const part of IPS_PARTS) delete merged[part];
  return merged as AllAdvancedTotals;
}

/** TM backend route for per-day totals, relayed from WSO2 like `ALL_ADVANCED_PATH`. */
export const DAILY_TRANSACTION_PATH = "/api/dashboard/daily-transaction";

/** Per-day live totals for one source (or all). Needs the session cookie like `getAllAdvanced`. */
export async function getDailyTransaction(params: DailyTransactionParams): Promise<DailyTransactionTotals> {
  // Frontend-only channels: no days means every day counts as 0.
  if (params.source && isPlaceholderSource(params.source)) return {};

  // IPS is two WSO2 sources: fetch both and add them up day by day.
  if (params.source === "ips") {
    const parts = await Promise.all(IPS_PARTS.map((part) => fetchDailyTransaction(params, part)));
    const merged: DailyTransactionTotals = {};
    for (const part of parts) {
      for (const [day, totals] of Object.entries(part)) merged[day] = addTotals(merged[day], totals);
    }
    return merged;
  }

  return fetchDailyTransaction(params, params.source ?? "all");
}

async function fetchDailyTransaction(params: DailyTransactionParams, source: string): Promise<DailyTransactionTotals> {
  const search = new URLSearchParams({
    startDate: params.startDate,
    endDate: params.endDate,
    source,
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
