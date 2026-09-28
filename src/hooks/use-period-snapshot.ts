import { useQuery } from "@tanstack/react-query";

import { DEFAULT_POLL_INTERVAL_MS } from "@/config/query";
import { getPeriodSnapshot } from "@/lib/api/endpoints";
import { queryKeys } from "@/lib/query-keys";
import type { PeriodSnapshotParams } from "@/types/api";

export function usePeriodSnapshot(params: PeriodSnapshotParams = {}) {
  return useQuery({
    queryKey: queryKeys.periodSnapshot(params),
    queryFn: () => getPeriodSnapshot(params),
    refetchInterval: DEFAULT_POLL_INTERVAL_MS,
  });
}
