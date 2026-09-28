"use client";

import { Crown, Gauge, ShieldCheck, TrendingUp } from "lucide-react";

import { ExecutiveBriefCard } from "@/components/reports/executive-brief-card";
import { ImpactNotesRow, type ImpactNote } from "@/components/reports/impact-notes-row";
import { Skeleton } from "@/components/ui/skeleton";
import { type AggregatedChannelStats, pctChange } from "@/lib/aggregate-channel-summary";
import { formatCompactNumber, formatCurrencyCompact, formatPercent, formatSignedPercent } from "@/lib/format";

function joinList(items: string[]): string {
  if (items.length === 0) return "";
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
}

export function ComparisonSummary({
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
  const totalValueChange = pctChange(b.totalValue, a.totalValue);
  const volumeChange = pctChange(b.transactionCount, a.transactionCount);
  const successDeltaPts = b.successRate - a.successRate;
  const latencyChange = pctChange(b.avgLatencyMs, a.avgLatencyMs);

  const signals = [
    { label: "value processed", bWins: totalValueChange > 0, tie: totalValueChange === 0 },
    { label: "success rate", bWins: successDeltaPts > 0, tie: successDeltaPts === 0 },
    { label: "gateway latency", bWins: latencyChange < 0, tie: latencyChange === 0 },
  ];
  const bWinsCount = signals.filter((s) => s.bWins && !s.tie).length;
  const aWinsCount = signals.filter((s) => !s.bWins && !s.tie).length;
  const verdictSide: "a" | "b" | "tie" =
    bWinsCount > aWinsCount ? "b" : aWinsCount > bWinsCount ? "a" : "tie";

  const bSignals = signals.filter((s) => s.bWins && !s.tie).map((s) => s.label);
  const aSignals = signals.filter((s) => !s.bWins && !s.tie).map((s) => s.label);

  const verdictLabel = verdictSide === "b" ? labelB : verdictSide === "a" ? labelA : null;
  const verdictReason =
    verdictSide === "b"
      ? `${labelB} leads on ${joinList(bSignals)}${aSignals.length ? `, while ${labelA} holds the edge on ${joinList(aSignals)}` : ""}.`
      : verdictSide === "a"
        ? `${labelA} leads on ${joinList(aSignals)}${bSignals.length ? `, while ${labelB} holds the edge on ${joinList(bSignals)}` : ""}.`
        : `${labelA} and ${labelB} are evenly matched across value, success rate and latency.`;

  const notes: ImpactNote[] = [
    {
      icon: TrendingUp,
      title: "Volume & value",
      body: `${labelB} moved ${formatCurrencyCompact(b.totalValue, "ETB", 2)} across ${formatCompactNumber(
        b.transactionCount,
      )} transactions, ${totalValueChange >= 0 ? "up" : "down"} ${formatPercent(
        Math.abs(totalValueChange),
        1,
      )} in value and ${formatPercent(Math.abs(volumeChange), 1)} in volume versus ${labelA}.`,
    },
    {
      icon: ShieldCheck,
      title: "Reliability",
      body: `Success held at ${formatPercent(b.successRate, 2)} for ${labelB} against ${formatPercent(
        a.successRate,
        2,
      )} for ${labelA} — a ${successDeltaPts >= 0 ? "+" : ""}${(successDeltaPts * 100).toFixed(1)} point swing, with ${formatCompactNumber(
        b.failedCount,
      )} failures recorded.`,
    },
    {
      icon: Gauge,
      title: "Speed",
      body: `Gateway latency averaged ${Math.round(b.avgLatencyMs)} ms for ${labelB} versus ${Math.round(
        a.avgLatencyMs,
      )} ms for ${labelA}, a ${formatSignedPercent(latencyChange)} change.`,
    },
  ];

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-28 w-full rounded-xl" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Skeleton className="h-24 w-full rounded-xl" />
          <Skeleton className="h-24 w-full rounded-xl" />
          <Skeleton className="h-24 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <ExecutiveBriefCard
        eyebrow="Comparison summary"
        title={`${labelB} vs ${labelA}`}
        subtitle="Head-to-head across value, reliability and speed"
        bigValue={formatCurrencyCompact(b.totalValue, "ETB", 2)}
        bigValueHelper={`processed by ${labelB}, vs ${formatCurrencyCompact(a.totalValue, "ETB", 2)} by ${labelA}`}
        changeLabel={`${formatSignedPercent(totalValueChange)} value`}
        changePositive={totalValueChange >= 0}
      />

      <ImpactNotesRow notes={notes} />

      {verdictLabel && (
        <div className="flex items-start gap-3 rounded-xl border border-l-4 border-primary/30 border-l-white bg-card px-4 py-4 ring-1 ring-foreground/10 sm:px-6">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Crown className="size-4" />
          </span>
          <div className="min-w-0 space-y-1">
            <p className="text-[10px] font-semibold tracking-wider text-primary uppercase">
              Better overall
            </p>
            <h2 className="text-base font-semibold text-foreground sm:text-lg">{verdictLabel}</h2>
            <p className="text-sm text-muted-foreground">{verdictReason}</p>
          </div>
        </div>
      )}
    </div>
  );
}
