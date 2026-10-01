import type { ChannelId } from "@/config/channels";
import type { DateRange } from "@/lib/date";
import { formatCompactNumber } from "@/lib/format";
import { channelName, computeOverview, formatShortDate } from "@/lib/overview";
import type { OverviewDataset } from "@/types/api";

/**
 * Maths and wording for the Comparison page. Each side is an amount (primary)
 * and a transaction count; success, failures and latency are left out on purpose.
 */

export type ComparisonType = "channels" | "periods";
export type Interval = "day" | "week" | "month";
export type SideKey = "a" | "b";

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
  /** Small line under the name, e.g. "All platforms" on the Same channel tab. */
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

/** "ETB 280.12M" */
export function formatAmount(value: number): string {
  return `ETB ${formatCompactNumber(value, 2)}`;
}

/** "ETB 1.5K", or "ETB 963" under a thousand. */
export function formatAvgPayment(value: number): string {
  return value < 1000 ? `ETB ${Math.round(value)}` : `ETB ${formatCompactNumber(value, 1)}`;
}

/** "191.2K", or a whole number under a thousand (daily counts are fractional after normalising). */
export function formatTransactions(value: number): string {
  return value < 1000 ? Math.round(value).toLocaleString("en-US") : formatCompactNumber(value, 1);
}

export function avgPayment(side: Pick<SideFigures, "amount" | "transactions">): number | null {
  return side.amount !== null && side.transactions ? side.amount / side.transactions : null;
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
    const tail =
      ratio >= 1.3
        ? ` ${big.name} carries larger payments (${ratio.toFixed(1)}×), ${small.name} more everyday ones.`
        : " The two carry similar payment sizes.";
    insights.push({
      id: "avg-payment",
      title: "Average payment size",
      text: `${a.name} averages ${formatAvgPayment(avgA)} per payment, against ${formatAvgPayment(avgB)} for ${b.name}.${tail}`,
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
        `${a.name} carries ${pct(shareA)} of all value and ${pct(a.transactions / totals.transactions)} of all transactions. ` +
        `${b.name} carries ${pct(shareB)} and ${pct(b.transactions / totals.transactions)}. ` +
        `Together they handle ${Math.round((shareA + shareB) * 100)}% of the value.`,
    });
  }

  const gap = gapBetween(a.amount, b.amount);
  insights.push({ id: "gap", title: "Gap to close", text: gapToCloseChannels(a, b, gap, periodDays) });
  return insights;
}

function gapToCloseChannels(a: SideFigures, b: SideFigures, gap: Gap, periodDays: number): string {
  if (gap.leader === null) return "One side has no data in this period, so there's no gap to measure.";
  if (gap.leader === "even") return `${a.name} and ${b.name} processed the same amount. There's no gap to close.`;
  const [leader, trailer] = gap.leader === "a" ? [a, b] : [b, a];
  const perDay = periodDays ? gap.difference / periodDays : gap.difference;
  return `${trailer.name} would need about ${formatAmount(perDay)} more per day (${formatAmount(gap.difference)} over ${periodDays} ${periodDays === 1 ? "day" : "days"}) to match ${leader.name}.`;
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
        ? `${a.name} averages ${formatAvgPayment(avgA)} per payment, against ${formatAvgPayment(avgB)} for ${b.name}.`
        : `${missingName(a, b, "transactions")} transaction counts aren't available, so average payments can't be compared.`,
  });

  insights.push({ id: "movement", title: "How it moved", text: movementText(a, b) });
  insights.push({ id: "gap", title: "Gap to close", text: gapToClosePeriods(a, b) });
  return insights;
}

function missingName(a: SideFigures, b: SideFigures, key: "amount" | "transactions"): string {
  return a[key] === null ? a.name : b.name;
}

function direction(change: number): string {
  return change >= 0 ? "up" : "down";
}

function movementText(a: SideFigures, b: SideFigures): string {
  if (a.amount === null || b.amount === null || !a.amount) {
    return `There's no ${missingName(a, b, "amount")} amount to measure the change against.`;
  }
  const amountChange = b.amount / a.amount - 1;
  if (a.transactions === null || b.transactions === null || !a.transactions) {
    return `The amount went ${direction(amountChange)} ${pct(amountChange)}. Transaction counts for ${missingName(a, b, "transactions")} aren't available, so the count change can't be shown.`;
  }
  const txChange = b.transactions / a.transactions - 1;
  const avgChange = (1 + amountChange) / (1 + txChange) - 1;
  const avgText =
    Math.abs(avgChange) < 0.005
      ? "The average payment stayed about the same."
      : `The average payment also got ${avgChange > 0 ? "larger" : "smaller"} (${avgChange > 0 ? "+" : "−"}${pct(avgChange)}).`;
  return `The amount went ${direction(amountChange)} ${pct(amountChange)} and transactions ${direction(txChange)} ${pct(txChange)}. ${avgText}`;
}

function gapToClosePeriods(a: SideFigures, b: SideFigures): string {
  if (a.amount === null || b.amount === null) {
    return `${missingName(a, b, "amount")} has no amount yet, so there's no gap to measure.`;
  }
  const diff = b.amount - a.amount;
  if (diff === 0) return `${b.name} matched ${a.name} exactly. There's no gap to close.`;
  if (diff < 0) return `${b.name} would need ${formatAmount(-diff)} more to get back to ${a.name}'s level.`;
  return `${b.name} is already ${formatAmount(diff)} ahead. Keeping that pace is the target.`;
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
