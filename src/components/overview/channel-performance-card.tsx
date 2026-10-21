"use client";

import { useMemo } from "react";
// import { useState } from "react"; // with the hidden "Rank by" dropdown
import { ArrowLeftRight, Banknote, Receipt, type LucideIcon } from "lucide-react";
// import { Download } from "lucide-react";

// import {
//   Select,
//   SelectContent,
//   SelectItem,
//   SelectTrigger,
//   SelectValue,
// } from "@/components/ui/select";
import {
  WSO2_CHANNEL_SOURCES,
  WSO2_SOURCE_LABELS,
  type Wso2Source,
} from "@/config/wso2-sources";
import type { DateRange } from "@/lib/date";
import { formatAmountValue, formatNumber } from "@/lib/format";
import type { SourceRow } from "@/lib/overview";
import { cn } from "@/lib/utils";
import type { SourceTotals } from "@/types/api";

// Success and Failure are hidden: the live WSO2 totals (allAdvanced) carry no
// success/failure figures. Restore them once the API returns those rates.
type Metric = "volume" | "value" /* | "success" | "failure" */ | "avgTicket";
export type ChannelMetric = Metric;

const METRIC_OPTIONS: { value: Metric; label: string; hint: string; icon: LucideIcon }[] = [
  { value: "value", label: "Value", hint: "Total amount in ETB", icon: Banknote },
  { value: "volume", label: "Volume", hint: "Number of transactions", icon: ArrowLeftRight },
  // { value: "success", label: "Success", hint: "Success rate", icon: CircleCheck },
  // { value: "failure", label: "Failure", hint: "Failure rate", icon: CircleX },
  { value: "avgTicket", label: "Avg ticket", hint: "Amount per transaction", icon: Receipt },
];

const METRIC_LABELS = Object.fromEntries(METRIC_OPTIONS.map((o) => [o.value, o.label])) as Record<Metric, string>;

function metricValue(row: SourceRow, metric: Metric): number {
  switch (metric) {
    case "volume":
      return row.totalTransactions;
    case "value":
      return row.totalAmount;
    // case "success":
    //   return row.successRate;
    // case "failure":
    //   return 1 - row.successRate;
    case "avgTicket":
      return row.totalTransactions ? row.totalAmount / row.totalTransactions : 0;
  }
}

// Success/failure, for when those metrics return: format as `${(value * 100).toFixed(1)}%`.

const SUBTITLE_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "June", "July", "Aug", "Sept", "Oct", "Nov", "Dec"];

/** "10 Sept 2026" */
function formatSubtitleDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return `${d} ${SUBTITLE_MONTHS[m - 1]} ${y}`;
}

function formatSubtitleRange(range: DateRange): string {
  const from = formatSubtitleDate(range.from);
  return range.from === range.to ? from : `${from} – ${formatSubtitleDate(range.to)}`;
}

// CSV download hidden for now; restore together with the button below.
// function downloadCsv(rows: SourceRow[]) {
//   const total = rows.reduce((acc, r) => acc + r.totalTransactions, 0);
//   const header = ["Source", "Transactions", "Value", "Avg ticket", "Share %"];
//   const lines = rows.map((r) => {
//     const avgTicket = r.totalTransactions ? Math.round(r.totalAmount / r.totalTransactions) : 0;
//     const share = total ? ((r.totalTransactions / total) * 100).toFixed(2) : 0;
//     return [WSO2_SOURCE_LABELS[r.source], r.totalTransactions, r.totalAmount, avgTicket, share].join(",");
//   });
//   const blob = new Blob([[header.join(","), ...lines].join("\n")], { type: "text/csv;charset=utf-8;" });
//   const url = URL.createObjectURL(blob);
//   const link = document.createElement("a");
//   link.href = url;
//   link.download = "channel-performance.csv";
//   link.click();
//   URL.revokeObjectURL(url);
// }

/**
 * Row layouts to compare; change LAYOUT to switch. Every layout ends in a single
 * bar with its figure printed just past the end, scaled to the largest row.
 *   1: condensed, name only (no rank, no context line, no dividers); the
 *      "40.2% of value · 55,632 txns" line shows on hover.
 *   2: rank and name on one line, no context line, no dividers.
 *   3: full: rank, name with the context line under it, row dividers.
 */
const LAYOUT = 1 as 1 | 2 | 3;
// const LAYOUT = 2 as 1 | 2 | 3;

const SHOW_RANK = LAYOUT !== 1;
const SHOW_CONTEXT = LAYOUT === 3;
const SHOW_DIVIDERS = LAYOUT === 3;

const ROW_CLASS = {
  1: "grid grid-cols-[minmax(100px,150px)_minmax(0,1fr)] items-center gap-x-3 py-[5px] max-[640px]:grid-cols-[minmax(0,1fr)] max-[640px]:gap-y-1",
  2: "grid grid-cols-[22px_minmax(100px,150px)_minmax(0,1fr)] items-center gap-x-3 py-[5px] max-[640px]:grid-cols-[22px_minmax(0,1fr)] max-[640px]:gap-y-1",
  3: "grid grid-cols-[22px_minmax(110px,170px)_minmax(0,1fr)] items-center gap-x-4 py-2 max-[640px]:grid-cols-[22px_minmax(0,1fr)] max-[640px]:gap-y-1.5",
}[LAYOUT];
/** On narrow screens the bar drops under the name, lined up after the rank when there is one. */
const BAR_CELL_CLASS = SHOW_RANK ? "max-[640px]:col-start-2" : "";
/** Width kept free after the longest bar so its figure ("615,373,758.67") never clips. */
const LABEL_ROOM_PX = 128;

/** 55.1%, 0.28%, <0.01%: one decimal from 1%, two below, and a floor beyond that. */
function formatPercent(percent: number): string {
  const abs = Math.abs(percent);
  if (abs === 0) return "0%";
  if (abs >= 1) return `${abs.toFixed(1)}%`;
  if (abs >= 0.01) return `${abs.toFixed(2)}%`;
  return "<0.01%";
}

/** The figure on the bar: amounts without "ETB" (the subtitle names the unit). */
function formatBarValue(value: number, metric: Metric): string {
  return metric === "volume" ? formatNumber(value) : formatAmountValue(value);
}

/** Quiet line under the name: share of the total, plus the figure the bar doesn't show. */
function contextLine(row: SourceRow, metric: Metric, totals: SourceTotals): string {
  const share = (part: number, whole: number) => formatPercent(whole ? (part / whole) * 100 : 0);
  switch (metric) {
    case "volume":
      return `${share(row.totalTransactions, totals.totalTransactions)} of transactions`;
    case "value":
      return `${share(row.totalAmount, totals.totalAmount)} of value · ${formatNumber(row.totalTransactions)} txns`;
    case "avgTicket": {
      const overall = totals.totalTransactions ? totals.totalAmount / totals.totalTransactions : 0;
      if (!row.totalTransactions || !overall) return "No transactions";
      const diff = (metricValue(row, metric) / overall - 1) * 100;
      return `${diff < 0 ? "−" : "+"}${formatPercent(diff)} vs overall · ${formatNumber(row.totalTransactions)} txns`;
    }
  }
}

/** Card title per metric, so each card says what it ranks. */
const TITLE: Record<Metric, string> = {
  value: "Value",
  volume: "Transactions",
  avgTicket: "Average ticket",
};

/** Same rows and heights as the loaded card, so nothing shifts when data arrives. */
function LoadingRows() {
  return (
    <ol aria-busy="true">
      {WSO2_CHANNEL_SOURCES.map((source, index) => {
        const delay = { animationDelay: `${index * 60}ms` };
        return (
          <li key={source} className={ROW_CLASS}>
            {SHOW_RANK && <span />}
            {SHOW_CONTEXT ? (
              <div className="space-y-1.5 py-0.5">
                <span className="skeleton-shimmer block h-3 w-28 rounded-full" style={delay} />
                <span className="skeleton-shimmer block h-2.5 w-36 rounded-full" style={delay} />
              </div>
            ) : (
              <span className="flex h-5 items-center">
                <span className="skeleton-shimmer block h-3 w-24 rounded-full" style={delay} />
              </span>
            )}
            <span className={cn("h-3.5 rounded-[4px] bg-(--cp-track)", BAR_CELL_CLASS)} />
          </li>
        );
      })}
      <span className="sr-only">Loading channel performance</span>
    </ol>
  );
}

/** Ranked live totals per WSO2 source, from the same allAdvanced call as the KPIs. */
export function ChannelPerformanceCard({
  data,
  range,
  selected,
  isLoading,
  errorMessage,
  metric,
}: {
  data: SourceRow[];
  /** The page's period, shown in the subtitle. */
  range: DateRange;
  /** The page's source dropdown: highlights that row and fades the rest. */
  selected: Wso2Source;
  isLoading?: boolean;
  errorMessage?: string;
  /** What the card ranks by: one card per metric on the page. */
  metric: ChannelMetric;
}) {
  // "Rank by" dropdown hidden for now; each card shows one fixed metric. To bring
  // it back, restore this state (with `useState` and the Select imports) and the
  // Select in the header, and make the `metric` prop the initial value.
  // const [metric, setMetric] = useState<Metric>(defaultMetric);
  // const ActiveIcon = METRIC_OPTIONS.find((o) => o.value === metric)?.icon ?? Banknote;
  const totals = data.reduce<SourceTotals>(
    (acc, r) => ({
      totalTransactions: acc.totalTransactions + r.totalTransactions,
      totalAmount: acc.totalAmount + r.totalAmount,
    }),
    { totalTransactions: 0, totalAmount: 0 },
  );

  // Every metric ranks highest first.
  const sorted = useMemo(
    () => [...data].sort((a, b) => metricValue(b, metric) - metricValue(a, metric)),
    [data, metric],
  );
  const max = Math.max(0, ...data.map((r) => metricValue(r, metric)));
  // Total line hidden for now; restore together with the footer below.
  // const overall =
  //   metric === "volume"
  //     ? totals.totalTransactions
  //     : metric === "value"
  //       ? totals.totalAmount
  //       : totals.totalTransactions
  //         ? totals.totalAmount / totals.totalTransactions
  //         : 0;

  return (
    <section className="inter-ui min-w-0 rounded-[14px] border border-(--cp-border) bg-(--cp-card) px-6 py-[22px] max-[620px]:px-4">
      <header className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="m-0 text-[15px] font-semibold text-(--rank-text)">Channels by {TITLE[metric].toLowerCase()}</h2>
          <p className="mt-[3px] text-[12.5px] text-(--rank-muted)">
            {metric === "volume" ? "Number of transactions" : "Amounts in ETB"}, {formatSubtitleRange(range)}
          </p>
        </div>
        {/* "Rank by" dropdown hidden for now (see the note at the top of this component).
        <div className="flex flex-wrap items-center gap-2">
          <Select items={METRIC_LABELS} value={metric} onValueChange={(value) => setMetric(value as Metric)}>
            <SelectTrigger
              aria-label="Rank channels by"
              className="w-48 rounded-[10px] bg-card px-3.5 data-[size=default]:h-10"
            >
              <ActiveIcon className="size-4 text-primary-strong" />
              <span className="text-[13px] text-muted-foreground">Rank by</span>
              <SelectValue className="mr-auto text-[13px] font-semibold text-foreground" />
            </SelectTrigger>
            <SelectContent align="end" className="min-w-60 p-1.5">
              {METRIC_OPTIONS.map(({ value, label, hint, icon: Icon }) => (
                <SelectItem key={value} value={value} className="group gap-3 rounded-lg py-2 pr-8 pl-2">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary-strong transition-colors group-data-highlighted:bg-primary group-data-highlighted:text-white">
                    <Icon className="size-4" />
                  </span>
                  <span className="flex flex-col">
                    <span className="text-[13px] font-medium text-foreground">{label}</span>
                    <span className="text-xs text-muted-foreground">{hint}</span>
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          CSV download also hidden:
          <button
            type="button"
            onClick={() => downloadCsv(sorted)}
            className="inline-flex h-9 items-center gap-1.5 rounded-[10px] border border-border px-3 text-[13px] font-medium text-foreground-2 hover:bg-muted focus-visible:outline-2 focus-visible:outline-primary"
          >
            <Download className="size-3.5" />
            CSV
          </button>
        </div> */}
      </header>

      {isLoading ? (
        <LoadingRows />
      ) : data.length === 0 ? (
        <p className="flex h-[200px] items-center justify-center text-[13px] text-(--rank-muted)">
          {errorMessage ? `Channel figures unavailable: ${errorMessage}` : "No channel figures for this period"}
        </p>
      ) : (
        <>
          <ol aria-label={`Channels by ${METRIC_LABELS[metric].toLowerCase()}`}>
            {sorted.map((row, index) => {
              const value = metricValue(row, metric);
              const isSelected = selected === row.source;
              const faded = selected !== "all" && !isSelected;
              const pct = max ? (value / max) * 100 : 0;
              return (
                <li
                  key={row.source}
                  className={cn(
                    ROW_CLASS,
                    SHOW_DIVIDERS && "border-b border-line-soft last:border-b-0",
                    isSelected && "-mx-2 rounded-[10px] border-transparent bg-(--rank-accent-soft) px-2",
                  )}
                >
                  {SHOW_RANK && (
                    <span className="text-right text-[12.5px] text-(--rank-muted) tabular-nums">{index + 1}</span>
                  )}
                  {SHOW_CONTEXT ? (
                    <div className="min-w-0">
                      <p className="truncate text-[13.5px] font-medium text-(--rank-text)">
                        {WSO2_SOURCE_LABELS[row.source]}
                      </p>
                      <p className="truncate text-[11.5px] text-(--rank-muted) tabular-nums">
                        {contextLine(row, metric, totals)}
                      </p>
                    </div>
                  ) : (
                    // No context line here; it shows on hover instead.
                    <p
                      className={cn("truncate text-[13px] text-(--rank-text)", faded && "text-(--rank-muted)")}
                      title={contextLine(row, metric, totals)}
                    >
                      {WSO2_SOURCE_LABELS[row.source]}
                    </p>
                  )}
                  {/* The bar fills the track minus room for its figure, which sits just past the bar's end. */}
                  <div className={cn("min-w-0", BAR_CELL_CLASS)} style={{ paddingRight: LABEL_ROOM_PX }}>
                    <div className="relative flex h-5 items-center">
                      <span
                        className={cn(
                          "block h-3.5 rounded-[4px] bg-(--rank-accent) transition-[width] duration-[350ms] ease-[ease] motion-reduce:transition-none",
                          faded && "opacity-30",
                        )}
                        style={{ width: `${Math.max(value > 0 ? 0.6 : 0, pct)}%` }}
                      />
                      <span
                        className={cn(
                          "absolute pl-2 text-[13px] font-semibold whitespace-nowrap text-(--rank-text) tabular-nums",
                          faded && "text-(--rank-muted)",
                        )}
                        style={{ left: `${pct}%` }}
                      >
                        {formatBarValue(value, metric)}
                      </span>
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
          {/* Total line hidden for now; restore together with `overall` above.
          <p className="mt-3 flex flex-wrap items-baseline justify-between gap-2 border-t border-(--cp-border) pt-3 text-[12.5px] text-(--rank-muted)">
            <span>
              {metric === "avgTicket" ? "Overall average" : "Total"} across {data.length} channels
            </span>
            <span className="text-[14px] font-bold text-(--rank-text) tabular-nums">
              {formatBarValue(overall, metric)}
              {metric !== "volume" && <span className="ml-1 text-[12px] font-medium text-(--rank-muted)">ETB</span>}
            </span>
          </p> */}
        </>
      )}
    </section>
  );
}
