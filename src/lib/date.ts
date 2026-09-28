export const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sept",
  "Oct",
  "Nov",
  "Dec",
];

export function toISODate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

/** Inclusive range of the last `n` days, ending on `end` (defaults to today). */
export function getLastNDays(n: number, end: Date = new Date()): DateRange {
  const to = new Date(end);
  const from = addDays(to, -(n - 1));
  return { from: toISODate(from), to: toISODate(to) };
}

export interface DateRange {
  from: string;
  to: string;
}

export function eachDay(from: string, to: string): string[] {
  const days: string[] = [];
  let cursor = new Date(from);
  const last = new Date(to);
  while (cursor <= last) {
    days.push(toISODate(cursor));
    cursor = addDays(cursor, 1);
  }
  return days;
}

/** The immediately preceding period of the same length, for period-over-period comparisons. */
export function shiftRangeBack(range: DateRange): DateRange {
  const days = eachDay(range.from, range.to).length;
  const to = addDays(new Date(range.from), -1);
  const from = addDays(to, -(days - 1));
  return { from: toISODate(from), to: toISODate(to) };
}

/** The full calendar month (1st to last day) containing `date`. */
export function getMonthRange(date: Date): DateRange {
  const from = new Date(date.getFullYear(), date.getMonth(), 1);
  const to = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  return { from: toISODate(from), to: toISODate(to) };
}

/** Formats "YYYY-MM-DD" as "17 Aug" without going through Date/timezone conversion. */
export function formatDateLabel(iso: string): string {
  const [, month, day] = iso.split("-").map(Number);
  return `${day} ${MONTHS[month - 1]}`;
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** Formats "YYYY-MM-DD" as "Wed 17 Aug", using UTC to avoid local-timezone day-of-week drift. */
export function formatDayLabel(iso: string): string {
  const weekday = WEEKDAYS[new Date(`${iso}T00:00:00Z`).getUTCDay()];
  return `${weekday} ${formatDateLabel(iso)}`;
}

/** Formats an hourly point's "YYYY-MM-DDTHH:00" timestamp as "HH:00". */
export function formatHourLabel(timestamp: string): string {
  return timestamp.slice(11, 16);
}

export function formatDateRangeLabel(range: DateRange): string {
  const [fy, fm, fd] = range.from.split("-").map(Number);
  const [ty, tm, td] = range.to.split("-").map(Number);
  return `${fd} ${MONTHS[fm - 1]} ${fy} — ${td} ${MONTHS[tm - 1]} ${ty}`;
}

/** Formats an ISO timestamp as "15 Sept 2026, 09:43" in UTC, for transaction-level tables. */
export function formatDateTimeUTC(iso: string): string {
  const date = new Date(iso);
  const day = date.getUTCDate();
  const month = MONTHS[date.getUTCMonth()];
  const year = date.getUTCFullYear();
  const hours = String(date.getUTCHours()).padStart(2, "0");
  const minutes = String(date.getUTCMinutes()).padStart(2, "0");
  return `${day} ${month} ${year}, ${hours}:${minutes}`;
}
