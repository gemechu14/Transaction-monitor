import { useQuery } from "@tanstack/react-query";

import { DEFAULT_POLL_INTERVAL_MS } from "@/config/query";
import { getOverviewDataset } from "@/lib/api/endpoints";
import { queryKeys } from "@/lib/query-keys";

/** The Overview page's month of channel figures; filters are applied client-side. */
export function useOverviewDataset() {
  return useQuery({
    queryKey: queryKeys.overviewDataset(),
    queryFn: getOverviewDataset,
    refetchInterval: DEFAULT_POLL_INTERVAL_MS,
  });
}
