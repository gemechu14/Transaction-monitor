import { useQuery } from "@tanstack/react-query";

import { DEFAULT_POLL_INTERVAL_MS } from "@/config/query";
import { getKpis } from "@/lib/api/endpoints";
import { queryKeys } from "@/lib/query-keys";
import type { KpiParams } from "@/types/api";

export function useKpis(params: KpiParams = {}) {
  return useQuery({
    queryKey: queryKeys.kpis(params),
    queryFn: () => getKpis(params),
    refetchInterval: DEFAULT_POLL_INTERVAL_MS,
  });
}
