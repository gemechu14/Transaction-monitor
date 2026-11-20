/**
 * Detailed, plain-language analysis of a daily series for the Overview chart's info popover:
 * summary figures, high-volume spikes, peak and quietest day, when spikes happen, the
 * day-of-week pattern, the trend, and gaps. Pure and rule-based, so the same series always
 * gives the same sentences.
 */

export interface InsightDay {
  /** ISO date, "2026-08-20". */
  date: string;
  value: number;
}

export type InsightTone =
  "summary" | "high" | "up" | "down" | "neutral" | "warning" | "ok";

export interface InsightBar {
  label: string;
  value: number;
  /** Formatted figure shown next to the bar. */
  display: string;
  highlight?: boolean;
}

export interface InsightSection {
  id: string;
  tone: InsightTone;
  title: string;
  /** One-sentence takeaway, shown in bold under the title. */
  summary: string;
  points: string[];
  /** Optional small bar list, e.g. averages per weekday. */
  bars?: InsightBar[];
  barsCaption?: string;
}

export interface DailyInsights {
  /** Days strictly above this count as high volume; null when no day crosses it or the series is too short. */
  highThreshold: number | null;
  /** ISO dates of the high-volume days. */
  highDates: Set<string>;
  sections: InsightSection[];
}

/** Fewer full days than this and any pattern is noise, so only the summary is shown. */
const MIN_DAYS = 7;
/** Day-of-week, weekend and trend analysis need at least two of each weekday. */
const MIN_PATTERN_DAYS = 14;
/** 25th – 5th of the month: 12 of ~30.4 days, the share expected by chance. */
const MONTH_TURN_CHANCE = 12 / 30.4;

const WEEKDAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];
const WEEKDAYS_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
/** Monday first, the way the bank's week reads. */
const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];
const MONTHS = [
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

function quantile(sorted: number[], q: number): number {
  const pos = (sorted.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
}

function weekdayOf(iso: string): number {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

function dayOfMonth(iso: string): number {
  return Number(iso.slice(8, 10));
}

function nextIso(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + 1)).toISOString().slice(0, 10);
}

function todayIso(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
const mean = (xs: number[]) => (xs.length ? sum(xs) / xs.length : 0);
const pct = (x: number) => `${Math.round(x * 100)}%`;
const times = (x: number) => `${x >= 10 ? Math.round(x) : x.toFixed(1)}×`;
const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

export function buildDailyInsights(
  days: InsightDay[],
  format: (value: number) => string,
  formatDate: (iso: string) => string,
  /** "amount" or "transactions", used in the sentences. */
  noun: string,
): DailyInsights {
  const result: DailyInsights = {
    highThreshold: null,
    highDates: new Set(),
    sections: [],
  };
  const sections = result.sections;
  const dayName = (iso: string) =>
    `${WEEKDAYS_SHORT[weekdayOf(iso)]} ${formatDate(iso)}`;

  // Today is still filling up, so it would read as a dip or a silent day.
  const today = todayIso();
  const todayPoint = days.find((d) => d.date === today);
  const complete = days.filter((d) => d.date !== today);
  const n = complete.length;

  if (n === 0) {
    if (todayPoint) {
      sections.push({
        id: "summary",
        tone: "summary",
        title: "Today so far",
        summary: `${format(todayPoint.value)} so far today.`,
        points: [
          "The period only covers today, which isn't over yet, so there is nothing to compare it with.",
          `Pick a period of at least ${MIN_DAYS} days to see spikes, the weekly pattern and the trend.`,
        ],
      });
    }
    return result;
  }

  const values = complete.map((d) => d.value);
  const total = sum(values);
  const average = mean(values);
  const sorted = [...values].sort((a, b) => a - b);
  const median = quantile(sorted, 0.5);
  const q1 = quantile(sorted, 0.25);
  const q3 = quantile(sorted, 0.75);
  const sd = Math.sqrt(mean(values.map((v) => (v - average) ** 2)));
  const cv = average > 0 ? sd / average : 0;
  const peak = complete.reduce((best, d) => (d.value > best.value ? d : best));
  const quietest = complete.reduce((low, d) => (d.value < low.value ? d : low));

  // ---- Summary -------------------------------------------------------------------------------
  const variability =
    cv < 0.35
      ? "steady from day to day"
      : cv < 0.8
        ? "moderately variable"
        : "very spiky";
  const summaryPoints = [
    `Daily average ${format(average)}. A typical (median) day is ${format(median)}: half the days were above it, half below.`,
  ];
  if (median > 0 && average > median * 1.3) {
    summaryPoints.push(
      `The average is ${times(average / median)} the typical day because a few very large days pull it up, so the median is the better guide to a normal day.`,
    );
  }
  summaryPoints.push(
    `The middle half of days fell between ${format(q1)} and ${format(q3)}.`,
    `Range: ${format(quietest.value)} (${dayName(quietest.date)}) to ${format(peak.value)} (${dayName(peak.date)}).`,
    `Activity is ${variability}: the standard deviation is ${pct(cv)} of the average.`,
  );
  if (todayPoint) {
    summaryPoints.push(
      `Today (${formatDate(today)}) so far: ${format(todayPoint.value)}. It is left out of every figure here because the day isn't over.`,
    );
  }
  if (n < MIN_DAYS) {
    summaryPoints.push(
      `Patterns need at least ${MIN_DAYS} full days; pick a longer period to see spikes, the weekly pattern and the trend.`,
    );
  }
  sections.push({
    id: "summary",
    tone: "summary",
    title: "Summary",
    summary: `${format(total)} over ${plural(n, "full day")}, ${variability}.`,
    points: summaryPoints,
  });
  if (n < MIN_DAYS || total <= 0) return result;

  // ---- High-volume days ----------------------------------------------------------------------
  // Tukey's upper fence (Q3 + 1.5 × IQR): a few spikes can't drag it up the way they drag up the
  // mean. Also at least 1.5× the average, so a flat series flags nothing.
  const threshold = Math.max(q3 + 1.5 * (q3 - q1), average * 1.5);
  const high = complete.filter((d) => d.value > threshold);
  result.highDates = new Set(high.map((d) => d.date));
  const howThreshold =
    `"High volume" means above ${format(threshold)}: the 75th-percentile day (${format(q3)}) plus 1.5× the spread ` +
    `of the middle half of days (${format(q3 - q1)}), and never less than 1.5× the average. Unlike the average, ` +
    `a few big spikes barely move this line.`;

  if (high.length) {
    result.highThreshold = threshold;
    const highTotal = sum(high.map((d) => d.value));
    const rest = complete.filter((d) => d.value <= threshold);
    const points = [
      howThreshold,
      `Together they carried ${format(highTotal)}, ${pct(highTotal / total)} of the period's ${noun}, on only ${pct(high.length / n)} of the days.`,
      `On the other ${plural(rest.length, "day")} the average was ${format(mean(rest.map((d) => d.value)))}; the high-volume days averaged ${format(highTotal / high.length)}, ${times(highTotal / high.length / Math.max(mean(rest.map((d) => d.value)), 1))} as much.`,
    ];

    // Longest run of consecutive high-volume days.
    let best: InsightDay[] = [];
    let run: InsightDay[] = [];
    for (const d of high) {
      run =
        run.length && nextIso(run[run.length - 1].date) === d.date
          ? [...run, d]
          : [d];
      if (run.length > best.length) best = run;
    }
    if (best.length >= 2) {
      points.push(
        `Longest streak: ${best.length} high-volume days in a row, ${formatDate(best[0].date)} – ${formatDate(best[best.length - 1].date)}.`,
      );
    } else {
      points.push(
        "No two high-volume days were back to back; each spike lasted a single day.",
      );
    }

    const top = [...high].sort((a, b) => b.value - a.value).slice(0, 6);
    sections.push({
      id: "high-volume",
      tone: "high",
      title: "High-volume days",
      summary: `${plural(high.length, "day")} stood out well above a normal day.`,
      points,
      bars: top.map((d) => ({
        label: dayName(d.date),
        value: d.value,
        display: `${format(d.value)} · ${times(d.value / average)}`,
        highlight: true,
      })),
      barsCaption:
        high.length > top.length
          ? `Largest ${top.length} of ${high.length}, × the daily average`
          : "× the daily average",
    });
  } else {
    sections.push({
      id: "high-volume",
      tone: "ok",
      title: "High-volume days",
      summary: "No day stood out from the rest.",
      points: [howThreshold, "Every day in the period stayed below that line."],
    });
  }

  // ---- Peak and quietest day -----------------------------------------------------------------
  const peakPoints = [
    `Peak: ${dayName(peak.date)} with ${format(peak.value)}, ${times(peak.value / average)} the daily average` +
      (median > 0 ? ` and ${times(peak.value / median)} a typical day.` : "."),
    `That single day made up ${pct(peak.value / total)} of the whole period's ${noun}.`,
  ];
  const runnerUp = [...complete].sort((a, b) => b.value - a.value)[1];
  if (runnerUp) {
    peakPoints.push(
      `Second highest: ${dayName(runnerUp.date)} with ${format(runnerUp.value)}` +
        (runnerUp.value > 0 && peak.value / runnerUp.value >= 1.15
          ? `, so the peak was ${times(peak.value / runnerUp.value)} the next best day.`
          : ", close to the peak, so the top wasn't a one-off."),
    );
  }
  peakPoints.push(
    quietest.value === 0
      ? `Quietest: ${dayName(quietest.date)} with no activity at all.`
      : `Quietest: ${dayName(quietest.date)} with ${format(quietest.value)}, ${pct(quietest.value / Math.max(average, 1))} of the daily average.`,
  );
  sections.push({
    id: "peak",
    tone: "up",
    title: "Peak and quietest day",
    summary: `Busiest on ${dayName(peak.date)}, quietest on ${dayName(quietest.date)}.`,
    points: peakPoints,
  });

  // ---- When the spikes happen ----------------------------------------------------------------
  if (high.length >= 3) {
    const monthTurn = high.filter(
      (d) => dayOfMonth(d.date) >= 25 || dayOfMonth(d.date) <= 5,
    ).length;
    const midMonth = high.filter(
      (d) => dayOfMonth(d.date) >= 10 && dayOfMonth(d.date) <= 20,
    ).length;
    const byWeekday = new Map<number, number>();
    for (const d of high)
      byWeekday.set(
        weekdayOf(d.date),
        (byWeekday.get(weekdayOf(d.date)) ?? 0) + 1,
      );
    const [topWeekday, topCount] = [...byWeekday].sort(
      (a, b) => b[1] - a[1],
    )[0];
    const monthTurnShare = monthTurn / high.length;

    let summary: string;
    if (monthTurnShare >= 0.6) {
      summary =
        "Spikes cluster around the turn of the month, typical of salary and billing cycles.";
    } else if (topCount / high.length >= 0.4) {
      summary = `Spikes tend to fall on ${WEEKDAYS[topWeekday]}s.`;
    } else {
      summary =
        "Spikes don't follow a calendar pattern; they are likely event-driven (campaigns, deadlines, bulk payments).";
    }

    sections.push({
      id: "timing",
      tone: "neutral",
      title: "When the spikes happen",
      summary,
      points: [
        `${monthTurn} of ${high.length} high-volume days (${pct(monthTurnShare)}) fell between the 25th and the 5th. By chance you'd expect about ${pct(MONTH_TURN_CHANCE)}.`,
        `${midMonth} of ${high.length} fell in mid-month (10th – 20th).`,
        `By weekday: ${WEEK_ORDER.filter((w) => byWeekday.has(w))
          .map((w) => `${WEEKDAYS_SHORT[w]} ${byWeekday.get(w)}`)
          .join(", ")}.`,
      ],
    });
  }

  if (n < MIN_PATTERN_DAYS) {
    pushGaps();
    return result;
  }

  // ---- Day of week ---------------------------------------------------------------------------
  const weekdayAverages = WEEK_ORDER.map((w) => {
    const vs = complete
      .filter((d) => weekdayOf(d.date) === w)
      .map((d) => d.value);
    return { w, avg: mean(vs), days: vs.length };
  }).filter((x) => x.days > 0);
  const busiestWd = weekdayAverages.reduce((a, b) => (b.avg > a.avg ? b : a));
  const quietestWd = weekdayAverages.reduce((a, b) => (b.avg < a.avg ? b : a));
  const weekendVals = complete
    .filter((d) => [0, 6].includes(weekdayOf(d.date)))
    .map((d) => d.value);
  const weekdayVals = complete
    .filter((d) => ![0, 6].includes(weekdayOf(d.date)))
    .map((d) => d.value);
  const weekendDiff =
    mean(weekdayVals) > 0 ? mean(weekendVals) / mean(weekdayVals) - 1 : 0;

  const weekPoints = [
    `Busiest weekday on average: ${WEEKDAYS[busiestWd.w]} (${format(busiestWd.avg)}, ${pct(busiestWd.avg / average - 1)} above the overall average).`,
    `Quietest: ${WEEKDAYS[quietestWd.w]} (${format(quietestWd.avg)}, ${pct(Math.abs(quietestWd.avg / average - 1))} ${quietestWd.avg < average ? "below" : "above"} average).`,
  ];
  if (weekendVals.length) {
    weekPoints.push(
      Math.abs(weekendDiff) < 0.15
        ? `Weekends (${format(mean(weekendVals))} a day) are close to weekdays (${format(mean(weekdayVals))} a day).`
        : `Weekends average ${format(mean(weekendVals))} a day against ${format(mean(weekdayVals))} on weekdays, ${pct(Math.abs(weekendDiff))} ${weekendDiff < 0 ? "less" : "more"}.`,
    );
  }
  weekPoints.push(
    "A single big spike can lift one weekday's average, so check the spikes above before reading too much into this.",
  );
  sections.push({
    id: "weekday",
    tone: "neutral",
    title: "Day of the week",
    summary:
      weekendVals.length && Math.abs(weekendDiff) >= 0.15
        ? `Weekends are ${pct(Math.abs(weekendDiff))} ${weekendDiff < 0 ? "quieter" : "busier"} than weekdays.`
        : `${WEEKDAYS[busiestWd.w]} is the busiest day of the week.`,
    points: weekPoints,
    bars: weekdayAverages.map((x) => ({
      label: WEEKDAYS_SHORT[x.w],
      value: x.avg,
      display: format(x.avg),
      highlight: x.w === busiestWd.w,
    })),
    barsCaption: "Average per weekday",
  });

  // ---- Trend ---------------------------------------------------------------------------------
  const mid = Math.floor(n / 2);
  const firstHalf = complete.slice(0, mid);
  const secondHalf = complete.slice(n - mid);
  const before = mean(firstHalf.map((d) => d.value));
  const after = mean(secondHalf.map((d) => d.value));
  const change = before > 0 ? after / before - 1 : 0;
  const last7 = complete.slice(-7);
  const prev7 = complete.slice(-14, -7);
  const weekChange =
    mean(prev7.map((d) => d.value)) > 0
      ? mean(last7.map((d) => d.value)) / mean(prev7.map((d) => d.value)) - 1
      : 0;
  const span = (xs: InsightDay[]) =>
    `${formatDate(xs[0].date)} – ${formatDate(xs[xs.length - 1].date)}`;
  const direction = (c: number) =>
    Math.abs(c) < 0.1
      ? "about the same as"
      : c > 0
        ? `up ${pct(c)} on`
        : `down ${pct(-c)} on`;

  const trendPoints = [
    `Second half (${span(secondHalf)}): ${format(after)} a day, ${direction(change)} the first half (${span(firstHalf)}, ${format(before)} a day).`,
    `Last 7 full days (${span(last7)}): ${format(mean(last7.map((d) => d.value)))} a day, ${direction(weekChange)} the 7 days before.`,
  ];

  // Per-day average by calendar month, since the first and last months may be partial.
  const months = new Map<string, number[]>();
  for (const d of complete)
    months.set(d.date.slice(0, 7), [
      ...(months.get(d.date.slice(0, 7)) ?? []),
      d.value,
    ]);
  const monthRows = [...months].map(([key, vs]) => ({
    key,
    avg: mean(vs),
    days: vs.length,
  }));
  let bars: InsightBar[] | undefined;
  if (monthRows.length >= 2) {
    const bestMonth = monthRows.reduce((a, b) => (b.avg > a.avg ? b : a));
    const worstMonth = monthRows.reduce((a, b) => (b.avg < a.avg ? b : a));
    const monthName = (key: string) =>
      `${MONTHS[Number(key.slice(5, 7)) - 1]} ${key.slice(0, 4)}`;
    trendPoints.push(
      `Strongest month: ${monthName(bestMonth.key)} at ${format(bestMonth.avg)} a day; weakest: ${monthName(worstMonth.key)} at ${format(worstMonth.avg)} a day.`,
    );
    if (monthRows.some((m) => m.days < 20)) {
      trendPoints.push(
        "Months with fewer days in the period (the first and last) are compared per day, so they are not penalised for being partial.",
      );
    }
    bars = monthRows.map((m) => ({
      label: MONTHS[Number(m.key.slice(5, 7)) - 1],
      value: m.avg,
      display: format(m.avg),
      highlight: m.key === bestMonth.key,
    }));
  }
  sections.push({
    id: "trend",
    tone: Math.abs(change) < 0.1 ? "neutral" : change > 0 ? "up" : "down",
    title: "Trend",
    summary:
      Math.abs(change) < 0.1
        ? "Broadly steady across the period."
        : `${change > 0 ? "Growing" : "Declining"}: the second half is ${change > 0 ? "up" : "down"} ${pct(Math.abs(change))} on the first.`,
    points: trendPoints,
    bars,
    barsCaption: bars ? "Average per day, by month" : undefined,
  });

  pushGaps();
  return result;

  // ---- Gaps and unusually quiet days ---------------------------------------------------------
  function pushGaps() {
    const silent = complete.filter((d) => d.value === 0);
    const low = complete.filter(
      (d) => d.value > 0 && median > 0 && d.value < median * 0.25,
    );
    const list = (xs: InsightDay[]) =>
      xs
        .slice(0, 6)
        .map((d) => dayName(d.date))
        .join(", ") + (xs.length > 6 ? ` and ${xs.length - 6} more` : "");
    const points: string[] = [];
    if (silent.length) {
      points.push(
        `No activity at all on ${list(silent)}. On a live channel this usually means an outage, a stopped feed or a holiday closure.`,
      );
    }
    if (low.length) {
      points.push(
        `Unusually quiet (under a quarter of a typical day, ${format(median * 0.25)}): ${list(low)}.`,
      );
    }
    if (!silent.length && !low.length) {
      points.push(
        `Every day had activity, and none fell below a quarter of a typical day (${format(median * 0.25)}).`,
      );
    }
    sections.push({
      id: "gaps",
      tone: silent.length ? "warning" : low.length ? "neutral" : "ok",
      title: "Gaps and quiet days",
      summary: silent.length
        ? `${plural(silent.length, "day")} with no activity; worth checking for an outage.`
        : low.length
          ? `${plural(low.length, "day")} were unusually quiet.`
          : "No gaps in the period.",
      points,
    });
  }
}
