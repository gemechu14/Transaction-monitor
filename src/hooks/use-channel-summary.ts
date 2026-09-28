import { useQuery } from "@tanstack/react-query";

import { DEFAULT_POLL_INTERVAL_MS } from "@/config/query";
import { getChannelSummary } from "@/lib/api/endpoints";
import { queryKeys } from "@/lib/query-keys";
import type { ChannelSummaryParams } from "@/types/api";

export function useChannelSummary(params: ChannelSummaryParams = {}) {
  return useQuery({
    queryKey: queryKeys.channelSummary(params),
    queryFn: () => getChannelSummary(params),
    refetchInterval: DEFAULT_POLL_INTERVAL_MS,
  });
}
