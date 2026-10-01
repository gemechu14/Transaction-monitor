import { CHANNELS, type ChannelId } from "@/config/channels";
import { eachDay, type DateRange } from "@/lib/date";
import { formatCompactNumber, formatCurrencyCompact } from "@/lib/format";
import { seededRandom } from "@/lib/mock/rng";
import type { OverviewChannelRow, OverviewDataset } from "@/types/api";

/**
 * Filter maths for the Overview page. The dataset holds one month of channel
 * figures and an all-platform daily series; the platform and period filters
 * scale them as described in the Overview spec.
 */

/** Last day with data. Presets count back from here rather than from the real clock. */
export const OVERVIEW_TODAY = "2026-09-30";

const SHORT_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export type PeriodPresetId =
  | "today"
  | "last-7"
  | "last-4w"
  | "this-month"
  | "quarter"
  | "six-months"
  | "year";

export interface PeriodPreset {
  id: PeriodPresetId;
  label: string;
  range: DateRange;
}

export const PERIOD_PRESETS: PeriodPreset[] = [
  { id: "today", label: "Today", range: { from: "2026-09-30", to: "2026-09-30" } },
  { id: "last-7", label: "Last 7 days", range: { from: "2026-09-24", to: "2026-09-30" } },
  { id: "last-4w", label: "Last 4 weeks", range: { from: "2026-09-03", to: "2026-09-30" } },
  { id: "this-month", label: "This month (30d)", range: { from: "2026-09-01", to: "2026-09-30" } },
  { id: "quarter", label: "Quarterly (3 months)", range: { from: "2026-07-01", to: "2026-09-30" } },
  { id: "six-months", label: "6 months", range: { from: "2026-04-01", to: "2026-09-30" } },
  { id: "year", label: "Yearly", range: { from: "2025-10-01", to: "2026-09-30" } },
];

export const DEFAULT_PERIOD: OverviewPeriod = { preset: "this-month", range: PERIOD_PRESETS[3].range };

/** The applied period: a preset, or a custom range (`preset: null`). */
export interface OverviewPeriod {
  preset: PeriodPresetId | null;
  range: DateRange;
}

/** Longest custom range the picker accepts, matching the Yearly preset. */
export const MAX_CUSTOM_DAYS = 366;

function splitIso(iso: string): [number, number, number] {
  const [y, m, d] = iso.split("-").map(Number);
  return [y, m, d];
}

/** "4 Sep" */
export function formatShortDate(iso: string): string {
  const [, m, d] = splitIso(iso);
  return `${d} ${SHORT_MONTHS[m - 1]}`;
}

/** "30 Sep 2026" */
export function formatLongDate(iso: string): string {
  const [y] = splitIso(iso);
  return `${formatShortDate(iso)} ${y}`;
}

/** "1 – 30 Sep 2026", "1 Jul – 30 Sep 2026", "1 Oct 2025 – 30 Sep 2026" or "30 Sep 2026". */
export function formatRangeLabel(range: DateRange): string {
  if (range.from === range.to) return formatLongDate(range.from);
  const [fy, fm, fd] = splitIso(range.from);
  const [ty, tm] = splitIso(range.to);
  if (fy !== ty) return `${formatLongDate(range.from)} – ${formatLongDate(range.to)}`;
  if (fm !== tm) return `${formatShortDate(range.from)} – ${formatLongDate(range.to)}`;
  return `${fd} – ${formatLongDate(range.to)}`;
}

/** Always "1 Sep 2026 – 30 Sep 2026", so the picker button reads the same way for every period. */
export function formatFullRangeLabel(range: DateRange): string {
  return `${formatLongDate(range.from)} – ${formatLongDate(range.to)}`;
}

export function countDays(range: DateRange): number {
  return eachDay(range.from, range.to).length;
}

export function channelName(id: ChannelId): string {
  return CHANNELS[id]?.name ?? id;
}

export function formatEtb(value: number): string {
  return formatCurrencyCompact(value);
}

export interface DailyPoint {
  date: string;
  count: number;
  value: number;
}

export interface OverviewKpi {
  id: "total-value" | "total-volume" | "success-rate" | "failed-reversed" | "avg-value" | "avg-latency";
  label: string;
  shortLabel: string;
  value: string;
  detail: string;
}

export interface OverviewView {
  series: DailyPoint[];
  /** Days in the period that have data. */
  dataDays: number;
  /** The period starts before the dataset does, so only part of it has data. */
  clipped: boolean;
  kpis: OverviewKpi[];
}

function monthTotals(channels: OverviewChannelRow[]) {
  const count = channels.reduce((acc, c) => acc + c.transactionCount, 0);
  const value = channels.reduce((acc, c) => acc + c.totalValue, 0);
  const weighted = (pick: (c: OverviewChannelRow) => number) =>
    count ? channels.reduce((acc, c) => acc + pick(c) * c.transactionCount, 0) / count : 0;
  return {
    count,
    value,
    successRate: weighted((c) => c.successRate),
    avgLatencyMs: weighted((c) => c.avgLatencyMs),
  };
}

/** Per-day multiplier on the average ticket, 0.83 – 1.08, so daily value doesn't just mirror count. */
function dailyValueFactor(date: string): number {
  return 0.83 + seededRandom(date, "overview-value")() * 0.25;
}

export function computeOverview(
  dataset: OverviewDataset,
  range: DateRange,
  channel: ChannelId | "all",
): OverviewView {
  const inPeriod = (date: string) => date >= range.from && date <= range.to;
  const all = monthTotals(dataset.channels);
  const row = channel === "all" ? undefined : dataset.channels.find((c) => c.channel === channel);

  const scope = row
    ? {
        count: row.transactionCount,
        value: row.totalValue,
        successRate: row.successRate,
        avgLatencyMs: row.avgLatencyMs,
      }
    : all;
  const countScale = all.count ? scope.count / all.count : 0;

  // Daily value = count × factor, normalised so the month adds up to the scope's value.
  const weightedMonth = dataset.daily.reduce(
    (acc, d) => acc + d.transactionCount * dailyValueFactor(d.date),
    0,
  );
  const fullSeries: DailyPoint[] = dataset.daily.map((d) => ({
    date: d.date,
    count: d.transactionCount * countScale,
    value: weightedMonth
      ? (scope.value * d.transactionCount * dailyValueFactor(d.date)) / weightedMonth
      : 0,
  }));

  const series = fullSeries.filter((d) => inPeriod(d.date));
  const monthCount = dataset.daily.reduce((acc, d) => acc + d.transactionCount, 0);
  const periodCount = dataset.daily.reduce(
    (acc, d) => acc + (inPeriod(d.date) ? d.transactionCount : 0),
    0,
  );
  const periodShare = monthCount ? periodCount / monthCount : 0;

  const count = scope.count * periodShare;
  const value = scope.value * periodShare;
  const avgTicket = scope.count ? scope.value / scope.count : 0;
  const dataDays = series.length;
  const name = row ? channelName(row.channel) : "";

  const statusTotal =
    dataset.status.success + dataset.status.failed + dataset.status.reversed + dataset.status.pending;
  const failureShare = statusTotal ? dataset.status.failed / statusTotal : 0;
  const reversalShare = statusTotal ? dataset.status.reversed / statusTotal : 0;

  const slowest = [...dataset.channels].sort((a, b) => b.avgLatencyMs - a.avgLatencyMs)[0];

  const failed = dataset.status.failed * periodShare;
  const reversed = dataset.status.reversed * periodShare;
  const failedReversed = row ? count * (1 - row.successRate) : failed + reversed;

  const kpis: OverviewKpi[] = [
    {
      id: "total-value",
      label: "Total transaction value",
      shortLabel: "Total value",
      value: formatEtb(value),
      detail: `Avg ${formatEtb(avgTicket)} per transaction`,
    },
    {
      id: "total-volume",
      label: "Total transaction volume",
      shortLabel: "Transactions",
      value: formatCompactNumber(count),
      detail: `≈ ${formatCompactNumber(dataDays ? count / dataDays : 0)} per day`,
    },
    {
      id: "success-rate",
      label: "Success rate",
      shortLabel: "Success rate",
      value: `${(scope.successRate * 100).toFixed(2)}%`,
      detail: row
        ? `Failure ${((1 - row.successRate) * 100).toFixed(2)}%`
        : `Failure ${(failureShare * 100).toFixed(2)}%, reversal ${(reversalShare * 100).toFixed(2)}%`,
    },
    {
      id: "failed-reversed",
      label: "Failed / reversed",
      shortLabel: "Failed",
      value: formatCompactNumber(failedReversed),
      detail: row
        ? `${name} failed and reversed`
        : `${formatCompactNumber(failed)} failed, ${Math.round(reversed).toLocaleString("en-US")} reversed`,
    },
    {
      id: "avg-value",
      label: "Average transaction value",
      shortLabel: "Avg ticket",
      value: formatEtb(avgTicket),
      detail: row ? `${name} average ticket` : `Median ${formatEtb(avgTicket * 0.89)}`,
    },
    {
      id: "avg-latency",
      label: "Average latency",
      shortLabel: "Avg latency",
      value: `${Math.round(scope.avgLatencyMs)} ms`,
      detail: row
        ? `${name} response time`
        : slowest
          ? `Slowest: ${CHANNELS[slowest.channel]?.shortName ?? slowest.channel}, ${slowest.avgLatencyMs} ms`
          : "",
    },
  ];

  return {
    series,
    dataDays,
    clipped: range.from < dataset.from,
    kpis,
  };
}

/** Rounds `value` up to a tidy axis maximum that splits into `steps` even intervals. */
export function niceAxisMax(value: number, steps = 4): number {
  if (value <= 0) return steps;
  const rawStep = value / steps;
  const magnitude = 10 ** Math.floor(Math.log10(rawStep));
  const normalized = rawStep / magnitude;
  const niceStep = [1, 2, 2.5, 5, 10].find((n) => normalized <= n) ?? 10;
  return niceStep * magnitude * steps;
}
