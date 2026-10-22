import { useQuery } from "@tanstack/react-query";

import { DEFAULT_POLL_INTERVAL_MS } from "@/config/query";
import { getDailyTransaction } from "@/lib/api/dashboard";
import { queryKeys } from "@/lib/query-keys";
import type { DailyTransactionParams } from "@/types/api";

/** Live per-day transaction counts and amounts from WSO2 over a date range. */
export function useDailyTransaction(params: DailyTransactionParams, options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: queryKeys.dailyTransaction(params),
    queryFn: () => getDailyTransaction(params),
    refetchInterval: DEFAULT_POLL_INTERVAL_MS,
    enabled: options.enabled,
  });
}
