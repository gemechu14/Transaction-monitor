"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { type AggregatedChannelStats, pctChange } from "@/lib/aggregate-channel-summary";
import { formatCompactNumber, formatCurrencyCompact, formatSignedPercent } from "@/lib/format";
import { cn } from "@/lib/utils";

type Tone = "higher-is-better" | "lower-is-better" | "neutral";

interface StatRow {
  label: string;
  a: string;
  b: string;
  deltaLabel: string;
  tone: Tone;
  delta: number;
}

function ppLabel(diff: number): string {
  const pts = diff * 100;
  const sign = pts > 0 ? "+" : "";
  return `${sign}${pts.toFixed(1)} pp`;
}

function buildRows(a: AggregatedChannelStats, b: AggregatedChannelStats): StatRow[] {
  const successDelta = b.successRate - a.successRate;
  const latencyDelta = pctChange(b.avgLatencyMs, a.avgLatencyMs);
  const netDelta = pctChange(b.netPosition, a.netPosition);
  const ticketDelta = pctChange(b.avgTicket, a.avgTicket);

  return [
    {
      label: "Transactions",
      a: formatCompactNumber(a.transactionCount),
      b: formatCompactNumber(b.transactionCount),
      delta: pctChange(b.transactionCount, a.transactionCount),
      deltaLabel: formatSignedPercent(pctChange(b.transactionCount, a.transactionCount)),
      tone: "higher-is-better",
    },
    {
      label: "Total value",
      a: formatCurrencyCompact(a.totalValue, "ETB", 2),
      b: formatCurrencyCompact(b.totalValue, "ETB", 2),
      delta: pctChange(b.totalValue, a.totalValue),
      deltaLabel: formatSignedPercent(pctChange(b.totalValue, a.totalValue)),
      tone: "higher-is-better",
    },
    {
      label: "Success rate",
      a: `${(a.successRate * 100).toFixed(1)}%`,
      b: `${(b.successRate * 100).toFixed(1)}%`,
      delta: successDelta,
      deltaLabel: ppLabel(successDelta),
      tone: "higher-is-better",
    },
    {
      label: "Gateway latency",
      a: `${Math.round(a.avgLatencyMs)} ms`,
      b: `${Math.round(b.avgLatencyMs)} ms`,
      delta: latencyDelta,
      deltaLabel: formatSignedPercent(latencyDelta),
      tone: "lower-is-better",
    },
    {
      label: "Net position",
      a: `${a.netPosition < 0 ? "-" : ""}${formatCurrencyCompact(Math.abs(a.netPosition), "ETB", 2)}`,
      b: `${b.netPosition < 0 ? "-" : ""}${formatCurrencyCompact(Math.abs(b.netPosition), "ETB", 2)}`,
      delta: netDelta,
      deltaLabel: formatSignedPercent(netDelta),
      tone: "neutral",
    },
    {
      label: "Avg ticket size",
      a: formatCurrencyCompact(a.avgTicket, "ETB", 2),
      b: formatCurrencyCompact(b.avgTicket, "ETB", 2),
      delta: ticketDelta,
      deltaLabel: formatSignedPercent(ticketDelta),
      tone: "neutral",
    },
  ];
}

function deltaTone(row: StatRow): "positive" | "negative" | "neutral" {
  if (row.tone === "neutral" || row.delta === 0) return "neutral";
  const good = row.tone === "higher-is-better" ? row.delta > 0 : row.delta < 0;
  return good ? "positive" : "negative";
}

export function ComparisonStatGrid({
  labelA,
  labelB,
  a,
  b,
  isLoading,
}: {
  labelA: string;
  labelB: string;
  a: AggregatedChannelStats;
  b: AggregatedChannelStats;
  isLoading?: boolean;
}) {
  const rows = buildRows(a, b);

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle>Head-to-head</CardTitle>
          <div className="flex items-center gap-2 text-xs">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 font-medium text-muted-foreground">
              <span className="size-1.5 shrink-0 rounded-full bg-muted-foreground/60" />
              {labelA}
            </span>
            <span className="text-muted-foreground">vs</span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 font-medium text-primary">
              <span className="size-1.5 shrink-0 rounded-full bg-primary" />
              {labelB}
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {isLoading
            ? Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className="rounded-lg border border-border p-4">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="mt-3 h-7 w-32" />
                </div>
              ))
            : rows.map((row) => {
                const tone = deltaTone(row);
                return (
                  <div key={row.label} className="rounded-lg border border-border p-4">
                    <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                      {row.label}
                    </p>
                    <div className="mt-2 flex items-end justify-between gap-2">
                      <div>
                        <p className="text-sm text-muted-foreground">{row.a}</p>
                        <p
                          className={cn(
                            "text-xs font-medium",
                            tone === "positive" && "text-status-success",
                            tone === "negative" && "text-status-failed",
                            tone === "neutral" && "text-muted-foreground",
                          )}
                        >
                          {row.deltaLabel}
                        </p>
                      </div>
                      <p className="text-2xl font-bold text-foreground">{row.b}</p>
                    </div>
                  </div>
                );
              })}
        </div>
      </CardContent>
    </Card>
  );
}
