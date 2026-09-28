import {
  addDays,
  formatDateLabel,
  formatDayLabel,
  getLastNDays,
  getMonthRange,
  toISODate,
  type DateRange,
} from "@/lib/date";

export type ComparisonMode = "day" | "week" | "month";

export interface PeriodOption {
  value: string;
  label: string;
  range: DateRange;
}

export const COMPARISON_MODE_OPTIONS: { value: ComparisonMode; label: string }[] = [
  { value: "day", label: "Day vs day" },
  { value: "week", label: "Week vs week" },
  { value: "month", label: "Month vs month" },
];

const FULL_MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export function buildDayOptions(count = 30): PeriodOption[] {
  const today = new Date();
  return Array.from({ length: count }, (_, i) => {
    const iso = toISODate(addDays(today, -i));
    return { value: iso, label: formatDayLabel(iso), range: { from: iso, to: iso } };
  });
}

export function buildWeekOptions(count = 12): PeriodOption[] {
  const today = new Date();
  return Array.from({ length: count }, (_, i) => {
    const end = addDays(today, -1 - i * 7);
    const range = getLastNDays(7, end);
    return { value: range.to, label: `Week of ${formatDateLabel(range.to)}`, range };
  });
}

export function buildMonthOptions(count = 12): PeriodOption[] {
  const today = new Date();
  return Array.from({ length: count }, (_, i) => {
    const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
    const range = getMonthRange(date);
    const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    return { value, label: `${FULL_MONTHS[date.getMonth()]} ${date.getFullYear()}`, range };
  });
}
