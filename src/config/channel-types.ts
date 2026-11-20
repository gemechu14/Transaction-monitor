import type { ChannelInfo, ChannelType } from "@/types/channels";

export const CHANNEL_TYPES: ChannelType[] = [
  "normal",
  "nightly",
  "monthly",
  "yearly",
  "seasonal",
];

export const CHANNEL_TYPE_LABELS: Record<ChannelType, string> = {
  normal: "Continuous payments",
  nightly: "Daily batch settlement",
  monthly: "Monthly billing cycle",
  yearly: "Annual payment cycle",
  seasonal: "Seasonal payments",
};

/** One line per type for the edit dialog. */
export const CHANNEL_TYPE_HINTS: Record<ChannelType, string> = {
  normal: "People pay any day, any time; no regular peak.",
  nightly: "Payments are settled once a day, in an overnight batch.",
  monthly:
    "Payments peak once a month, e.g. utility bills around the billing date.",
  yearly: "Payments peak once a year, e.g. annual fees or taxes.",
  seasonal: "Payments happen only in certain months, e.g. Hajj.",
};

export const MONTH_NAMES = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

/** A channel without a saved row, or without a type, is "normal" (continuous payments). */
export function channelType(info: ChannelInfo | undefined): ChannelType {
  return info?.channelType ?? "normal";
}

/**
 * Months (1–12) as "May–Jul" when they run on, including across the year end ("Nov–Jan"),
 * otherwise "May, Jul, Sep". Empty string for none.
 */
export function formatActiveMonths(
  months: readonly number[] | null | undefined,
): string {
  const set = [
    ...new Set((months ?? []).filter((m) => m >= 1 && m <= 12)),
  ].sort((a, b) => a - b);
  if (set.length === 0) return "";
  if (set.length === 12) return "All year";
  if (set.length === 1) return MONTH_NAMES[set[0] - 1];
  const has = (m: number) => set.includes(((m - 1 + 12) % 12) + 1);
  // A run starts at a month whose previous month isn't selected; one start means one unbroken run.
  const starts = set.filter((m) => !has(m - 1));
  if (starts.length === 1) {
    const start = starts[0];
    const end = ((start - 1 + set.length - 1) % 12) + 1;
    return `${MONTH_NAMES[start - 1]}–${MONTH_NAMES[end - 1]}`;
  }
  return set.map((m) => MONTH_NAMES[m - 1]).join(", ");
}
