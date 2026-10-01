import { API_BASE_URL, apiFetch } from "@/lib/api/client";
import {
  generateMockChannelDailyFlow,
  generateMockChannelSummary,
  generateMockKpis,
  generateMockPeakLoad,
  generateMockPeriodSnapshot,
  generateMockReconciliation,
  generateMockTransactionTrends,
  mockDelay,
  resolveMockRange,
} from "@/lib/mock/overview-data";
import { OVERVIEW_SAMPLE } from "@/lib/mock/overview-sample";
import { queryMockTransactions } from "@/lib/mock/transactions-data";
import type {
  Anomaly,
  AnomalyParams,
  ChannelDailyFlow,
  ChannelDailyFlowParams,
  ChannelSummary,
  ChannelSummaryParams,
  Kpi,
  KpiParams,
  OverviewDataset,
  PaginatedResponse,
  PeakLoadParams,
  PeakLoadPoint,
  PeriodSnapshot,
  PeriodSnapshotParams,
  ReconciliationParams,
  ReconciliationSummary,
  Transaction,
  TransactionListParams,
  TransactionTrendParams,
  TransactionTrendPoint,
} from "@/types/api";

/**
 * Placeholder endpoint paths — swap these for the real WSO2 gateway routes.
 * Params are already wired through `apiFetch` as query string parameters.
 *
 * Until NEXT_PUBLIC_API_BASE_URL is set, these fall back to deterministic mock
 * data so the dashboard is fully explorable. Once the gateway URL is
 * configured, every function below automatically switches to real fetches.
 */
const USE_MOCK_DATA = !API_BASE_URL;

export async function getKpis(params: KpiParams = {}): Promise<Kpi[]> {
  if (USE_MOCK_DATA) {
    await mockDelay();
    return generateMockKpis(resolveMockRange(params), params.channel);
  }
  return apiFetch<Kpi[]>("/api/kpis", { params });
}

export async function getTransactionTrends(
  params: TransactionTrendParams = {},
): Promise<TransactionTrendPoint[]> {
  if (USE_MOCK_DATA) {
    await mockDelay();
    return generateMockTransactionTrends(resolveMockRange(params), params.channel);
  }
  return apiFetch<TransactionTrendPoint[]>("/api/transactions/trends", {
    params,
  });
}

export async function getChannelSummary(
  params: ChannelSummaryParams = {},
): Promise<ChannelSummary[]> {
  if (USE_MOCK_DATA) {
    await mockDelay();
    return generateMockChannelSummary(resolveMockRange(params), params.channel);
  }
  return apiFetch<ChannelSummary[]>("/api/channels/summary", { params });
}

export async function getPeakLoadHeatmap(
  params: PeakLoadParams = {},
): Promise<PeakLoadPoint[]> {
  if (USE_MOCK_DATA) {
    await mockDelay();
    return generateMockPeakLoad(params.channel);
  }
  return apiFetch<PeakLoadPoint[]>("/api/transactions/peak-load", { params });
}

export async function getTransactions(
  params: TransactionListParams = {},
): Promise<PaginatedResponse<Transaction>> {
  if (USE_MOCK_DATA) {
    await mockDelay();
    return queryMockTransactions(params);
  }
  return apiFetch<PaginatedResponse<Transaction>>("/api/transactions", {
    params,
  });
}

export function getAnomalies(params: AnomalyParams = {}): Promise<Anomaly[]> {
  return apiFetch<Anomaly[]>("/api/anomalies", { params });
}

export async function getReconciliationSummary(
  params: ReconciliationParams = {},
): Promise<ReconciliationSummary[]> {
  if (USE_MOCK_DATA) {
    await mockDelay();
    return generateMockReconciliation(resolveMockRange(params), params.channel);
  }
  return apiFetch<ReconciliationSummary[]>("/api/reconciliation/summary", { params });
}

export async function getChannelDailyFlow(
  params: ChannelDailyFlowParams = {},
): Promise<ChannelDailyFlow[]> {
  if (USE_MOCK_DATA) {
    await mockDelay();
    return generateMockChannelDailyFlow(resolveMockRange(params), params.channel);
  }
  return apiFetch<ChannelDailyFlow[]>("/api/channels/daily-flow", { params });
}

export async function getPeriodSnapshot(
  params: PeriodSnapshotParams = {},
): Promise<PeriodSnapshot> {
  if (USE_MOCK_DATA) {
    await mockDelay();
    return generateMockPeriodSnapshot(resolveMockRange(params));
  }
  return apiFetch<PeriodSnapshot>("/api/channels/period-snapshot", { params });
}

export async function getOverviewDataset(): Promise<OverviewDataset> {
  if (USE_MOCK_DATA) {
    await mockDelay();
    return OVERVIEW_SAMPLE;
  }
  return apiFetch<OverviewDataset>("/api/overview");
}
