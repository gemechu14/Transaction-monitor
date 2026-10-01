import type { ChannelId } from "@/config/channels";
import type { TransactionStatus } from "@/config/status";

export interface PaginatedResponse<T> {
  data: T[];
  page: number;
  pageSize: number;
  total: number;
}

/** Values that can be serialized into a query string by the API client. */
export type QueryValue = string | number | boolean | undefined | null;

export interface DateRangeParams extends Record<string, QueryValue> {
  from?: string;
  to?: string;
}

/** A single executive KPI tile (e.g. total volume, success rate). */
export interface Kpi {
  id: string;
  label: string;
  /** Percent/rate values are fractions, e.g. 0.9541 for 95.41%. */
  value: number;
  previousValue?: number;
  /** Fractional change vs. the previous period, e.g. 0.032 for +3.2%. */
  change?: number;
  format: "number" | "currency" | "percent";
  unit?: string;
  /** Short supporting line rendered under the value, e.g. "394.3K in · 316.6K out". */
  helperText?: string;
  /** Whether a positive `change` should read as good news (green) or bad news (red). Defaults to true. */
  higherIsBetter?: boolean;
  /** Recent values for the tile's mini trend chart, oldest first. */
  sparkline?: number[];
}

export interface KpiParams extends DateRangeParams {
  channel?: ChannelId;
}

/** One day of directional transaction volume/value, for the flow trend chart. */
export interface TransactionTrendPoint {
  timestamp: string;
  incomingVolume: number;
  outgoingVolume: number;
  incomingValue: number;
  outgoingValue: number;
  channel?: ChannelId;
}

export interface TransactionTrendParams extends DateRangeParams {
  channel?: ChannelId;
  granularity?: "hour" | "day" | "week" | "month";
}

/** Aggregated stats for a single channel, used on the Channels page. */
export interface ChannelSummary {
  channel: ChannelId;
  transactionCount: number;
  totalValue: number;
  /** Fraction 0-1, e.g. 0.96 for 96%. */
  successRate: number;
  failedCount: number;
  pendingCount: number;
  reversedCount: number;
  incomingCount: number;
  outgoingCount: number;
  incomingValue: number;
  outgoingValue: number;
  avgLatencyMs?: number;
}

export interface ChannelSummaryParams extends DateRangeParams {
  channel?: ChannelId;
}

/** One day of a channel's incoming/outgoing flow and success rate, for the Channels page daily table. */
export interface ChannelDailyFlow {
  date: string;
  incomingCount: number;
  outgoingCount: number;
  incomingValue: number;
  outgoingValue: number;
  transactionCount: number;
  /** Fraction 0-1, e.g. 0.96 for 96%. */
  successRate: number;
}

export interface ChannelDailyFlowParams extends DateRangeParams {
  channel?: ChannelId;
}

/** Aggregate stats for a single period (a day, week, or month), across all platforms. */
export interface PeriodSnapshot {
  totalVolume: number;
  incomingValue: number;
  outgoingValue: number;
  netPosition: number;
  /** Fraction 0-1, e.g. 0.96 for 96%. */
  successRate: number;
  avgLatencyMs: number;
  avgTicket: number;
}

export type PeriodSnapshotParams = DateRangeParams;

/** One cell of a day-of-week x hour-of-day load heatmap. */
export interface PeakLoadPoint {
  /** 0 = Sunday .. 6 = Saturday. */
  day: number;
  /** 0-23. */
  hour: number;
  /** Relative load intensity, roughly 0-100. */
  value: number;
}

export interface PeakLoadParams extends DateRangeParams {
  channel?: ChannelId;
}

export type TransactionDirection = "in" | "out";

export interface Transaction {
  id: string;
  reference: string;
  channel: ChannelId;
  direction: TransactionDirection;
  amount: number;
  currency: string;
  status: TransactionStatus;
  counterparty: string;
  /** ISO timestamp, UTC. */
  createdAt: string;
  latencyMs: number;
}

export interface TransactionListParams extends DateRangeParams {
  channel?: ChannelId;
  status?: TransactionStatus;
  direction?: "both" | TransactionDirection;
  search?: string;
  minAmount?: number;
  maxAmount?: number;
  page?: number;
  pageSize?: number;
}

export type ReconciliationState = "reconciled" | "review";

/** Inflow/outflow settlement position for a single channel, used on the Reconciliation page. */
export interface ReconciliationSummary {
  channel: ChannelId;
  inflow: number;
  outflow: number;
  netPosition: number;
  pendingCount: number;
  reversedCount: number;
  /** Fraction 0-1, e.g. 0.9844 for 98.44%. */
  matchRate: number;
  state: ReconciliationState;
}

export interface ReconciliationParams extends DateRangeParams {
  channel?: ChannelId;
}

export type AnomalySeverity = "low" | "medium" | "high" | "critical";
export type AnomalyStatus = "open" | "investigating" | "resolved";

export interface Anomaly {
  id: string;
  title: string;
  description: string;
  severity: AnomalySeverity;
  status: AnomalyStatus;
  channel?: ChannelId;
  detectedAt: string;
  relatedTransactionIds?: string[];
}

export interface AnomalyParams extends DateRangeParams {
  channel?: ChannelId;
  severity?: AnomalySeverity;
  status?: AnomalyStatus;
}

/** One channel's headline figures for the Overview page's base period (a full month). */
export interface OverviewChannelRow {
  channel: ChannelId;
  transactionCount: number;
  totalValue: number;
  /** Fraction 0-1, e.g. 0.962 for 96.2%. */
  successRate: number;
  avgLatencyMs: number;
  /**
   * Fractional change in value vs the month before, e.g. 0.042 for +4.2%.
   * `null` when the previous month isn't known for this channel.
   */
  valueChangeVsPreviousMonth?: number | null;
}

/** All-platform transaction count for one day of the base period. */
export interface OverviewDailyPoint {
  date: string;
  transactionCount: number;
  /** All-platform base success rate for the day, fraction 0-1. */
  successRate: number;
}

/** How the base period's transactions ended, as counts. */
export interface OverviewStatusBreakdown {
  success: number;
  failed: number;
  reversed: number;
  pending: number;
}

export interface OverviewFailingChannel {
  channel: ChannelId;
  failedCount: number;
  reversedCount: number;
  /** Fraction 0-1. */
  failureRate: number;
}

export interface OverviewAnomalyFlag {
  channel: ChannelId;
  /** Fractions 0-1: this period's failure rate and the previous period's baseline. */
  failureRate: number;
  baselineRate: number;
}

/**
 * Everything the Overview page draws from. The platform and period filters are
 * applied client-side (see `src/lib/overview.ts`), so a live WSO2 response only
 * has to fill this shape.
 */
export interface OverviewDataset {
  /** First and last day covered by `daily`, "YYYY-MM-DD". */
  from: string;
  to: string;
  channels: OverviewChannelRow[];
  daily: OverviewDailyPoint[];
  status: OverviewStatusBreakdown;
  failing: OverviewFailingChannel[];
  anomalies: OverviewAnomalyFlag[];
  /** All-platform change vs the month before, as fractions (0.03 for +3%). */
  previousMonthChange: { value: number; transactions: number };
}
