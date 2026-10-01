import type { ChannelId } from "@/config/channels";
import type { DateRange } from "@/lib/date";
import { channelName, computeOverview } from "@/lib/overview";
import type { OverviewDataset } from "@/types/api";

/**
 * Filter maths for the Channels page. Uses the Overview dataset (one month of
 * channel figures plus an all-platform daily series) and scales it as described
 * in the Channels spec.
 */

export type RankMetric = "transactions" | "value" | "success" | "latency";

export const RANK_ITEMS: Record<RankMetric, string> = {
  transactions: "Rank by transactions",
  value: "Rank by value",
  success: "Rank by success rate",
  latency: "Rank by latency",
};

/** Latency above this is called out in orange. */
export const SLOW_LATENCY_MS = 400;
/** Daily success below this gets the orange pill. */
export const LOW_SUCCESS_RATE = 0.952;
/** Share of each day's transactions still pending, excluded from failed / reversed. */
const PENDING_SHARE = 0.007;

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const twoDecimals = new Intl.NumberFormat("en-US", {
  notation: "compact",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** "ETB 280.12M", "ETB 2.00B": always two decimals. */
export function formatEtb2(value: number): string {
  return `ETB ${twoDecimals.format(value)}`;
}

export interface ChannelStat {
  channel: ChannelId;
  name: string;
  /** Period-scaled transaction count and value. */
  count: number;
  value: number;
  /** Fraction 0-1. */
  successRate: number;
  avgLatencyMs: number;
  avgTicket: number;
  /** Fraction 0-1 of all-platform transactions. */
  share: number;
}

export interface ChannelRanks {
  transactions: number;
  value: number;
  success: number;
  /** Counted from the fastest. */
  fastest: number;
}

export interface DayRow {
  date: string;
  weekday: string;
  weekend: boolean;
  count: number;
  value: number;
  avgTicket: number;
  /** Failed and reversed, excluding pending. */
  failed: number;
  /** Fraction 0-1. */
  successRate: number;
}

export interface ChannelsView {
  /** All seven channels, scaled to the period, in dataset order. */
  stats: ChannelStat[];
  platform: { avgTicket: number; avgLatencyMs: number };
  selected?: ChannelStat & { ranks: ChannelRanks; perDay: number };
  days: DayRow[];
  /** The period starts before the dataset does, so only part of it has data. */
  clipped: boolean;
}

export function sortChannels(stats: ChannelStat[], by: RankMetric): ChannelStat[] {
  const key: Record<RankMetric, (s: ChannelStat) => number> = {
    transactions: (s) => s.count,
    value: (s) => s.value,
    success: (s) => s.successRate,
    // Slowest first: ranking by latency surfaces the channels that need attention.
    latency: (s) => s.avgLatencyMs,
  };
  return [...stats].sort((a, b) => key[by](b) - key[by](a));
}

function rankOf(stats: ChannelStat[], channel: ChannelId, by: (s: ChannelStat) => number): number {
  return [...stats].sort((a, b) => by(b) - by(a)).findIndex((s) => s.channel === channel) + 1;
}

function weekdayOf(iso: string): number {
  return new Date(`${iso}T00:00:00Z`).getUTCDay();
}

export function computeChannels(
  dataset: OverviewDataset,
  range: DateRange,
  channel: ChannelId | "all",
): ChannelsView {
  const inPeriod = (date: string) => date >= range.from && date <= range.to;
  const monthCount = dataset.daily.reduce((acc, d) => acc + d.transactionCount, 0);
  const periodCount = dataset.daily.reduce(
    (acc, d) => acc + (inPeriod(d.date) ? d.transactionCount : 0),
    0,
  );
  const periodShare = monthCount ? periodCount / monthCount : 0;

  const allCount = dataset.channels.reduce((acc, c) => acc + c.transactionCount, 0);
  const allValue = dataset.channels.reduce((acc, c) => acc + c.totalValue, 0);
  const weighted = (pick: (c: (typeof dataset.channels)[number]) => number) =>
    allCount ? dataset.channels.reduce((acc, c) => acc + pick(c) * c.transactionCount, 0) / allCount : 0;
  const allSuccess = weighted((c) => c.successRate);

  const stats: ChannelStat[] = dataset.channels.map((c) => ({
    channel: c.channel,
    name: channelName(c.channel),
    count: c.transactionCount * periodShare,
    value: c.totalValue * periodShare,
    successRate: c.successRate,
    avgLatencyMs: c.avgLatencyMs,
    avgTicket: c.transactionCount ? c.totalValue / c.transactionCount : 0,
    share: allCount ? c.transactionCount / allCount : 0,
  }));

  const stat = channel === "all" ? undefined : stats.find((s) => s.channel === channel);
  const channelRate = stat ? stat.successRate : allSuccess;

  // Daily success = the day's base rate shifted by how far the channel sits from the month's base.
  const monthBase = monthCount
    ? dataset.daily.reduce((acc, d) => acc + d.successRate * d.transactionCount, 0) / monthCount
    : 0;
  const baseByDate = new Map(dataset.daily.map((d) => [d.date, d.successRate]));

  const { series } = computeOverview(dataset, range, channel);
  const days: DayRow[] = series.map((d) => {
    const weekday = weekdayOf(d.date);
    const successRate = Math.min(1, (baseByDate.get(d.date) ?? monthBase) + (channelRate - monthBase));
    return {
      date: d.date,
      weekday: WEEKDAYS[weekday],
      weekend: weekday === 0 || weekday === 6,
      count: d.count,
      value: d.value,
      avgTicket: d.count ? d.value / d.count : 0,
      failed: Math.max(0, d.count * (1 - successRate - PENDING_SHARE)),
      successRate,
    };
  });

  return {
    stats,
    platform: {
      avgTicket: allCount ? allValue / allCount : 0,
      avgLatencyMs: weighted((c) => c.avgLatencyMs),
    },
    selected: stat && {
      ...stat,
      perDay: days.length ? stat.count / days.length : 0,
      ranks: {
        transactions: rankOf(stats, stat.channel, (s) => s.count),
        value: rankOf(stats, stat.channel, (s) => s.value),
        success: rankOf(stats, stat.channel, (s) => s.successRate),
        fastest: rankOf(stats, stat.channel, (s) => -s.avgLatencyMs),
      },
    },
    days,
    clipped: range.from < dataset.from,
  };
}

export type Granularity = "day" | "week" | "month";

/** Week and month grouping are offered once the period spans about four weeks. */
const GROUPING_MIN_DAYS = 28;

export function availableGranularities(periodDays: number): Granularity[] {
  return periodDays >= GROUPING_MIN_DAYS ? ["day", "week", "month"] : ["day"];
}

/** One row of the day-by-day table: a single day, a calendar week (Mon – Sun) or a calendar month. */
export interface PeriodRow {
  /** First and last day with data, "YYYY-MM-DD". */
  start: string;
  end: string;
  label: string;
  sublabel: string;
  weekend: boolean;
  days: number;
  count: number;
  value: number;
  avgTicket: number;
  failed: number;
  /** Fraction 0-1, weighted by transactions. */
  successRate: number;
}

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function daysInMonth(iso: string): number {
  const [y, m] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

function mondayOf(iso: string): string {
  const date = new Date(`${iso}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() - ((date.getUTCDay() + 6) % 7));
  return date.toISOString().slice(0, 10);
}

function toPeriodRow(rows: DayRow[], label: string, sublabel: string, weekend = false): PeriodRow {
  const count = rows.reduce((acc, r) => acc + r.count, 0);
  const value = rows.reduce((acc, r) => acc + r.value, 0);
  return {
    start: rows[0].date,
    end: rows[rows.length - 1].date,
    label,
    sublabel,
    weekend,
    days: rows.length,
    count,
    value,
    avgTicket: count ? value / count : 0,
    failed: rows.reduce((acc, r) => acc + r.failed, 0),
    successRate: count ? rows.reduce((acc, r) => acc + r.successRate * r.count, 0) / count : 0,
  };
}

function groupBy(rows: DayRow[], keyOf: (row: DayRow) => string): DayRow[][] {
  const groups = new Map<string, DayRow[]>();
  for (const row of rows) {
    const key = keyOf(row);
    groups.set(key, [...(groups.get(key) ?? []), row]);
  }
  return [...groups.values()];
}

function shortDate(iso: string): string {
  const [, m, d] = iso.split("-").map(Number);
  return `${d} ${MONTH_NAMES[m - 1]}`;
}

export function groupDays(rows: DayRow[], granularity: Granularity): PeriodRow[] {
  if (granularity === "day") {
    return rows.map((r) =>
      toPeriodRow([r], shortDate(r.date), r.weekend ? `${r.weekday}, weekend` : r.weekday, r.weekend),
    );
  }

  if (granularity === "week") {
    return groupBy(rows, (r) => mondayOf(r.date)).map((week) => {
      const first = week[0].date;
      const last = week[week.length - 1].date;
      const label = first === last ? shortDate(first) : `${shortDate(first)} – ${shortDate(last)}`;
      const sublabel = week.length < 7 ? `${week.length} days, partial week` : "7 days";
      return toPeriodRow(week, label, sublabel);
    });
  }

  return groupBy(rows, (r) => r.date.slice(0, 7)).map((month) => {
    const [y, m] = month[0].date.split("-").map(Number);
    const full = daysInMonth(month[0].date);
    const sublabel = month.length < full ? `${month.length} of ${full} days` : `${full} days`;
    return toPeriodRow(month, `${MONTH_NAMES[m - 1]} ${y}`, sublabel);
  });
}
