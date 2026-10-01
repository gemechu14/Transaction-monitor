import type {
  AnomalyParams,
  ChannelDailyFlowParams,
  ChannelSummaryParams,
  KpiParams,
  PeakLoadParams,
  PeriodSnapshotParams,
  ReconciliationParams,
  TransactionListParams,
  TransactionTrendParams,
} from "@/types/api";

export const queryKeys = {
  kpis: (params: KpiParams = {}) => ["kpis", params] as const,
  transactionTrends: (params: TransactionTrendParams = {}) =>
    ["transaction-trends", params] as const,
  channelSummary: (params: ChannelSummaryParams = {}) =>
    ["channel-summary", params] as const,
  peakLoad: (params: PeakLoadParams = {}) => ["peak-load", params] as const,
  transactions: (params: TransactionListParams = {}) =>
    ["transactions", params] as const,
  anomalies: (params: AnomalyParams = {}) => ["anomalies", params] as const,
  reconciliation: (params: ReconciliationParams = {}) =>
    ["reconciliation", params] as const,
  channelDailyFlow: (params: ChannelDailyFlowParams = {}) =>
    ["channel-daily-flow", params] as const,
  overviewDataset: () => ["overview-dataset"] as const,
  periodSnapshot: (params: PeriodSnapshotParams = {}) =>
    ["period-snapshot", params] as const,
};
