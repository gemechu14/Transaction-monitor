import { useQuery } from "@tanstack/react-query";

import { DEFAULT_POLL_INTERVAL_MS } from "@/config/query";
import { getAnomalies } from "@/lib/api/endpoints";
import { queryKeys } from "@/lib/query-keys";
import type { AnomalyParams } from "@/types/api";

export function useAnomalies(params: AnomalyParams = {}) {
  return useQuery({
    queryKey: queryKeys.anomalies(params),
    queryFn: () => getAnomalies(params),
    refetchInterval: DEFAULT_POLL_INTERVAL_MS,
  });
}
