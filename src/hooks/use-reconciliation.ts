import { useQuery } from "@tanstack/react-query";

import { DEFAULT_POLL_INTERVAL_MS } from "@/config/query";
import { getReconciliationSummary } from "@/lib/api/endpoints";
import { queryKeys } from "@/lib/query-keys";
import type { ReconciliationParams } from "@/types/api";

export function useReconciliationSummary(params: ReconciliationParams = {}) {
  return useQuery({
    queryKey: queryKeys.reconciliation(params),
    queryFn: () => getReconciliationSummary(params),
    refetchInterval: DEFAULT_POLL_INTERVAL_MS,
  });
}
