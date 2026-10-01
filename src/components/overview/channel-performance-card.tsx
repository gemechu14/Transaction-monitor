"use client";

import { useMemo, useState } from "react";
import { Download } from "lucide-react";

import { SectionCard } from "@/components/overview/section-card";
import { Skeleton } from "@/components/ui/skeleton";
import { CHANNELS, type ChannelId } from "@/config/channels";
import { formatCompactNumber } from "@/lib/format";
import { formatEtb, niceAxisMax } from "@/lib/overview";
import { cn } from "@/lib/utils";
import type { OverviewChannelRow } from "@/types/api";

type Metric = "volume" | "value" | "success" | "failure" | "avgTicket";

const METRIC_OPTIONS: { value: Metric; label: string }[] = [
  { value: "volume", label: "Volume" },
  { value: "value", label: "Value" },
  { value: "success", label: "Success" },
  { value: "failure", label: "Failure" },
  { value: "avgTicket", label: "Avg ticket" },
];

/** Metrics a non-admin user may see. */
const USER_METRICS = new Set<Metric>(["volume", "avgTicket", "value"]);

function metricValue(row: OverviewChannelRow, metric: Metric): number {
  switch (metric) {
    case "volume":
      return row.transactionCount;
    case "value":
      return row.totalValue;
    case "success":
      return row.successRate;
    case "failure":
      return 1 - row.successRate;
    case "avgTicket":
      return row.transactionCount ? row.totalValue / row.transactionCount : 0;
  }
}

function formatMetric(value: number, metric: Metric): string {
  switch (metric) {
    case "success":
    case "failure":
      return `${(value * 100).toFixed(1)}%`;
    case "value":
    case "avgTicket":
      return formatEtb(value);
    case "volume":
      return formatCompactNumber(value);
  }
}

/** Axis bounds per metric: fixed where the spec fixes them, otherwise a rounded max. */
function axisFor(metric: Metric, rows: OverviewChannelRow[]): { min: number; max: number } {
  switch (metric) {
    case "volume":
      return { min: 0, max: 200_000 };
    case "success":
      return { min: 0.88, max: 1 };
    case "failure":
      return { min: 0, max: 0.1 };
    default:
      return { min: 0, max: niceAxisMax(Math.max(...rows.map((r) => metricValue(r, metric)), 0)) };
  }
}

function downloadCsv(rows: OverviewChannelRow[], restricted: boolean) {
  const total = rows.reduce((acc, r) => acc + r.transactionCount, 0);
  const header = restricted
    ? ["Channel", "Transactions", "Value", "Avg ticket", "Share %"]
    : ["Channel", "Transactions", "Value", "Success %", "Failure %", "Avg ticket", "Share %"];
  const lines = rows.map((r) => {
    const avgTicket = r.transactionCount ? Math.round(r.totalValue / r.transactionCount) : 0;
    const share = total ? ((r.transactionCount / total) * 100).toFixed(2) : 0;
    const name = CHANNELS[r.channel]?.name ?? r.channel;
    return (
      restricted
        ? [name, r.transactionCount, r.totalValue, avgTicket, share]
        : [
            name,
            r.transactionCount,
            r.totalValue,
            (r.successRate * 100).toFixed(2),
            ((1 - r.successRate) * 100).toFixed(2),
            avgTicket,
            share,
          ]
    ).join(",");
  });
  const blob = new Blob([[header.join(","), ...lines].join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "channel-performance-sep-2026.csv";
  link.click();
  URL.revokeObjectURL(url);
}

export function ChannelPerformanceCard({
  data,
  selected,
  isLoading,
  restricted = false,
}: {
  data: OverviewChannelRow[];
  selected: ChannelId | "all";
  isLoading?: boolean;
  /** Non-admin view: only volume, avg ticket and value. */
  restricted?: boolean;
}) {
  const [metric, setMetric] = useState<Metric>("volume");
  const metricOptions = restricted
    ? METRIC_OPTIONS.filter((option) => USER_METRICS.has(option.value))
    : METRIC_OPTIONS;
  const total = data.reduce((acc, r) => acc + r.transactionCount, 0);

  // Every metric ranks highest first.
  const sorted = useMemo(
    () => [...data].sort((a, b) => metricValue(b, metric) - metricValue(a, metric)),
    [data, metric],
  );
  const axis = axisFor(metric, data);
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => axis.min + f * (axis.max - axis.min));
  const widthFor = (value: number) =>
    Math.min(100, Math.max(0, ((value - axis.min) / (axis.max - axis.min || 1)) * 100));

  return (
    <SectionCard
      title="Channel performance"
      description="Ranked comparison of integrated payment channels and partner banks"
      actions={
        <>
          {metricOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              aria-pressed={metric === option.value}
              onClick={() => setMetric(option.value)}
              className={cn(
                "h-[38px] rounded-full border px-4 text-[13px] font-medium transition-colors focus-visible:outline-2 focus-visible:outline-primary",
                metric === option.value
                  ? "border-primary bg-primary-soft text-primary-strong"
                  : "border-border text-foreground-2 hover:bg-muted",
              )}
            >
              {option.label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => downloadCsv(sorted, restricted)}
            className="inline-flex h-9 items-center gap-1.5 rounded-[10px] border border-border px-3 text-[13px] font-medium text-foreground-2 hover:bg-muted focus-visible:outline-2 focus-visible:outline-primary"
          >
            <Download className="size-3.5" />
            CSV
          </button>
        </>
      }
    >
      {isLoading ? (
        <Skeleton className="h-[340px] w-full" />
      ) : (
        <div className="grid gap-x-10 gap-y-4 min-[901px]:grid-cols-[1.15fr_1fr]">
          <div>
            <ul aria-label={`Channels by ${metric}`}>
              {sorted.map((row) => {
                const value = metricValue(row, metric);
                const faded = selected !== "all" && selected !== row.channel;
                return (
                  <li key={row.channel} className="flex h-11 items-center gap-3">
                    <span className="w-20 shrink-0 truncate text-[13px] text-foreground-2">
                      {CHANNELS[row.channel]?.shortName ?? row.channel}
                    </span>
                    <span className="h-3.5 flex-1 overflow-hidden rounded-[4px] bg-track">
                      <span
                        className={cn(
                          "block h-full rounded-[4px] transition-[width,opacity] duration-[450ms] ease-out motion-reduce:transition-none",
                          "bg-primary",
                          faded && "opacity-30",
                        )}
                        style={{ width: `${widthFor(value)}%` }}
                      />
                    </span>
                  </li>
                );
              })}
            </ul>
            <div className="ml-[92px] flex justify-between pt-1 text-[11px] text-muted-foreground tabular-nums">
              {ticks.map((tick) => (
                <span key={tick}>{formatMetric(tick, metric)}</span>
              ))}
            </div>
          </div>

          <ol>
            {sorted.map((row, index) => {
              const config = CHANNELS[row.channel];
              const isSelected = selected === row.channel;
              return (
                <li
                  key={row.channel}
                  className={cn(
                    "flex h-11 items-center gap-3 rounded-xl px-2",
                    isSelected && "bg-primary-soft",
                  )}
                >
                  <span className="w-4 text-xs font-medium text-muted-foreground tabular-nums">{index + 1}</span>
                  <span
                    className={cn(
                      "flex size-7 shrink-0 items-center justify-center rounded-lg text-[11px] font-bold",
                      index === 0 ? "bg-primary text-primary-foreground" : "bg-primary-soft text-primary-strong",
                    )}
                  >
                    {config?.initials}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">{config?.name ?? row.channel}</p>
                    <p className="truncate text-xs text-muted-foreground tabular-nums">
                      {formatCompactNumber(row.transactionCount)} txns, {formatEtb(row.totalValue)}
                    </p>
                  </div>
                  <div className="text-right tabular-nums">
                    <p className="text-sm font-bold text-foreground">{formatMetric(metricValue(row, metric), metric)}</p>
                    <p className="text-xs text-muted-foreground">
                      {total ? ((row.transactionCount / total) * 100).toFixed(1) : "0.0"}% share
                    </p>
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      )}
    </SectionCard>
  );
}
