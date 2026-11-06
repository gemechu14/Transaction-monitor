import { useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { WSO2_SOURCE_DESCRIPTIONS, type Wso2Source } from "@/config/wso2-sources";
import { listChannelInfo, updateChannelInfo } from "@/lib/api/channels";
import type { UpdateChannelInfoPayload } from "@/types/channels";

const CHANNEL_INFO_QUERY_KEY = ["channel-info"] as const;

/**
 * Saved channel details, keyed by source id. `fresh` refetches every time the
 * component mounts (for the Settings editor); hover text reuses a recent copy.
 */
export function useChannelInfo({ fresh = false }: { fresh?: boolean } = {}) {
  return useQuery({
    queryKey: CHANNEL_INFO_QUERY_KEY,
    queryFn: async () => {
      const { channels } = await listChannelInfo();
      return Object.fromEntries(channels.map((c) => [c.source, c]));
    },
    staleTime: 60_000,
    refetchOnMount: fresh ? "always" : true,
  });
}

/**
 * A source's description for hover text: the admin-saved one, else the built-in
 * one from `WSO2_SOURCE_DESCRIPTIONS` (also while loading or if the call fails).
 */
export function useSourceDescription() {
  const { data } = useChannelInfo();
  return useCallback(
    (source: Wso2Source) => data?.[source]?.description || WSO2_SOURCE_DESCRIPTIONS[source],
    [data],
  );
}

export function useUpdateChannelInfo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ source, payload }: { source: string; payload: UpdateChannelInfoPayload }) =>
      updateChannelInfo(source, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CHANNEL_INFO_QUERY_KEY });
    },
  });
}
