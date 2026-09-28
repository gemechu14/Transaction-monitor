import { useQuery } from "@tanstack/react-query";

import { DEFAULT_POLL_INTERVAL_MS } from "@/config/query";
import { getPeakLoadHeatmap } from "@/lib/api/endpoints";
import { queryKeys } from "@/lib/query-keys";
import type { PeakLoadParams } from "@/types/api";

export function usePeakLoadHeatmap(params: PeakLoadParams = {}) {
  return useQuery({
    queryKey: queryKeys.peakLoad(params),
    queryFn: () => getPeakLoadHeatmap(params),
    refetchInterval: DEFAULT_POLL_INTERVAL_MS,
  });
}
