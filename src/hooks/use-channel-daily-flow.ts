import { useQuery } from "@tanstack/react-query";

import { DEFAULT_POLL_INTERVAL_MS } from "@/config/query";
import { getChannelDailyFlow } from "@/lib/api/endpoints";
import { queryKeys } from "@/lib/query-keys";
import type { ChannelDailyFlowParams } from "@/types/api";

export function useChannelDailyFlow(params: ChannelDailyFlowParams = {}) {
  return useQuery({
    queryKey: queryKeys.channelDailyFlow(params),
    queryFn: () => getChannelDailyFlow(params),
    refetchInterval: DEFAULT_POLL_INTERVAL_MS,
  });
}
