"use client";

import { useMemo, useState } from "react";
import { ArrowLeftRight, Banknote, Receipt, type LucideIcon } from "lucide-react";
// import { Download } from "lucide-react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  WSO2_CHANNEL_SOURCES,
  WSO2_SOURCE_INITIALS,
  WSO2_SOURCE_LABELS,
  type Wso2Source,
} from "@/config/wso2-sources";
import type { DateRange } from "@/lib/date";
import { formatNumber } from "@/lib/format";
import { formatEtb, type SourceRow } from "@/lib/overview";
import { cn } from "@/lib/utils";
import type { SourceTotals } from "@/types/api";

// Success and Failure are hidden: the live WSO2 totals (allAdvanced) carry no
// success/failure figures. Restore them once the API returns those rates.
type Metric = "volume" | "value" /* | "success" | "failure" */ | "avgTicket";

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

function formatMetric(value: number, metric: Metric): string {
  switch (metric) {
    // case "success":
    // case "failure":
    //   return `${(value * 100).toFixed(1)}%`;
    case "value":
    case "avgTicket":
      return formatEtb(value);
    case "volume":
      return formatNumber(value);
  }
}

const NICE_STEPS = [1, 1.2, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10];

/** Top value rounded up to 1, 1.2, 1.5, 2, 2.5, 3, 4, 5, 6, 8 or 10 × a power of 10. */
function niceMax(value: number): number {
  if (value <= 0) return 1;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  const step = NICE_STEPS.find((s) => value / magnitude <= s + 1e-9) ?? 10;
  return step * magnitude;
}

// Success/failure axes, for when those metrics return:
// case "success": return { min: 0.88, max: 1 };
// case "failure": return { min: 0, max: 0.1 };

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
 * Bars and ranked list share one row rhythm (37px rows, 14px apart) so each bar
 * lines up with its list entry. 37px is the list's two text lines at 1.45 line-height.
 */
const ROW_PX = 37;
const LIST_CLASS = "flex flex-col gap-[14px]";
const RANK_ROW_CLASS = "grid h-[37px] grid-cols-[20px_30px_1fr_auto] items-center gap-[10px]";
const CHART_CLASS = "grid grid-cols-[auto_1fr] items-center gap-x-4 gap-y-[14px]";

/** One 37px row per source, then the axis row. */
function chartRows(count: number) {
  return { gridTemplateRows: `repeat(${count}, ${ROW_PX}px) auto` };
}

/** 55.1%, 0.28%, <0.01%: one decimal from 1%, two below, and a floor beyond that. */
function formatPercent(percent: number): string {
  const abs = Math.abs(percent);
  if (abs === 0) return "0%";
  if (abs >= 1) return `${abs.toFixed(1)}%`;
  if (abs >= 0.01) return `${abs.toFixed(2)}%`;
  return "<0.01%";
}

function subLine(row: SourceRow, metric: Metric, totals: SourceTotals): string {
  switch (metric) {
    case "volume":
      return `${formatPercent(totals.totalTransactions ? (row.totalTransactions / totals.totalTransactions) * 100 : 0)} of volume`;
    case "value":
      return `${formatPercent(totals.totalAmount ? (row.totalAmount / totals.totalAmount) * 100 : 0)} of value`;
    case "avgTicket": {
      const overall = totals.totalTransactions ? totals.totalAmount / totals.totalTransactions : 0;
      if (!row.totalTransactions || !overall) return "No transactions";
      const diff = (metricValue(row, metric) / overall - 1) * 100;
      return `${diff < 0 ? "−" : "+"}${formatPercent(diff)} vs overall`;
    }
  }
}

/** Same rows and heights as the loaded card, so nothing shifts when data arrives. */
function LoadingRows() {
  return (
    <div className="grid gap-x-10 gap-y-4 min-[901px]:grid-cols-[1.15fr_1fr]" aria-busy="true">
      <div className={CHART_CLASS} style={chartRows(WSO2_CHANNEL_SOURCES.length)}>
        {WSO2_CHANNEL_SOURCES.map((source, index) => (
          <div key={source} className="contents">
            <span
              className="skeleton-shimmer block h-3 w-24 rounded-full"
              style={{ animationDelay: `${index * 60}ms` }}
            />
            <span className="h-3 rounded-full bg-(--cp-track)" />
          </div>
        ))}
        <div className="col-start-2 text-[11px] invisible" aria-hidden="true">
          0
        </div>
      </div>
      <ol className={LIST_CLASS}>
        {WSO2_CHANNEL_SOURCES.map((source, index) => {
          const delay = { animationDelay: `${index * 60}ms` };
          return (
            <li key={source} className={RANK_ROW_CLASS}>
              <span />
              <span className="skeleton-shimmer size-7 rounded-[7px]" style={delay} />
              <div className="space-y-1.5">
                <span className="skeleton-shimmer block h-3 w-28 rounded-full" style={delay} />
                <span className="skeleton-shimmer block h-2.5 w-36 rounded-full" style={delay} />
              </div>
              <span className="skeleton-shimmer h-3 w-16 rounded-full" style={delay} />
            </li>
          );
        })}
      </ol>
      <span className="sr-only">Loading channel performance</span>
    </div>
  );
}

/** Ranked live totals per WSO2 source, from the same allAdvanced call as the KPIs. */
export function ChannelPerformanceCard({
  data,
  range,
  selected,
  isLoading,
  errorMessage,
}: {
  data: SourceRow[];
  /** The page's period, shown in the subtitle. */
  range: DateRange;
  /** The page's source dropdown: highlights that row and fades the rest. */
  selected: Wso2Source;
  isLoading?: boolean;
  errorMessage?: string;
}) {
  const [metric, setMetric] = useState<Metric>("value");
  const ActiveIcon = METRIC_OPTIONS.find((o) => o.value === metric)?.icon ?? Banknote;
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
  const axisMax = niceMax(Math.max(0, ...data.map((r) => metricValue(r, metric))));
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => f * axisMax);

  return (
    <section className="inter-ui min-w-0 rounded-[14px] border border-(--cp-border) bg-(--cp-card) px-6 py-[22px]">
      <header className="mb-[18px] flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="m-0 text-[15px] font-semibold text-(--rank-text)">Channel performance</h2>
          <p className="mt-[3px] text-[12.5px] text-(--rank-muted)">
            Ranked comparison of channels for {formatSubtitleRange(range)}
          </p>
        </div>
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
          {/* CSV download hidden for now.
          <button
            type="button"
            onClick={() => downloadCsv(sorted)}
            className="inline-flex h-9 items-center gap-1.5 rounded-[10px] border border-border px-3 text-[13px] font-medium text-foreground-2 hover:bg-muted focus-visible:outline-2 focus-visible:outline-primary"
          >
            <Download className="size-3.5" />
            CSV
          </button> */}
        </div>
      </header>

      {isLoading ? (
        <LoadingRows />
      ) : data.length === 0 ? (
        <p className="flex h-[200px] items-center justify-center text-[13px] text-(--rank-muted)">
          {errorMessage ? `Channel figures unavailable: ${errorMessage}` : "No channel figures for this period"}
        </p>
      ) : (
        <div className="grid gap-x-10 gap-y-4 min-[901px]:grid-cols-[1.15fr_1fr]">
          <div role="list" aria-label={`Channels by ${metric}`} className={CHART_CLASS} style={chartRows(sorted.length)}>
            {sorted.map((row) => {
              const faded = selected !== "all" && selected !== row.source;
              return (
                <div key={row.source} role="listitem" className="contents">
                  <span className="max-w-[170px] truncate text-[13px] whitespace-nowrap text-(--rank-text)">
                    {WSO2_SOURCE_LABELS[row.source]}
                  </span>
                  <span className="h-3 overflow-hidden rounded-full bg-(--cp-track)">
                    <span
                      className={cn(
                        "block h-full rounded-full bg-(--rank-accent) transition-[width] duration-[350ms] ease-[ease] motion-reduce:transition-none",
                        faded && "opacity-30",
                      )}
                      style={{ width: `${Math.min(100, (metricValue(row, metric) / axisMax) * 100)}%` }}
                    />
                  </span>
                </div>
              );
            })}
            <div className="col-start-2 flex justify-between text-[11px] text-(--rank-muted) tabular-nums">
              {ticks.map((tick) => (
                <span key={tick}>{formatNumber(tick)}</span>
              ))}
            </div>
          </div>

          <ol className={LIST_CLASS}>
            {sorted.map((row, index) => {
              const isSelected = selected === row.source;
              return (
                <li
                  key={row.source}
                  className={cn(
                    RANK_ROW_CLASS,
                    // Spread shadow pads the highlight without changing the row's size.
                    isSelected && "rounded-[10px] bg-(--rank-accent-soft) shadow-[0_0_0_6px_var(--rank-accent-soft)]",
                  )}
                >
                  <span className="text-center text-[12.5px] text-(--rank-muted) tabular-nums">{index + 1}</span>
                  <span
                    className={cn(
                      "flex size-7 items-center justify-center rounded-[7px] text-[10.5px] font-bold",
                      index === 0
                        ? "bg-(--rank-accent) text-white"
                        : "bg-(--rank-accent-soft) text-(--rank-accent-strong)",
                    )}
                  >
                    {WSO2_SOURCE_INITIALS[row.source]}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-[13.5px] font-medium text-(--rank-text)">
                      {WSO2_SOURCE_LABELS[row.source]}
                    </p>
                    <p className="truncate text-[12px] text-(--rank-muted) tabular-nums">
                      {/* The figure not already shown on the right, so full-length numbers fit. */}
                      {metric === "volume"
                        ? formatEtb(row.totalAmount)
                        : `${formatNumber(row.totalTransactions)} txns`}
                    </p>
                  </div>
                  <div className="text-right tabular-nums">
                    <p className="text-[14px] font-bold text-(--rank-text)">
                      {formatMetric(metricValue(row, metric), metric)}
                    </p>
                    <span className="block text-[11.5px] text-(--rank-muted)">{subLine(row, metric, totals)}</span>
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      )}
    </section>
  );
}
