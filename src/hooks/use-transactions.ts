import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { DEFAULT_POLL_INTERVAL_MS } from "@/config/query";
import { getTransactions } from "@/lib/api/endpoints";
import { queryKeys } from "@/lib/query-keys";
import type { TransactionListParams } from "@/types/api";

export function useTransactions(params: TransactionListParams = {}) {
  return useQuery({
    queryKey: queryKeys.transactions(params),
    queryFn: () => getTransactions(params),
    placeholderData: keepPreviousData,
    refetchInterval: DEFAULT_POLL_INTERVAL_MS,
  });
}
