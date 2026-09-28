import type { ChannelSummary } from "@/types/api";

/** A single channel-summary row (or several, summed) collapsed into one comparable snapshot. */
export interface AggregatedChannelStats {
  transactionCount: number;
  totalValue: number;
  /** Fraction 0-1. */
  successRate: number;
  failedCount: number;
  pendingCount: number;
  reversedCount: number;
  incomingCount: number;
  outgoingCount: number;
  incomingValue: number;
  outgoingValue: number;
  avgLatencyMs: number;
  netPosition: number;
  avgTicket: number;
}

const EMPTY_STATS: AggregatedChannelStats = {
  transactionCount: 0,
  totalValue: 0,
  successRate: 0,
  failedCount: 0,
  pendingCount: 0,
  reversedCount: 0,
  incomingCount: 0,
  outgoingCount: 0,
  incomingValue: 0,
  outgoingValue: 0,
  avgLatencyMs: 0,
  netPosition: 0,
  avgTicket: 0,
};

/** Sums one or more `ChannelSummary` rows (e.g. every platform for a date range) into a single snapshot. */
export function aggregateChannelSummaries(rows: ChannelSummary[]): AggregatedChannelStats {
  if (!rows.length) return EMPTY_STATS;

  const transactionCount = rows.reduce((acc, r) => acc + r.transactionCount, 0);
  const totalValue = rows.reduce((acc, r) => acc + r.totalValue, 0);
  const failedCount = rows.reduce((acc, r) => acc + r.failedCount, 0);
  const pendingCount = rows.reduce((acc, r) => acc + r.pendingCount, 0);
  const reversedCount = rows.reduce((acc, r) => acc + r.reversedCount, 0);
  const incomingCount = rows.reduce((acc, r) => acc + r.incomingCount, 0);
  const outgoingCount = rows.reduce((acc, r) => acc + r.outgoingCount, 0);
  const incomingValue = rows.reduce((acc, r) => acc + r.incomingValue, 0);
  const outgoingValue = rows.reduce((acc, r) => acc + r.outgoingValue, 0);
  const successCount = Math.max(0, transactionCount - failedCount - pendingCount - reversedCount);
  const successRate = transactionCount ? successCount / transactionCount : 0;
  const avgLatencyMs = transactionCount
    ? rows.reduce((acc, r) => acc + (r.avgLatencyMs ?? 0) * r.transactionCount, 0) / transactionCount
    : 0;

  return {
    transactionCount,
    totalValue,
    successRate,
    failedCount,
    pendingCount,
    reversedCount,
    incomingCount,
    outgoingCount,
    incomingValue,
    outgoingValue,
    avgLatencyMs,
    netPosition: incomingValue - outgoingValue,
    avgTicket: transactionCount ? totalValue / transactionCount : 0,
  };
}

/** Fractional change of `current` vs `previous`, e.g. 0.12 for +12%. Safe against a zero base. */
export function pctChange(current: number, previous: number): number {
  if (!previous) return current ? 1 : 0;
  return (current - previous) / previous;
}
