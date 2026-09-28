import type { ChannelId } from "@/config/channels";
import { type DateRange, eachDay, getLastNDays, shiftRangeBack } from "@/lib/date";
import { seededRandom } from "@/lib/mock/rng";
import type {
  ChannelDailyFlow,
  ChannelSummary,
  Kpi,
  PeakLoadPoint,
  PeriodSnapshot,
  ReconciliationSummary,
  TransactionTrendPoint,
} from "@/types/api";

/** Everything below is deterministic mock data standing in for the real WSO2 gateway API. */

export interface ChannelProfile {
  channel: ChannelId;
  /** Share of total daily transaction count. */
  shareWeight: number;
  baseSuccessRate: number;
  avgValue: number;
  /** Fraction of this channel's flow that counts as money coming into the institution. */
  incomingRatio: number;
  avgLatencyMs: number;
  /** Baseline settlement reconciliation match rate, e.g. 0.9844 for 98.44%. */
  baseMatchRate: number;
}

export const CHANNEL_PROFILES: ChannelProfile[] = [
  {
    channel: "telebirr",
    shareWeight: 0.271,
    baseSuccessRate: 0.96,
    avgValue: 1445,
    incomingRatio: 0.55,
    avgLatencyMs: 224,
    baseMatchRate: 0.9844,
  },
  {
    channel: "mbesa_p2p",
    shareWeight: 0.195,
    baseSuccessRate: 0.95,
    avgValue: 965,
    incomingRatio: 0.5,
    avgLatencyMs: 196,
    baseMatchRate: 0.9816,
  },
  {
    channel: "banks",
    shareWeight: 0.156,
    baseSuccessRate: 0.969,
    avgValue: 17750,
    incomingRatio: 0.6,
    avgLatencyMs: 565,
    baseMatchRate: 0.9868,
  },
  {
    channel: "souqpass",
    shareWeight: 0.117,
    baseSuccessRate: 0.945,
    avgValue: 3281,
    incomingRatio: 0.58,
    avgLatencyMs: 308,
    baseMatchRate: 0.9807,
  },
  {
    channel: "coopstream",
    shareWeight: 0.105,
    baseSuccessRate: 0.968,
    avgValue: 5574,
    incomingRatio: 0.52,
    avgLatencyMs: 289,
    baseMatchRate: 0.9862,
  },
  {
    channel: "chapa",
    shareWeight: 0.084,
    baseSuccessRate: 0.939,
    avgValue: 1742,
    incomingRatio: 0.6,
    avgLatencyMs: 261,
    baseMatchRate: 0.9789,
  },
  {
    channel: "deboo",
    shareWeight: 0.071,
    baseSuccessRate: 0.921,
    avgValue: 2083,
    incomingRatio: 0.5,
    avgLatencyMs: 438,
    baseMatchRate: 0.9745,
  },
];

const TOTAL_DAILY_VOLUME_BASE = 21_500;
const TREND_EPOCH = Date.UTC(2026, 0, 1);
const ANNUAL_GROWTH_RATE = 0.12;

function daysSinceEpoch(iso: string): number {
  return Math.round((new Date(iso).getTime() - TREND_EPOCH) / 86_400_000);
}

const WEEKDAY_SEASONALITY = [0.78, 1.05, 1.08, 1.1, 1.1, 1.12, 0.86]; // Sun..Sat

interface DayChannelStats {
  date: string;
  channel: ChannelId;
  count: number;
  value: number;
  incomingCount: number;
  outgoingCount: number;
  incomingValue: number;
  outgoingValue: number;
  successCount: number;
  failedCount: number;
  pendingCount: number;
  reversedCount: number;
  /** This day-channel's average gateway latency, noisy around the channel's baseline. */
  latencyMs: number;
}

function generateDayChannelStats(date: string, profile: ChannelProfile): DayChannelStats {
  const rand = seededRandom(profile.channel, daysSinceEpoch(date));
  const seasonality = WEEKDAY_SEASONALITY[new Date(date).getUTCDay()];
  const trend = 1 + (daysSinceEpoch(date) / 365) * ANNUAL_GROWTH_RATE;

  const countNoise = 0.85 + rand() * 0.3;
  const valueNoise = 0.9 + rand() * 0.2;
  const successNoise = (rand() - 0.5) * 0.02;
  const incomingNoise = (rand() - 0.5) * 0.06;
  const pendingRate = 0.004 + rand() * 0.006;
  const reversedRate = 0.006 + rand() * 0.01;
  const latencyNoise = 0.85 + rand() * 0.3;

  const count = Math.max(
    0,
    Math.round(TOTAL_DAILY_VOLUME_BASE * profile.shareWeight * seasonality * trend * countNoise),
  );
  const value = Math.round(count * profile.avgValue * valueNoise);

  const successRate = Math.min(0.995, Math.max(0.85, profile.baseSuccessRate + successNoise));
  const successCount = Math.round(count * successRate);
  const pendingCount = Math.round(count * pendingRate);
  const reversedCount = Math.round(count * reversedRate);
  const failedCount = Math.max(0, count - successCount - pendingCount - reversedCount);

  const incomingRatio = Math.min(0.85, Math.max(0.15, profile.incomingRatio + incomingNoise));
  const incomingCount = Math.round(count * incomingRatio);
  const incomingValue = Math.round(value * incomingRatio);

  return {
    date,
    channel: profile.channel,
    count,
    value,
    incomingCount,
    outgoingCount: count - incomingCount,
    incomingValue,
    outgoingValue: value - incomingValue,
    successCount,
    failedCount,
    pendingCount,
    reversedCount,
    latencyMs: profile.avgLatencyMs * latencyNoise,
  };
}

function generateSeries(range: DateRange, channel?: ChannelId): DayChannelStats[] {
  const days = eachDay(range.from, range.to);
  const profiles = channel
    ? CHANNEL_PROFILES.filter((p) => p.channel === channel)
    : CHANNEL_PROFILES;

  const stats: DayChannelStats[] = [];
  for (const date of days) {
    for (const profile of profiles) {
      stats.push(generateDayChannelStats(date, profile));
    }
  }
  return stats;
}

function sum(stats: DayChannelStats[], key: keyof DayChannelStats): number {
  return stats.reduce((acc, s) => acc + (s[key] as number), 0);
}

/** Transaction-count-weighted average of a per-day-channel field, e.g. latency. */
function weightedAvg(stats: DayChannelStats[], key: keyof DayChannelStats): number {
  const totalCount = sum(stats, "count");
  if (!totalCount) return 0;
  const weightedSum = stats.reduce((acc, s) => acc + (s[key] as number) * s.count, 0);
  return weightedSum / totalCount;
}

/** Falls back to the last 30 days when no explicit range is given. */
export function resolveMockRange(range: { from?: string; to?: string }): DateRange {
  if (range.from && range.to) return { from: range.from, to: range.to };
  return getLastNDays(30);
}

export function mockDelay(ms = 250): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function generateMockKpis(range: DateRange, channel?: ChannelId): Kpi[] {
  const current = generateSeries(range, channel);
  const previousRangeStats = generateSeries(shiftRangeBack(range), channel);

  const totalCount = sum(current, "count");
  const prevTotalCount = sum(previousRangeStats, "count");
  const totalValue = sum(current, "value");
  const prevTotalValue = sum(previousRangeStats, "value");
  const totalFailed = sum(current, "failedCount");
  const totalPending = sum(current, "pendingCount");
  const totalReversed = sum(current, "reversedCount");
  const incomingCount = sum(current, "incomingCount");
  const outgoingCount = sum(current, "outgoingCount");
  const incomingValue = sum(current, "incomingValue");
  const outgoingValue = sum(current, "outgoingValue");

  const successRate = totalCount ? (totalCount - totalFailed - totalPending - totalReversed) / totalCount : 0;
  const prevFailed = sum(previousRangeStats, "failedCount");
  const prevPending = sum(previousRangeStats, "pendingCount");
  const prevReversed = sum(previousRangeStats, "reversedCount");
  const prevSuccessRate = prevTotalCount
    ? (prevTotalCount - prevFailed - prevPending - prevReversed) / prevTotalCount
    : 0;

  const failedReversed = totalFailed + totalReversed;
  const prevFailedReversed = prevFailed + prevReversed;

  const netFlow = incomingValue - outgoingValue;
  const prevNetFlow = sum(previousRangeStats, "incomingValue") - sum(previousRangeStats, "outgoingValue");

  const avgValue = totalCount ? totalValue / totalCount : 0;
  const prevAvgValue = prevTotalCount ? prevTotalValue / prevTotalCount : 0;

  const byDay = groupByDate(current);
  const hourly = byDay.length === 1 ? splitDayStatsIntoHours(byDay[0].date, byDay[0].stats) : null;

  const volumeSparkline = hourly ? hourly.map((h) => h.count) : byDay.map((d) => sum(d.stats, "count"));
  const valueSparkline = hourly ? hourly.map((h) => h.value) : byDay.map((d) => sum(d.stats, "value"));
  const successSparkline = hourly
    ? hourly.map((h) => (h.count ? (h.count - h.failedCount - h.pendingCount - h.reversedCount) / h.count : 0))
    : byDay.map((d) => {
        const c = sum(d.stats, "count");
        return c ? (c - sum(d.stats, "failedCount") - sum(d.stats, "pendingCount") - sum(d.stats, "reversedCount")) / c : 0;
      });
  const failedReversedSparkline = hourly
    ? hourly.map((h) => h.failedCount + h.reversedCount)
    : byDay.map((d) => sum(d.stats, "failedCount") + sum(d.stats, "reversedCount"));
  const netFlowSparkline = hourly
    ? hourly.map((h) => h.incomingValue - h.outgoingValue)
    : byDay.map((d) => sum(d.stats, "incomingValue") - sum(d.stats, "outgoingValue"));
  const avgValueSparkline = hourly
    ? hourly.map((h) => (h.count ? h.value / h.count : 0))
    : byDay.map((d) => {
        const c = sum(d.stats, "count");
        return c ? sum(d.stats, "value") / c : 0;
      });

  return [
    {
      id: "total-value",
      label: "Total Transaction Value",
      value: totalValue,
      previousValue: prevTotalValue,
      change: change(totalValue, prevTotalValue),
      format: "currency",
      helperText: `Avg ETB ${formatK(avgValue)} per transaction`,
      higherIsBetter: true,
      sparkline: valueSparkline,
    },
    {
      id: "total-volume",
      label: "Total Transaction Volume",
      value: totalCount,
      previousValue: prevTotalCount,
      change: change(totalCount, prevTotalCount),
      format: "number",
      helperText: `${formatK(incomingCount)} in · ${formatK(outgoingCount)} out`,
      higherIsBetter: true,
      sparkline: volumeSparkline,
    },
    {
      id: "success-rate",
      label: "Success Rate",
      value: successRate,
      previousValue: prevSuccessRate,
      change: change(successRate, prevSuccessRate),
      format: "percent",
      helperText: `Failure ${((totalFailed / (totalCount || 1)) * 100).toFixed(2)}% · Reversal ${((totalReversed / (totalCount || 1)) * 100).toFixed(2)}%`,
      higherIsBetter: true,
      sparkline: successSparkline,
    },
    {
      id: "failed-reversed",
      label: "Failed / Reversed",
      value: failedReversed,
      previousValue: prevFailedReversed,
      change: change(failedReversed, prevFailedReversed),
      format: "number",
      helperText: `${formatK(totalFailed)} failed · ${totalReversed.toLocaleString()} reversed`,
      higherIsBetter: false,
      sparkline: failedReversedSparkline,
    },
    {
      id: "net-flow",
      label: "Net Inflow vs Outflow",
      value: netFlow,
      previousValue: prevNetFlow,
      change: change(netFlow, prevNetFlow),
      format: "currency",
      helperText: `ETB ${formatK(incomingValue)} in · ETB ${formatK(outgoingValue)} out`,
      higherIsBetter: true,
      sparkline: netFlowSparkline,
    },
    {
      id: "avg-value",
      label: "Average Transaction Value",
      value: avgValue,
      previousValue: prevAvgValue,
      change: change(avgValue, prevAvgValue),
      format: "currency",
      helperText: `Median ETB ${formatK(avgValue * 0.89)}`,
      higherIsBetter: true,
      sparkline: avgValueSparkline,
    },
  ];
}

/** Relative share of a day's traffic per hour (00:00-23:00), low overnight and peaking midday. */
const HOUR_WEIGHTS = [
  0.015, 0.01, 0.008, 0.007, 0.008, 0.012, 0.022, 0.035, 0.05, 0.062, 0.072, 0.075, 0.068, 0.07,
  0.075, 0.078, 0.074, 0.066, 0.058, 0.048, 0.038, 0.03, 0.022, 0.017,
];
const HOUR_WEIGHT_TOTAL = HOUR_WEIGHTS.reduce((a, b) => a + b, 0);

/** Single-day ranges collapse KPI sparklines to one flat point otherwise — split the day's totals into an hourly curve. */
function splitDayStatsIntoHours(date: string, dayStats: DayChannelStats[]) {
  const totals = {
    count: sum(dayStats, "count"),
    value: sum(dayStats, "value"),
    failedCount: sum(dayStats, "failedCount"),
    pendingCount: sum(dayStats, "pendingCount"),
    reversedCount: sum(dayStats, "reversedCount"),
    incomingValue: sum(dayStats, "incomingValue"),
    outgoingValue: sum(dayStats, "outgoingValue"),
  };

  return HOUR_WEIGHTS.map((weight, hour) => {
    const rand = seededRandom(date, "kpi-hour", hour);
    const share = (weight / HOUR_WEIGHT_TOTAL) * (0.92 + rand() * 0.16);
    return {
      count: Math.round(totals.count * share),
      value: Math.round(totals.value * share),
      failedCount: Math.round(totals.failedCount * share),
      pendingCount: Math.round(totals.pendingCount * share),
      reversedCount: Math.round(totals.reversedCount * share),
      incomingValue: Math.round(totals.incomingValue * share),
      outgoingValue: Math.round(totals.outgoingValue * share),
    };
  });
}

/** Single-day ranges read as one flat point otherwise — split the day's totals into an hourly curve. */
function splitDayIntoHours(date: string, dayStats: DayChannelStats[]): TransactionTrendPoint[] {
  const incomingCountTotal = sum(dayStats, "incomingCount");
  const outgoingCountTotal = sum(dayStats, "outgoingCount");
  const incomingValueTotal = sum(dayStats, "incomingValue");
  const outgoingValueTotal = sum(dayStats, "outgoingValue");

  return HOUR_WEIGHTS.map((weight, hour) => {
    const rand = seededRandom(date, "hour", hour);
    const share = (weight / HOUR_WEIGHT_TOTAL) * (0.92 + rand() * 0.16);
    return {
      timestamp: `${date}T${String(hour).padStart(2, "0")}:00`,
      incomingVolume: Math.round(incomingCountTotal * share),
      outgoingVolume: Math.round(outgoingCountTotal * share),
      incomingValue: Math.round(incomingValueTotal * share),
      outgoingValue: Math.round(outgoingValueTotal * share),
    };
  });
}

export function generateMockTransactionTrends(
  range: DateRange,
  channel?: ChannelId,
): TransactionTrendPoint[] {
  const stats = generateSeries(range, channel);
  const grouped = groupByDate(stats);

  if (grouped.length === 1) {
    return splitDayIntoHours(grouped[0].date, grouped[0].stats);
  }

  return grouped.map(({ date, stats: dayStats }) => ({
    timestamp: date,
    incomingVolume: sum(dayStats, "incomingCount"),
    outgoingVolume: sum(dayStats, "outgoingCount"),
    incomingValue: sum(dayStats, "incomingValue"),
    outgoingValue: sum(dayStats, "outgoingValue"),
  }));
}

export function generateMockChannelSummary(
  range: DateRange,
  channel?: ChannelId,
): ChannelSummary[] {
  const stats = generateSeries(range, channel);
  const byChannel = new Map<ChannelId, DayChannelStats[]>();
  for (const s of stats) {
    const list = byChannel.get(s.channel) ?? [];
    list.push(s);
    byChannel.set(s.channel, list);
  }

  const summaries: ChannelSummary[] = [];
  for (const [ch, chStats] of byChannel) {
    const transactionCount = sum(chStats, "count");
    const failedCount = sum(chStats, "failedCount");
    const pendingCount = sum(chStats, "pendingCount");
    const reversedCount = sum(chStats, "reversedCount");
    const successCount = transactionCount - failedCount - pendingCount - reversedCount;
    const profile = CHANNEL_PROFILES.find((p) => p.channel === ch);

    summaries.push({
      channel: ch,
      transactionCount,
      totalValue: sum(chStats, "value"),
      successRate: transactionCount ? successCount / transactionCount : 0,
      failedCount,
      pendingCount,
      reversedCount,
      incomingCount: sum(chStats, "incomingCount"),
      outgoingCount: sum(chStats, "outgoingCount"),
      incomingValue: sum(chStats, "incomingValue"),
      outgoingValue: sum(chStats, "outgoingValue"),
      avgLatencyMs: profile?.avgLatencyMs,
    });
  }

  return summaries.sort((a, b) => b.transactionCount - a.transactionCount);
}

export function generateMockChannelDailyFlow(
  range: DateRange,
  channel?: ChannelId,
): ChannelDailyFlow[] {
  const stats = generateSeries(range, channel);
  const grouped = groupByDate(stats);

  return grouped.map(({ date, stats: dayStats }) => {
    const transactionCount = sum(dayStats, "count");
    const failedCount = sum(dayStats, "failedCount");
    const pendingCount = sum(dayStats, "pendingCount");
    const reversedCount = sum(dayStats, "reversedCount");
    const successCount = transactionCount - failedCount - pendingCount - reversedCount;

    return {
      date,
      incomingCount: sum(dayStats, "incomingCount"),
      outgoingCount: sum(dayStats, "outgoingCount"),
      incomingValue: sum(dayStats, "incomingValue"),
      outgoingValue: sum(dayStats, "outgoingValue"),
      transactionCount,
      successRate: transactionCount ? successCount / transactionCount : 0,
    };
  });
}

/** Aggregate stats for a single period across all platforms, for the Channels page period comparison. */
export function generateMockPeriodSnapshot(range: DateRange): PeriodSnapshot {
  const stats = generateSeries(range);
  const totalVolume = sum(stats, "count");
  const totalValue = sum(stats, "value");
  const failedCount = sum(stats, "failedCount");
  const pendingCount = sum(stats, "pendingCount");
  const reversedCount = sum(stats, "reversedCount");
  const successCount = totalVolume - failedCount - pendingCount - reversedCount;
  const incomingValue = sum(stats, "incomingValue");
  const outgoingValue = sum(stats, "outgoingValue");

  return {
    totalVolume,
    incomingValue,
    outgoingValue,
    netPosition: incomingValue - outgoingValue,
    successRate: totalVolume ? successCount / totalVolume : 0,
    avgLatencyMs: weightedAvg(stats, "latencyMs"),
    avgTicket: totalVolume ? totalValue / totalVolume : 0,
  };
}

const RECONCILED_MATCH_RATE_THRESHOLD = 0.98;

export function generateMockReconciliation(
  range: DateRange,
  channel?: ChannelId,
): ReconciliationSummary[] {
  const stats = generateSeries(range, channel);
  const byChannel = new Map<ChannelId, DayChannelStats[]>();
  for (const s of stats) {
    const list = byChannel.get(s.channel) ?? [];
    list.push(s);
    byChannel.set(s.channel, list);
  }

  const summaries: ReconciliationSummary[] = [];
  for (const [ch, chStats] of byChannel) {
    const profile = CHANNEL_PROFILES.find((p) => p.channel === ch);
    const rand = seededRandom(ch, "reconciliation", range.from, range.to);
    const matchRate = Math.min(
      0.999,
      Math.max(0.9, (profile?.baseMatchRate ?? 0.98) + (rand() - 0.5) * 0.01),
    );

    const inflow = sum(chStats, "incomingValue");
    const outflow = sum(chStats, "outgoingValue");

    summaries.push({
      channel: ch,
      inflow,
      outflow,
      netPosition: inflow - outflow,
      pendingCount: sum(chStats, "pendingCount"),
      reversedCount: sum(chStats, "reversedCount"),
      matchRate,
      state: matchRate >= RECONCILED_MATCH_RATE_THRESHOLD ? "reconciled" : "review",
    });
  }

  return summaries.sort((a, b) => b.inflow + b.outflow - (a.inflow + a.outflow));
}

const HOUR_PROFILE = [
  0.25, 0.18, 0.15, 0.15, 0.2, 0.35, 0.55, 0.75, 0.92, 1, 1, 0.95, 0.9, 0.95, 1, 1, 0.98, 0.85, 0.7,
  0.6, 0.5, 0.42, 0.35, 0.3,
];
const DAY_PROFILE = [0.55, 0.95, 1, 1, 1, 1.05, 0.45]; // Sun..Sat

export function generateMockPeakLoad(channel?: ChannelId): PeakLoadPoint[] {
  const points: PeakLoadPoint[] = [];
  for (let day = 0; day < 7; day++) {
    for (let hour = 0; hour < 24; hour++) {
      const rand = seededRandom(channel ?? "all", day, hour);
      const base = HOUR_PROFILE[hour] * DAY_PROFILE[day];
      const noise = 0.85 + rand() * 0.3;
      points.push({ day, hour, value: Math.round(base * noise * 100) });
    }
  }
  return points;
}

function groupByDate(stats: DayChannelStats[]): { date: string; stats: DayChannelStats[] }[] {
  const byDate = new Map<string, DayChannelStats[]>();
  for (const s of stats) {
    const list = byDate.get(s.date) ?? [];
    list.push(s);
    byDate.set(s.date, list);
  }
  return Array.from(byDate.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, dayStats]) => ({ date, stats: dayStats }));
}

function change(current: number, previous: number): number {
  if (!previous) return 0;
  return (current - previous) / previous;
}

function formatK(value: number): string {
  if (Math.abs(value) >= 1000) {
    return new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(
      value,
    );
  }
  return value.toFixed(0);
}
