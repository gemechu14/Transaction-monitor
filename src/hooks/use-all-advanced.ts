import { useQuery } from "@tanstack/react-query";

import { DEFAULT_POLL_INTERVAL_MS } from "@/config/query";
import { getAllAdvanced } from "@/lib/api/dashboard";
import { queryKeys } from "@/lib/query-keys";
import type { AllAdvancedParams } from "@/types/api";

/** Live per-source transaction counts and amounts from WSO2 over a date range. */
export function useAllAdvanced(params: AllAdvancedParams) {
  return useQuery({
    queryKey: queryKeys.allAdvanced(params),
    queryFn: () => getAllAdvanced(params),
    refetchInterval: DEFAULT_POLL_INTERVAL_MS,
  });
}
