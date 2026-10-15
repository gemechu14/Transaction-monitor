import { CHANNELS, type ChannelId } from "@/config/channels";
import {
  WSO2_CHANNEL_SOURCES,
  type Wso2ChannelSource,
  type Wso2Source,
} from "@/config/wso2-sources";
import { addDays, eachDay, toISODate, type DateRange } from "@/lib/date";
import { formatAmountValue, formatNumber, formatCurrency } from "@/lib/format";
import { seededRandom } from "@/lib/mock/rng";
import type {
  AllAdvancedTotals,
  OverviewChannelRow,
  OverviewDataset,
  SourceTotals,
} from "@/types/api";

/**
 * Filter maths for the Overview page. The dataset holds one month of channel
 * figures and an all-platform daily series; the platform and period filters
 * scale them as described in the Overview spec.
 */

/** Today on the viewer's clock, "YYYY-MM-DD". Presets and the date fields end here. */
export function todayIso(): string {
  return toISODate(new Date());
}

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

/**
 * Presets counted back from `today`, each ending today: rolling days for the
 * short ones, whole calendar months (this one included) for the long ones.
 */
export function buildPeriodPresets(today: Date = new Date()): PeriodPreset[] {
  const to = toISODate(today);
  const daysBack = (n: number) => toISODate(addDays(today, -(n - 1)));
  const monthsBack = (n: number) => toISODate(new Date(today.getFullYear(), today.getMonth() - (n - 1), 1));
  return [
    { id: "today", label: "Today", range: { from: to, to } },
    { id: "last-7", label: "Last 7 days", range: { from: daysBack(7), to } },
    // Hidden for now.
    // { id: "last-4w", label: "Last 4 weeks", range: { from: daysBack(28), to } },
    { id: "this-month", label: "This month", range: { from: monthsBack(1), to } },
    { id: "quarter", label: "Quarterly (3 months)", range: { from: monthsBack(3), to } },
    { id: "six-months", label: "6 months", range: { from: monthsBack(6), to } },
    { id: "year", label: "Yearly", range: { from: monthsBack(12), to } },
  ];
}

/** Until the user picks another period, the dashboard shows the last 3 months. */
export function defaultPeriod(): OverviewPeriod {
  const quarter = buildPeriodPresets().find((p) => p.id === "quarter")!;
  return { preset: quarter.id, range: quarter.range };
}

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
  return formatCurrency(value);
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

  // Only used by the hidden Success rate, Failed / reversed and Average latency cards.
  // const statusTotal =
  //   dataset.status.success + dataset.status.failed + dataset.status.reversed + dataset.status.pending;
  // const failureShare = statusTotal ? dataset.status.failed / statusTotal : 0;
  // const reversalShare = statusTotal ? dataset.status.reversed / statusTotal : 0;
  //
  // const slowest = [...dataset.channels].sort((a, b) => b.avgLatencyMs - a.avgLatencyMs)[0];
  //
  // const failed = dataset.status.failed * periodShare;
  // const reversed = dataset.status.reversed * periodShare;
  // const failedReversed = row ? count * (1 - row.successRate) : failed + reversed;

  const kpis: OverviewKpi[] = [
    {
      id: "total-value",
      label: "Total transaction value (ETB)",
      shortLabel: "Total value",
      value: formatAmountValue(value),
      detail: `Avg ${formatEtb(avgTicket)} per transaction`,
    },
    {
      id: "total-volume",
      label: "Total transaction volume",
      shortLabel: "Transactions",
      value: formatNumber(count),
      detail: `≈ ${formatNumber(dataDays ? count / dataDays : 0)} per day`,
    },
    // Success rate and Failed / reversed cards are hidden for now.
    // {
    //   id: "success-rate",
    //   label: "Success rate",
    //   shortLabel: "Success rate",
    //   value: `${(scope.successRate * 100).toFixed(2)}%`,
    //   detail: row
    //     ? `Failure ${((1 - row.successRate) * 100).toFixed(2)}%`
    //     : `Failure ${(failureShare * 100).toFixed(2)}%, reversal ${(reversalShare * 100).toFixed(2)}%`,
    // },
    // {
    //   id: "failed-reversed",
    //   label: "Failed / reversed",
    //   shortLabel: "Failed",
    //   value: formatNumber(failedReversed),
    //   detail: row
    //     ? `${name} failed and reversed`
    //     : `${formatNumber(failed)} failed, ${Math.round(reversed).toLocaleString("en-US")} reversed`,
    // },
    {
      id: "avg-value",
      label: "Average transaction value (ETB)",
      shortLabel: "Avg ticket",
      value: formatAmountValue(avgTicket),
      detail: row ? `${name} average ticket` : `Median ${formatEtb(avgTicket * 0.89)}`,
    },
    // Average latency card is hidden for now.
    // {
    //   id: "avg-latency",
    //   label: "Average latency",
    //   shortLabel: "Avg latency",
    //   value: `${Math.round(scope.avgLatencyMs)} ms`,
    //   detail: row
    //     ? `${name} response time`
    //     : slowest
    //       ? `Slowest: ${CHANNELS[slowest.channel]?.shortName ?? slowest.channel}, ${slowest.avgLatencyMs} ms`
    //       : "",
    // },
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


/** One source's totals, or every source added up for "all". */
export function pickSourceTotals(
  totals: AllAdvancedTotals | undefined,
  source: Wso2Source,
): SourceTotals | undefined {
  if (!totals) return undefined;
  if (source !== "all") return totals[source] ?? { totalTransactions: 0, totalAmount: 0 };
  // Only the listed sources, so hidden ones (e.g. TAS) stay out of the total.
  return WSO2_CHANNEL_SOURCES.map((id) => totals[id]).reduce<SourceTotals>(
    (acc, t) => ({
      totalTransactions: acc.totalTransactions + (t?.totalTransactions ?? 0),
      totalAmount: acc.totalAmount + (t?.totalAmount ?? 0),
    }),
    { totalTransactions: 0, totalAmount: 0 },
  );
}

/** KPIs filled from live WSO2 totals; the rest still come from the mock dataset. */
export const LIVE_KPI_IDS = new Set<OverviewKpi["id"]>(["total-value", "total-volume", "avg-value"]);

/**
 * Swaps the value, volume and average-ticket KPIs for live WSO2 totals. Without
 * totals (`undefined`), those three show "—" and `errorMessage` as their detail.
 */
export function applyLiveTotals(
  kpis: OverviewKpi[],
  totals: SourceTotals | undefined,
  range: DateRange,
  errorMessage?: string,
): OverviewKpi[] {
  const unavailable = errorMessage ? `Unavailable: ${errorMessage}` : "Unavailable";
  const count = totals?.totalTransactions ?? 0;
  const avgTicket = count ? (totals?.totalAmount ?? 0) / count : 0;

  return kpis.map((kpi) => {
    if (!LIVE_KPI_IDS.has(kpi.id)) return kpi;
    if (!totals) return { ...kpi, value: "—", detail: unavailable };
    if (kpi.id === "total-value") {
      return { ...kpi, value: formatAmountValue(totals.totalAmount), detail: `Avg ${formatEtb(avgTicket)} per transaction` };
    }
    if (kpi.id === "total-volume") {
      return {
        ...kpi,
        value: formatNumber(count),
        detail: `≈ ${formatNumber(count / countDays(range))} per day`,
      };
    }
    return { ...kpi, value: formatAmountValue(avgTicket), detail: `Across ${formatNumber(count)} transactions` };
  });
}

export interface SourceRow extends SourceTotals {
  source: Wso2ChannelSource;
}

/** Every WSO2 source as a row (missing ones as zero), for per-source rankings. */
export function sourceRows(totals: AllAdvancedTotals | undefined): SourceRow[] {
  if (!totals) return [];
  return WSO2_CHANNEL_SOURCES.map((source) => ({
    source,
    totalTransactions: totals[source]?.totalTransactions ?? 0,
    totalAmount: totals[source]?.totalAmount ?? 0,
  }));
}
