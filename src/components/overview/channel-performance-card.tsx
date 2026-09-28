"use client";

import { useMemo, useState } from "react";
import { Download } from "lucide-react";
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { CHANNELS } from "@/config/channels";
import { NEUTRAL_BORDER, NEUTRAL_TEXT } from "@/config/colors";
import { formatCompactNumber, formatCurrencyCompact, formatPercent } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { ChannelSummary } from "@/types/api";

type Metric = "volume" | "value" | "success" | "failure" | "avgTicket" | "latency" | "netPosition";

const METRIC_OPTIONS: { value: Metric; label: string }[] = [
  { value: "volume", label: "Volume" },
  { value: "value", label: "Value" },
  { value: "success", label: "Success" },
  { value: "failure", label: "Failure" },
  { value: "avgTicket", label: "Avg ticket" },
  { value: "latency", label: "Latency" },
  { value: "netPosition", label: "Net position" },
];

function metricValue(summary: ChannelSummary, metric: Metric): number {
  switch (metric) {
    case "volume":
      return summary.transactionCount;
    case "value":
      return summary.totalValue;
    case "success":
      return summary.successRate;
    case "failure":
      return summary.transactionCount ? summary.failedCount / summary.transactionCount : 0;
    case "avgTicket":
      return summary.transactionCount ? summary.totalValue / summary.transactionCount : 0;
    case "latency":
      return summary.avgLatencyMs ?? 0;
    case "netPosition":
      return summary.incomingValue - summary.outgoingValue;
  }
}

function formatMetric(value: number, metric: Metric): string {
  switch (metric) {
    case "success":
    case "failure":
      return formatPercent(value, 1);
    case "value":
    case "avgTicket":
    case "netPosition":
      return formatCurrencyCompact(value);
    case "latency":
      return `${Math.round(value)} ms`;
    case "volume":
    default:
      return formatCompactNumber(value);
  }
}

function downloadChannelSummaryCsv(rows: ChannelSummary[]) {
  const header = [
    "Channel",
    "Transactions",
    "Value",
    "Success rate",
    "Failed",
    "Net position",
    "Avg latency (ms)",
  ];
  const lines = rows.map((s) => {
    const name = CHANNELS[s.channel]?.name ?? s.channel;
    return [
      name,
      s.transactionCount,
      s.totalValue,
      (s.successRate * 100).toFixed(2),
      s.failedCount,
      s.incomingValue - s.outgoingValue,
      s.avgLatencyMs ?? "",
    ].join(",");
  });
  const csv = [header.join(","), ...lines].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "channel-performance.csv";
  link.click();
  URL.revokeObjectURL(url);
}

export function ChannelPerformanceCard({
  data,
  isLoading,
}: {
  data: ChannelSummary[];
  isLoading?: boolean;
}) {
  const [metric, setMetric] = useState<Metric>("volume");
  const totalCount = data.reduce((acc, s) => acc + s.transactionCount, 0);

  const sorted = useMemo(
    () => [...data].sort((a, b) => metricValue(b, metric) - metricValue(a, metric)),
    [data, metric],
  );

  const chartRows = sorted.map((s) => ({
    channel: s.channel,
    name: CHANNELS[s.channel]?.shortName ?? s.channel,
    value: metricValue(s, metric),
    color: CHANNELS[s.channel]?.color ?? NEUTRAL_TEXT,
  }));

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col items-start gap-3 @lg/card-header:flex-row @lg/card-header:items-center @lg/card-header:justify-between">
          <div>
            <CardTitle>Channel performance</CardTitle>
            <CardDescription>
              Ranked comparison of integrated payment channels and partner banks
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {METRIC_OPTIONS.map((option) => (
              <Button
                key={option.value}
                size="sm"
                variant="outline"
                className={cn(
                  "h-7 px-2.5 text-xs",
                  metric === option.value
                    ? "border-primary/50 bg-primary/10 text-primary hover:bg-primary/15"
                    : "text-muted-foreground",
                )}
                onClick={() => setMetric(option.value)}
              >
                {option.label}
              </Button>
            ))}
            <Button
              size="sm"
              variant="outline"
              className="h-7 gap-1 px-2.5 text-xs text-muted-foreground"
              onClick={() => downloadChannelSummaryCsv(sorted)}
            >
              <Download className="size-3.5" />
              CSV
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-72 w-full" />
        ) : (
          <div
            key={metric}
            className="grid animate-in fade-in slide-in-from-bottom-2 gap-6 duration-500 ease-out lg:grid-cols-[1.3fr_1fr]"
          >
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartRows}
                  layout="vertical"
                  margin={{ top: 4, right: 16, left: 8, bottom: 4 }}
                >
                  <XAxis
                    type="number"
                    tickFormatter={(value) => formatMetric(value, metric)}
                    tick={{ fontSize: 11, fill: NEUTRAL_TEXT }}
                    axisLine={{ stroke: NEUTRAL_BORDER }}
                    tickLine={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={92}
                    tick={{ fontSize: 12, fill: NEUTRAL_TEXT }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    cursor={{ fill: "rgba(0,0,0,0.03)" }}
                    contentStyle={{
                      borderRadius: 8,
                      fontSize: 12,
                      border: `1px solid ${NEUTRAL_BORDER}`,
                    }}
                    formatter={(value) => [formatMetric(Number(value), metric), "Value"]}
                  />
                  <Bar
                    dataKey="value"
                    radius={[0, 4, 4, 0]}
                    barSize={16}
                    isAnimationActive
                    animationDuration={600}
                    animationEasing="ease-out"
                  >
                    {chartRows.map((row) => (
                      <Cell key={row.channel} fill={row.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <ol className="flex flex-col divide-y divide-border">
              {sorted.map((summary, index) => {
                const config = CHANNELS[summary.channel];
                return (
                  <li
                    key={summary.channel}
                    className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0"
                  >
                    <span className="w-4 text-xs font-medium text-muted-foreground">
                      {index + 1}
                    </span>
                    <span
                      className="size-2 shrink-0 rounded-full"
                      style={{ backgroundColor: config?.color }}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">
                        {config?.name ?? summary.channel}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {formatCompactNumber(summary.transactionCount)} txns ·{" "}
                        {formatCurrencyCompact(summary.totalValue)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-foreground">
                        {formatPercent(summary.successRate, 1)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatPercent(totalCount ? summary.transactionCount / totalCount : 0, 1)}{" "}
                        share
                      </p>
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
