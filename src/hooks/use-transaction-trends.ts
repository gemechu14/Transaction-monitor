import { useQuery } from "@tanstack/react-query";

import { DEFAULT_POLL_INTERVAL_MS } from "@/config/query";
import { getTransactionTrends } from "@/lib/api/endpoints";
import { queryKeys } from "@/lib/query-keys";
import type { TransactionTrendParams } from "@/types/api";

export function useTransactionTrends(params: TransactionTrendParams = {}) {
  return useQuery({
    queryKey: queryKeys.transactionTrends(params),
    queryFn: () => getTransactionTrends(params),
    refetchInterval: DEFAULT_POLL_INTERVAL_MS,
  });
}
