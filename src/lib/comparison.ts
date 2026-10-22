import type { ChannelId } from "@/config/channels";
import { WSO2_SOURCE_LABELS, type Wso2Source } from "@/config/wso2-sources";
import { addDays, toISODate, type DateRange } from "@/lib/date";
import { formatCompactAmount, formatCurrency, formatNumber } from "@/lib/format";
import { channelName, computeOverview, formatRangeLabel, formatShortDate, pickSourceTotals } from "@/lib/overview";
import type { AllAdvancedTotals, OverviewDataset } from "@/types/api";

/**
 * Maths and wording for the Comparison page. Each side is an amount (primary)
 * and a transaction count; success, failures and latency are left out on purpose.
 */

export type ComparisonType = "channels" | "periods";
export type Interval = "day" | "week" | "month" | "quarter" | "half" | "custom";
export type SideKey = "a" | "b";

export const COMPARISON_TYPE_LABELS: Record<ComparisonType, string> = {
  channels: "Channel comparison",
  periods: "Period comparison",
};

/** The two sides of a period comparison: A is the baseline, B is measured against it. */
export const PERIOD_SIDE_LABELS: Record<SideKey, string> = { a: "Base period", b: "Comparison period" };

export interface PeriodOption {
  id: string;
  /** Select label, e.g. "Tue 29 Sep", "15 – 21 Sep", "August 2026". */
  label: string;
  /** Sentence label, e.g. "29 Sep", "15 – 21 Sep", "August". */
  shortLabel: string;
  range: DateRange;
  /** The month before the dataset, back-calculated from the "vs previous month" changes. */
  previousMonth?: boolean;
}

export interface SideFigures {
  /** Panel name, e.g. "Telebirr" or "29 Sep". */
  name: string;
  /** Small line under the name, e.g. "All platforms" on the Period comparison tab. */
  caption?: string;
  /** `null` when the figure isn't available (e.g. August for some channels). */
  amount: number | null;
  transactions: number | null;
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function weekday(iso: string): string {
  return WEEKDAYS[new Date(`${iso}T00:00:00Z`).getUTCDay()];
}

function monthIndex(iso: string): { year: number; month: number } {
  const [y, m] = iso.split("-").map(Number);
  return { year: y, month: m - 1 };
}

export function buildPeriodOptions(dataset: OverviewDataset, interval: Interval): PeriodOption[] {
  const days = dataset.daily.map((d) => d.date);
  if (interval === "day") {
    return days.map((iso) => ({
      id: iso,
      label: `${weekday(iso)} ${formatShortDate(iso)}`,
      shortLabel: formatShortDate(iso),
      range: { from: iso, to: iso },
    }));
  }
  if (interval === "week") {
    // Full 7-day blocks from the first day: 1 – 7, 8 – 14, 15 – 21, 22 – 28.
    const weeks: PeriodOption[] = [];
    for (let i = 0; i + 7 <= days.length; i += 7) {
      const from = days[i];
      const to = days[i + 6];
      const label = `${Number(from.slice(8))} – ${formatShortDate(to)}`;
      weeks.push({ id: from, label, shortLabel: label, range: { from, to } });
    }
    return weeks;
  }
  const { year, month } = monthIndex(dataset.from);
  const prev = new Date(Date.UTC(year, month - 1, 1));
  return [
    {
      id: "previous-month",
      label: `${MONTHS[prev.getUTCMonth()]} ${prev.getUTCFullYear()}`,
      shortLabel: MONTHS[prev.getUTCMonth()],
      range: { from: dataset.from, to: dataset.to },
      previousMonth: true,
    },
    {
      id: "dataset-month",
      label: `${MONTHS[month]} ${year}`,
      shortLabel: MONTHS[month],
      range: { from: dataset.from, to: dataset.to },
    },
  ];
}

/** Defaults per interval: the last two days, the last two full weeks, previous month vs this month. */
export function defaultPeriodIds(options: PeriodOption[]): { a: string; b: string } {
  const n = options.length;
  return { a: options[Math.max(0, n - 2)]?.id ?? "", b: options[n - 1]?.id ?? "" };
}

/** The next option after `id` that isn't `avoid`, wrapping round; keeps a side from matching the other. */
export function nextOptionId<T extends string>(ids: T[], id: T, avoid: T): T {
  const start = ids.indexOf(id);
  for (let step = 1; step <= ids.length; step++) {
    const candidate = ids[(start + step) % ids.length];
    if (candidate !== avoid) return candidate;
  }
  return id;
}

/** Amount and transactions for one channel (or all platforms) over a date range. */
export function figuresFor(
  dataset: OverviewDataset,
  channel: ChannelId | "all",
  range: DateRange,
): Pick<SideFigures, "amount" | "transactions"> {
  const { series } = computeOverview(dataset, range, channel);
  if (!series.length) return { amount: null, transactions: null };
  return {
    amount: series.reduce((acc, d) => acc + d.value, 0),
    transactions: series.reduce((acc, d) => acc + d.count, 0),
  };
}

export function periodFigures(
  dataset: OverviewDataset,
  channel: ChannelId | "all",
  option: PeriodOption,
): Pick<SideFigures, "amount" | "transactions"> {
  const month = figuresFor(dataset, channel, option.range);
  if (!option.previousMonth) return month;

  if (channel === "all") {
    return {
      amount: month.amount === null ? null : month.amount / (1 + dataset.previousMonthChange.value),
      transactions:
        month.transactions === null ? null : month.transactions / (1 + dataset.previousMonthChange.transactions),
    };
  }
  // One channel: only the amount change is known, and not for every channel.
  const change = dataset.channels.find((c) => c.channel === channel)?.valueChangeVsPreviousMonth;
  return {
    amount: change === null || change === undefined || month.amount === null ? null : month.amount / (1 + change),
    transactions: null,
  };
}

/* ---------- formatting ---------- */

/** "ETB 280,123,456.78" */
export function formatAmount(value: number): string {
  return formatCurrency(value);
}

/** "ETB 1,523.40" */
export function formatAvgPayment(value: number): string {
  return formatCurrency(value);
}

/** "191,234": a whole number (daily counts are fractional after normalising). */
export function formatTransactions(value: number): string {
  return formatNumber(value);
}

export function avgPayment(side: Pick<SideFigures, "amount" | "transactions">): number | null {
  return side.amount !== null && side.transactions ? side.amount / side.transactions : null;
}

// Insight sentences are read at a glance: big amounts in M/B, payments to the birr.
function etbShort(value: number): string {
  return `ETB ${formatCompactAmount(value)}`;
}

function etbWhole(value: number): string {
  return `ETB ${formatNumber(value)}`;
}

function pct(value: number, digits = 1): string {
  return `${Math.abs(value * 100).toFixed(digits)}%`;
}

/* ---------- gaps ---------- */

export interface Gap {
  /** Which side is ahead; "even" when equal; null when a figure is missing. */
  leader: SideKey | "even" | null;
  difference: number;
  /** "2.0× as much", "33% more", "Even" or "No data". */
  caption: string;
}

export function gapBetween(a: number | null, b: number | null): Gap {
  if (a === null || b === null) return { leader: null, difference: 0, caption: "No data" };
  if (a === b) return { leader: "even", difference: 0, caption: "Even" };
  const leader: SideKey = a > b ? "a" : "b";
  const high = Math.max(a, b);
  const low = Math.min(a, b);
  const caption =
    low > 0 && high / low >= 2
      ? `${(high / low).toFixed(1)}× as much`
      : low > 0
        ? `${Math.round(((high - low) / low) * 100)}% more`
        : "Only one side";
  return { leader, difference: high - low, caption };
}

/* ---------- insights ---------- */

export interface Insight {
  id: "avg-payment" | "share" | "movement" | "gap";
  title: string;
  text: string;
}

export function channelInsights(
  a: SideFigures,
  b: SideFigures,
  /** All-platform amount and transactions over the same period. */
  totals: Pick<SideFigures, "amount" | "transactions">,
  periodDays: number,
): Insight[] {
  const insights: Insight[] = [];
  const avgA = avgPayment(a);
  const avgB = avgPayment(b);

  if (avgA !== null && avgB !== null) {
    const [big, small, bigAvg, smallAvg] = avgA >= avgB ? [a, b, avgA, avgB] : [b, a, avgB, avgA];
    const ratio = smallAvg ? bigAvg / smallAvg : 0;
    insights.push({
      id: "avg-payment",
      title: "Average payment size",
      text:
        ratio >= 1.3
          ? `${big.name} averages ${etbWhole(bigAvg)} per payment, ${ratio.toFixed(1)}× the ${etbWhole(smallAvg)} of ${small.name}.`
          : `Similar payment sizes: ${etbWhole(avgA)} for ${a.name}, ${etbWhole(avgB)} for ${b.name}.`,
    });
  } else {
    insights.push({
      id: "avg-payment",
      title: "Average payment size",
      text: "One side has no transactions in this period, so average payments can't be compared.",
    });
  }

  // Share of the business, against all platforms over the same days.
  if (
    a.amount !== null && b.amount !== null && a.transactions !== null && b.transactions !== null &&
    totals.amount && totals.transactions
  ) {
    const shareA = a.amount / totals.amount;
    const shareB = b.amount / totals.amount;
    insights.push({
      id: "share",
      title: "Share of the business",
      text:
        `${a.name}: ${pct(shareA)} of all value, ${pct(a.transactions / totals.transactions)} of transactions. ` +
        `${b.name}: ${pct(shareB)} of value, ${pct(b.transactions / totals.transactions)} of transactions.`,
    });
  }

  const gap = gapBetween(a.amount, b.amount);
  insights.push({ id: "gap", title: "Gap to close", text: gapToCloseChannels(a, b, gap, periodDays) });
  return insights;
}

function gapToCloseChannels(a: SideFigures, b: SideFigures, gap: Gap, periodDays: number): string {
  if (gap.leader === null) return "One side has no data in this period, so there's no gap to measure.";
  if (gap.leader === "even") return `${a.name} and ${b.name} processed the same amount.`;
  const [leader, trailer] = gap.leader === "a" ? [a, b] : [b, a];
  if (periodDays <= 1) return `${trailer.name} is ${etbShort(gap.difference)} behind ${leader.name}.`;
  return `${trailer.name} is ${etbShort(gap.difference)} behind ${leader.name}, about ${etbShort(gap.difference / periodDays)} a day.`;
}

export function periodInsights(a: SideFigures, b: SideFigures): Insight[] {
  const insights: Insight[] = [];
  const avgA = avgPayment(a);
  const avgB = avgPayment(b);

  insights.push({
    id: "avg-payment",
    title: "Average payment size",
    text:
      avgA !== null && avgB !== null
        ? `${etbWhole(avgA)} for ${a.name}, ${etbWhole(avgB)} for ${b.name}.`
        : `${missingName(a, b, "transactions")} transaction counts aren't available, so average payments can't be compared.`,
  });

  insights.push({ id: "movement", title: "How it moved", text: movementText(a, b) });
  insights.push({ id: "gap", title: "Gap to close", text: gapToClosePeriods(a, b) });
  return insights;
}

function missingName(a: SideFigures, b: SideFigures, key: "amount" | "transactions"): string {
  return a[key] === null ? a.name : b.name;
}

function movementText(a: SideFigures, b: SideFigures): string {
  if (a.amount === null || b.amount === null || !a.amount) {
    return `There's no ${missingName(a, b, "amount")} amount to measure the change against.`;
  }
  const amountChange = b.amount / a.amount - 1;
  const valueText = `${pct(amountChange)} ${amountChange >= 0 ? "more" : "less"} value`;
  if (a.transactions === null || b.transactions === null || !a.transactions) {
    return `${b.name} had ${valueText} than ${a.name}. Transaction counts for ${missingName(a, b, "transactions")} aren't available.`;
  }
  const txChange = b.transactions / a.transactions - 1;
  const txText = `${pct(txChange)} ${txChange >= 0 ? "more" : "fewer"} transactions`;
  const avgChange = (1 + amountChange) / (1 + txChange) - 1;
  // "but" when the average payment moved against the value, "and" when with it.
  const avgText =
    Math.abs(avgChange) < 0.005
      ? ", and the average payment stayed about the same"
      : `, ${avgChange > 0 === amountChange >= 0 ? "and" : "but"} each payment was ${pct(avgChange)} ${avgChange > 0 ? "larger" : "smaller"} on average`;
  return `${b.name} had ${valueText} and ${txText} than ${a.name}${avgText}.`;
}

function gapToClosePeriods(a: SideFigures, b: SideFigures): string {
  if (a.amount === null || b.amount === null) {
    return `${missingName(a, b, "amount")} has no amount yet, so there's no gap to measure.`;
  }
  const diff = b.amount - a.amount;
  if (diff === 0) return `${b.name} brought in exactly the same amount as ${a.name}.`;
  if (diff < 0) return `${b.name} brought in ${etbShort(-diff)} less than ${a.name}.`;
  return `${b.name} brought in ${etbShort(diff)} more than ${a.name}.`;
}

/* ---------- share + bottom line ---------- */

export function shareOfAmount(a: SideFigures, b: SideFigures): { a: number; b: number; combined: number } | null {
  if (a.amount === null || b.amount === null || a.amount + b.amount <= 0) return null;
  const combined = a.amount + b.amount;
  return { a: (a.amount / combined) * 100, b: (b.amount / combined) * 100, combined };
}

export interface BottomLine {
  /** Headline split into parts so names can be coloured by side. */
  parts: { text: string; side?: SideKey }[];
  detail: string;
}

export function bottomLine(
  a: SideFigures,
  b: SideFigures,
  options: { prefix?: string; periodLabel?: string } = {},
): BottomLine | null {
  if (a.amount === null || b.amount === null) return null;
  const suffix = options.periodLabel ? ` (${options.periodLabel})` : "";
  const high = Math.max(a.amount, b.amount);
  const low = Math.min(a.amount, b.amount);

  if (high === 0 || (low > 0 && (high - low) / low <= 0.01)) {
    return {
      parts: [{ text: "Evenly matched on amount" }],
      detail: `${formatAmount(a.amount)} against ${formatAmount(b.amount)}${suffix}.`,
    };
  }

  const leaderKey: SideKey = a.amount >= b.amount ? "a" : "b";
  const [leader, other] = leaderKey === "a" ? [a, b] : [b, a];
  const otherKey: SideKey = leaderKey === "a" ? "b" : "a";
  const ratio = low > 0 ? high / low : Infinity;
  const middle =
    ratio >= 1.5 && Number.isFinite(ratio)
      ? ` processed ${ratio.toFixed(1)}× the amount of `
      : ` processed ${Math.round(((high - low) / (low || 1)) * 100)}% more than `;

  return {
    parts: [
      { text: options.prefix ? `${options.prefix} on ` : "" },
      { text: leader.name, side: leaderKey },
      { text: middle },
      { text: other.name, side: otherKey },
    ],
    detail: `${formatAmount(high)} against ${formatAmount(low)}, a gap of ${formatAmount(high - low)}${suffix}.`,
  };
}

export function sideName(channel: ChannelId | "all"): string {
  return channel === "all" ? "All platforms" : channelName(channel);
}

/* ---------- live periods and figures (WSO2 allAdvanced) ---------- */

/** Earliest day the Comparison page lets anyone pick, "YYYY-MM-DD". */
export const EARLIEST_DAY = "2025-01-01";

/** How many choices each interval offers, counting back from yesterday. Custom ranges have no list. */
const LIVE_OPTION_COUNT: Record<Interval, number> = { day: 30, week: 8, month: 6, quarter: 8, half: 4, custom: 0 };

const SHORT_MONTHS = MONTHS.map((m) => m.slice(0, 3));

function weekLabel(from: string, to: string): string {
  return from.slice(0, 7) === to.slice(0, 7)
    ? `${Number(from.slice(8))} – ${formatShortDate(to)}`
    : `${formatShortDate(from)} – ${formatShortDate(to)}`;
}

/**
 * Real calendar periods for the live API, oldest first: the last 30 days, the
 * last 8 full weeks (Mon – Sun), the last 6 full months, the last 8 full
 * quarters or the last 4 full half-years. The current, still partial, period
 * is left out, and so is any period starting before `EARLIEST_DAY`. Custom
 * ranges are picked with date fields, so they have no list.
 */
export function buildLivePeriodOptions(interval: Interval, today: Date = new Date()): PeriodOption[] {
  return allLivePeriodOptions(interval, today).filter((o) => o.range.from >= EARLIEST_DAY);
}

function allLivePeriodOptions(interval: Interval, today: Date): PeriodOption[] {
  const count = LIVE_OPTION_COUNT[interval];
  const options: PeriodOption[] = [];

  if (interval === "quarter" || interval === "half") {
    // Calendar quarters (Q1 = Jan – Mar) or halves (H1 = Jan – Jun).
    const months = interval === "quarter" ? 3 : 6;
    const prefix = interval === "quarter" ? "Q" : "H";
    const currentStart = today.getMonth() - (today.getMonth() % months);
    for (let i = count; i >= 1; i--) {
      const first = new Date(today.getFullYear(), currentStart - months * i, 1);
      const last = new Date(first.getFullYear(), first.getMonth() + months, 0);
      const from = toISODate(first);
      const name = `${prefix}${first.getMonth() / months + 1} ${first.getFullYear()}`;
      options.push({
        id: from,
        label: `${name} (${SHORT_MONTHS[first.getMonth()]} – ${SHORT_MONTHS[last.getMonth()]})`,
        shortLabel: name,
        range: { from, to: toISODate(last) },
      });
    }
    return options;
  }

  if (interval === "day") {
    for (let i = count; i >= 1; i--) options.push(dayOption(toISODate(addDays(today, -i))));
    return options;
  }

  if (interval === "week") {
    // Monday of the current week, then step back whole weeks.
    const thisMonday = addDays(today, -((today.getDay() + 6) % 7));
    for (let i = count; i >= 1; i--) {
      const from = toISODate(addDays(thisMonday, -7 * i));
      const to = toISODate(addDays(thisMonday, -7 * i + 6));
      const label = weekLabel(from, to);
      options.push({ id: from, label, shortLabel: label, range: { from, to } });
    }
    return options;
  }

  for (let i = count; i >= 1; i--) {
    const first = new Date(today.getFullYear(), today.getMonth() - i, 1);
    const last = new Date(today.getFullYear(), today.getMonth() - i + 1, 0);
    const from = toISODate(first);
    options.push({
      id: from,
      label: `${MONTHS[first.getMonth()]} ${first.getFullYear()}`,
      shortLabel: MONTHS[first.getMonth()],
      range: { from, to: toISODate(last) },
    });
  }
  return options;
}

/** A single day as a period, e.g. for the Day interval's date pickers. `iso` is "YYYY-MM-DD". */
export function dayOption(iso: string): PeriodOption {
  return { id: iso, label: `${weekday(iso)} ${formatShortDate(iso)}`, shortLabel: formatShortDate(iso), range: { from: iso, to: iso } };
}

/** Any date range as a period, for the Custom interval, e.g. "1 – 14 Sep 2026". */
export function rangeOption(range: DateRange): PeriodOption {
  const label = formatRangeLabel(range);
  return { id: `${range.from}_${range.to}`, label, shortLabel: label, range };
}

/** Custom interval defaults: the last 7 complete days against the 7 days before them. */
export function defaultCustomRanges(today: Date = new Date()): { a: DateRange; b: DateRange } {
  const day = (offset: number) => toISODate(addDays(today, offset));
  return { a: { from: day(-14), to: day(-8) }, b: { from: day(-7), to: day(-1) } };
}

/** The latest whole day: yesterday (today is still partial). */
export function latestCompleteDay(today: Date = new Date()): string {
  return toISODate(addDays(today, -1));
}

/** One source's (or all sources') amount and count from an allAdvanced response; `null` until loaded. */
export function liveFigures(
  totals: AllAdvancedTotals | undefined,
  source: Wso2Source,
): Pick<SideFigures, "amount" | "transactions"> {
  const picked = pickSourceTotals(totals, source);
  return picked
    ? { amount: picked.totalAmount, transactions: picked.totalTransactions }
    : { amount: null, transactions: null };
}

export function liveSideName(source: Wso2Source): string {
  return WSO2_SOURCE_LABELS[source];
}
