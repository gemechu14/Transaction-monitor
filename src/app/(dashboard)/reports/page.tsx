"use client";

import { useMemo, useState } from "react";
import { Activity, Download, FileText, ShieldCheck, TrendingUp } from "lucide-react";

import { DateRangePicker } from "@/components/overview/date-range-picker";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ByPlatformTableCard, type PlatformRow } from "@/components/reports/by-platform-table-card";
import { ChannelMixCard, type ChannelMixRow } from "@/components/reports/channel-mix-card";
import {
  ChannelMovementsTableCard,
  type MovementRow,
} from "@/components/reports/channel-movements-table-card";
import { ExecutiveBriefCard } from "@/components/reports/executive-brief-card";
import { ExecutiveReadCard } from "@/components/reports/executive-read-card";
import { ImpactNotesRow, type ImpactNote } from "@/components/reports/impact-notes-row";
import { ReportStatTile } from "@/components/reports/report-stat-tile";
import { ResponseBriefCard } from "@/components/reports/response-brief-card";
import { SpikeAlertBanner } from "@/components/reports/spike-alert-banner";
import { CHANNEL_LIST, CHANNELS, type ChannelId } from "@/config/channels";
import { eachDay, formatDateRangeLabel, getLastNDays, shiftRangeBack, type DateRange } from "@/lib/date";
import {
  formatCompactNumber,
  formatCurrencyCompact,
  formatPercent,
  formatSignedPercent,
} from "@/lib/format";
import { useChannelSummary, useKpis } from "@/hooks";
import type { ChannelSummary, Kpi } from "@/types/api";

type ReportTab = "pulse" | "impact" | "spikes";

const PLATFORM_ITEMS: Record<string, string> = {
  all: "All platforms",
  ...Object.fromEntries(CHANNEL_LIST.map((c) => [c.id, c.name])),
};

function findKpi(kpis: Kpi[], id: string): Kpi | undefined {
  return kpis.find((k) => k.id === id);
}

function failureRate(summary: ChannelSummary): number {
  return summary.transactionCount
    ? (summary.failedCount + summary.reversedCount) / summary.transactionCount
    : 0;
}

function downloadPlatformCsv(rows: PlatformRow[]) {
  const header = ["Platform", "Transactions", "Value", "Change", "Success rate"];
  const lines = rows.map((row) =>
    [
      CHANNELS[row.channel]?.name ?? row.channel,
      row.transactionCount,
      row.totalValue.toFixed(2),
      (row.change * 100).toFixed(2),
      (row.successRate * 100).toFixed(2),
    ].join(","),
  );
  const csv = [header.join(","), ...lines].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "platform-pulse.csv";
  link.click();
  URL.revokeObjectURL(url);
}

export default function ReportsPage() {
  const [range, setRange] = useState<DateRange>(() => getLastNDays(30));
  const [channel, setChannel] = useState<ChannelId | "all">("all");
  const [tab, setTab] = useState<ReportTab>("pulse");

  const resolvedChannel = channel === "all" ? undefined : channel;
  const previousRange = useMemo(() => shiftRangeBack(range), [range]);

  const kpisQuery = useKpis({ ...range, channel: resolvedChannel });
  const channelSummaryQuery = useChannelSummary({ ...range, channel: resolvedChannel });
  const previousSummaryQuery = useChannelSummary({ ...previousRange, channel: resolvedChannel });

  const kpis = kpisQuery.data ?? [];
  const channelSummary = channelSummaryQuery.data ?? [];
  const previousSummary = previousSummaryQuery.data ?? [];
  const isLoading =
    kpisQuery.isLoading || channelSummaryQuery.isLoading || previousSummaryQuery.isLoading;

  const channelLabel =
    channel === "all" ? "All platforms" : CHANNEL_LIST.find((c) => c.id === channel)?.name;
  const daysSelected = eachDay(range.from, range.to).length;

  const totalValueKpi = findKpi(kpis, "total-value");
  const totalVolumeKpi = findKpi(kpis, "total-volume");
  const successRateKpi = findKpi(kpis, "success-rate");
  const avgValueKpi = findKpi(kpis, "avg-value");

  const totalCount = channelSummary.reduce((acc, s) => acc + s.transactionCount, 0);
  const totalFailed = channelSummary.reduce((acc, s) => acc + s.failedCount, 0);
  const totalPending = channelSummary.reduce((acc, s) => acc + s.pendingCount, 0);
  const totalReversed = channelSummary.reduce((acc, s) => acc + s.reversedCount, 0);
  const successCount = Math.max(0, totalCount - totalFailed - totalPending - totalReversed);
  const meanLatency = totalCount
    ? channelSummary.reduce((acc, s) => acc + (s.avgLatencyMs ?? 0) * s.transactionCount, 0) /
      totalCount
    : 0;
  const totalValueSum = channelSummary.reduce((acc, s) => acc + s.totalValue, 0);

  const previousByChannel = new Map(previousSummary.map((s) => [s.channel, s]));

  const platformRows: PlatformRow[] = [...channelSummary]
    .sort((a, b) => b.transactionCount - a.transactionCount)
    .map((s) => {
      const prev = previousByChannel.get(s.channel);
      const change =
        prev && prev.transactionCount
          ? (s.transactionCount - prev.transactionCount) / prev.transactionCount
          : 0;
      return {
        channel: s.channel,
        transactionCount: s.transactionCount,
        totalValue: s.totalValue,
        change,
        successRate: s.successRate,
      };
    });

  const movementRows: MovementRow[] = channelSummary
    .map((s) => {
      const prev = previousByChannel.get(s.channel);
      const observed = failureRate(s);
      const baseline = prev ? failureRate(prev) : observed;
      const movementPts = (observed - baseline) * 100;
      return {
        channel: s.channel,
        baseline,
        observed,
        movementPts,
        status: (movementPts >= 0.05 ? "investigate" : "normal") as MovementRow["status"],
      };
    })
    .sort((a, b) => b.movementPts - a.movementPts);

  const topPlatform = platformRows[0];
  const narrative = topPlatform
    ? `${CHANNELS[topPlatform.channel]?.name ?? topPlatform.channel} led traffic with ${formatCompactNumber(
        topPlatform.transactionCount,
      )} transactions and ${formatCurrencyCompact(
        topPlatform.totalValue,
        "ETB",
        2,
      )} processed. The platform maintained a ${formatPercent(
        topPlatform.successRate,
        2,
      )} success rate while handling both incoming and outgoing settlement flows.`
    : "";

  const growthChannel = [...platformRows].filter((r) => r.change > 0).sort((a, b) => b.change - a.change)[0];
  const growthLabel = growthChannel
    ? `${CHANNELS[growthChannel.channel]?.name ?? growthChannel.channel} changed ${formatSignedPercent(
        growthChannel.change,
      )} against the prior period.`
    : null;

  const topMovement = movementRows[0];
  const flagLabel =
    topMovement && topMovement.movementPts > 0
      ? `${CHANNELS[topMovement.channel]?.name ?? topMovement.channel} failure rate increased by ${topMovement.movementPts.toFixed(2)} points.`
      : null;

  const incomingValueTotal = channelSummary.reduce((acc, s) => acc + s.incomingValue, 0);
  const outgoingValueTotal = channelSummary.reduce((acc, s) => acc + s.outgoingValue, 0);
  const incomingCountTotal = channelSummary.reduce((acc, s) => acc + s.incomingCount, 0);
  const outgoingCountTotal = channelSummary.reduce((acc, s) => acc + s.outgoingCount, 0);
  const netSettlement = incomingValueTotal - outgoingValueTotal;

  const channelMixRows: ChannelMixRow[] = [...channelSummary]
    .sort((a, b) => b.totalValue - a.totalValue)
    .map((s) => ({
      channel: s.channel,
      value: s.totalValue,
      share: totalValueSum ? s.totalValue / totalValueSum : 0,
    }));

  const avgTicket = totalCount ? totalValueSum / totalCount : 0;
  const impactNotes: ImpactNote[] = [
    {
      icon: TrendingUp,
      title: "Business impact",
      body: `${formatCompactNumber(totalCount)} transactions moved ${formatCurrencyCompact(
        totalValueSum,
        "ETB",
        2,
      )} in the selected scope. Average ticket value was ${formatCurrencyCompact(avgTicket, "ETB", 1)}.`,
    },
    {
      icon: ShieldCheck,
      title: "Reliability",
      body: `Success held at ${formatPercent(
        successRateKpi?.value ?? 0,
        2,
      )}, with ${formatCompactNumber(totalFailed)} failures and mean gateway latency of ${Math.round(
        meanLatency,
      )} ms.`,
    },
    {
      icon: Activity,
      title: "Settlement outlook",
      body: `The period closed at ${formatCurrencyCompact(
        Math.abs(netSettlement),
        "ETB",
        2,
      )} ${netSettlement >= 0 ? "net inflow" : "net outflow"}. ${avgValueKpi?.helperText ?? ""}`,
    },
  ];

  const topMovementSummary = topMovement
    ? channelSummary.find((s) => s.channel === topMovement.channel)
    : undefined;
  const responseBrief =
    topMovement && topMovementSummary
      ? {
          channelName: CHANNELS[topMovement.channel]?.name ?? topMovement.channel,
          transactionsObserved: topMovementSummary.transactionCount,
          gatewayResponseMs: topMovementSummary.avgLatencyMs ?? 0,
          successRate: topMovementSummary.successRate,
          actionNeeded: topMovement.movementPts > 0,
        }
      : undefined;

  const alertTitle = topMovement
    ? `${CHANNELS[topMovement.channel]?.name ?? topMovement.channel} failure movement ${
        topMovement.movementPts >= 0 ? "+" : ""
      }${topMovement.movementPts.toFixed(2)} pts`
    : undefined;

  return (
    <div className="space-y-4">
      <div className="sticky -top-4 z-20 -mx-4 flex flex-col gap-3 border-b border-border bg-background px-4 py-3 sm:-top-6 sm:-mx-6 sm:px-6 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-base font-bold text-foreground sm:text-lg">Platform Pulse</h1>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
              <span className="size-1.5 shrink-0 rounded-full bg-primary" />
              {channelLabel}
            </span>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Executive briefings on platform movement, impact and emerging risk
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Select
            items={PLATFORM_ITEMS}
            value={channel}
            onValueChange={(value) => setChannel(value as ChannelId | "all")}
          >
            <SelectTrigger size="sm" className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(PLATFORM_ITEMS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <DateRangePicker range={range} onRangeChange={setRange} />
        </div>
      </div>

      <Tabs value={tab} onValueChange={(value) => setTab(value as ReportTab)}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <TabsList>
            <TabsTrigger value="pulse">Monthly Pulse</TabsTrigger>
            <TabsTrigger value="impact">Monthly Impact</TabsTrigger>
            <TabsTrigger value="spikes">Spike Alerts</TabsTrigger>
          </TabsList>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => window.print()}>
              <FileText className="size-3.5" />
              PDF
            </Button>
            <Button
              size="sm"
              className="gap-1.5 text-xs"
              onClick={() => downloadPlatformCsv(platformRows)}
            >
              <Download className="size-3.5" />
              CSV
            </Button>
          </div>
        </div>

        <p className="mt-2 mb-4 text-xs text-muted-foreground">
          {formatDateRangeLabel(range)} &middot; {daysSelected} days selected
        </p>

        <TabsContent value="pulse" className="space-y-4">
          <ExecutiveBriefCard
            eyebrow="Monthly pulse · Executive brief"
            title={formatDateRangeLabel(range)}
            subtitle={`${channelLabel} · Compared with the immediately preceding period`}
            bigValue={totalValueKpi ? formatCurrencyCompact(totalValueKpi.value, "ETB", 2) : undefined}
            bigValueHelper="moved in the selected period"
            changeLabel={
              totalValueKpi?.change !== undefined
                ? `${formatSignedPercent(totalValueKpi.change)} vs previous period`
                : undefined
            }
            changePositive={(totalValueKpi?.change ?? 0) >= 0}
            isLoading={isLoading}
          />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <ReportStatTile
              label="Transactions"
              value={totalVolumeKpi ? formatCompactNumber(totalVolumeKpi.value) : undefined}
              helperText={
                totalVolumeKpi?.change !== undefined
                  ? formatSignedPercent(totalVolumeKpi.change)
                  : undefined
              }
              helperTone={(totalVolumeKpi?.change ?? 0) >= 0 ? "positive" : "negative"}
              isLoading={isLoading}
            />
            <ReportStatTile
              label="Success rate"
              value={successRateKpi ? formatPercent(successRateKpi.value, 2) : undefined}
              helperText={`${formatCompactNumber(successCount)} successful`}
              isLoading={isLoading}
            />
            <ReportStatTile
              label="Active channels"
              value={String(channelSummary.length)}
              helperText={channelLabel}
              isLoading={isLoading}
            />
            <ReportStatTile
              label="Mean latency"
              value={`${Math.round(meanLatency)} ms`}
              helperText="Gateway response time"
              isLoading={isLoading}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_320px]">
            <ByPlatformTableCard rows={platformRows} isLoading={isLoading} />
            <ExecutiveReadCard insights={{ narrative, growthLabel, flagLabel }} isLoading={isLoading} />
          </div>
        </TabsContent>

        <TabsContent value="impact" className="space-y-4">
          <ExecutiveBriefCard
            eyebrow="Monthly impact · Business review"
            title={formatDateRangeLabel(range)}
            subtitle={`${channelLabel} · Business value, reach and reliability`}
            bigValue={totalValueKpi ? formatCurrencyCompact(totalValueKpi.value, "ETB", 2) : undefined}
            bigValueHelper="processed across the platform"
            changeLabel={
              totalValueKpi?.change !== undefined
                ? `${formatSignedPercent(totalValueKpi.change)} vs previous period`
                : undefined
            }
            changePositive={(totalValueKpi?.change ?? 0) >= 0}
            isLoading={isLoading}
          />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <ReportStatTile
              label="Transactions"
              value={totalVolumeKpi ? formatCompactNumber(totalVolumeKpi.value) : undefined}
              helperText={
                totalVolumeKpi?.change !== undefined
                  ? formatSignedPercent(totalVolumeKpi.change)
                  : undefined
              }
              helperTone={(totalVolumeKpi?.change ?? 0) >= 0 ? "positive" : "negative"}
              isLoading={isLoading}
            />
            <ReportStatTile
              label="Incoming value"
              value={formatCurrencyCompact(incomingValueTotal, "ETB", 2)}
              helperText={`${formatCompactNumber(incomingCountTotal)} transactions`}
              isLoading={isLoading}
            />
            <ReportStatTile
              label="Outgoing value"
              value={formatCurrencyCompact(outgoingValueTotal, "ETB", 2)}
              helperText={`${formatCompactNumber(outgoingCountTotal)} transactions`}
              isLoading={isLoading}
            />
            <ReportStatTile
              label="Net settlement"
              value={formatCurrencyCompact(Math.abs(netSettlement), "ETB", 2)}
              helperText={netSettlement >= 0 ? "Net inflow" : "Net outflow"}
              isLoading={isLoading}
            />
          </div>

          <ChannelMixCard rows={channelMixRows} isLoading={isLoading} />

          <ImpactNotesRow notes={impactNotes} isLoading={isLoading} />
        </TabsContent>

        <TabsContent value="spikes" className="space-y-4">
          <SpikeAlertBanner
            title={alertTitle}
            description="Automated comparison against the immediately preceding period for the current platform and direction selection."
            isLoading={isLoading}
          />

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_320px]">
            <ChannelMovementsTableCard rows={movementRows} isLoading={isLoading} />
            <ResponseBriefCard brief={responseBrief} isLoading={isLoading} />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
