"use client";

import { useMemo, useState } from "react";

import { AnomalyFlagsCard } from "@/components/overview/anomaly-flags-card";
import { ChannelPerformanceCard } from "@/components/overview/channel-performance-card";
import { DistributionByChannelCard } from "@/components/overview/distribution-card";
import { FiltersBar } from "@/components/overview/filters-bar";
import { FlowChartCard, type FlowDirection } from "@/components/overview/flow-chart-card";
import { KpiCard } from "@/components/overview/kpi-card";
import { LatencyCard } from "@/components/overview/latency-card";
// import { PeakLoadCard } from "@/components/overview/peak-load-card";
import { StatusDistributionCard } from "@/components/overview/status-distribution-card";
import { TopFailingChannelsCard } from "@/components/overview/top-failing-channels-card";
import { TooltipProvider } from "@/components/ui/tooltip";
import { CHANNEL_LIST, type ChannelId } from "@/config/channels";
import { NAV_ITEMS } from "@/config/nav";
import { SITE_CONFIG } from "@/config/site";
import { getLastNDays, shiftRangeBack, type DateRange } from "@/lib/date";
import {
  useChannelSummary,
  useKpis,
  useMe,
  // usePeakLoadHeatmap,
  useTransactionTrends,
} from "@/hooks";

const KPI_SKELETON_COUNT = 6;
const USER_VISIBLE_KPI_IDS = new Set(["total-value", "total-volume", "avg-value"]);

const DIRECTION_LABELS: Record<FlowDirection, string> = {
  both: "incoming & outgoing",
  in: "incoming only",
  out: "outgoing only",
};

export default function OverviewPage() {
  const [range, setRange] = useState<DateRange>(() => getLastNDays(30));
  const [channel, setChannel] = useState<ChannelId | "all">("all");
  const [direction, setDirection] = useState<FlowDirection>("both");

  const meQuery = useMe();
  const isAdmin = meQuery.data?.user.role === "ADMIN";

  const previousRange = useMemo(() => shiftRangeBack(range), [range]);
  const resolvedChannel = channel === "all" ? undefined : channel;

  const kpisQuery = useKpis({ ...range, channel: resolvedChannel });
  const trendsQuery = useTransactionTrends({ ...range, channel: resolvedChannel, granularity: "day" });
  const channelSummaryQuery = useChannelSummary({ ...range, channel: resolvedChannel });
  const previousChannelSummaryQuery = useChannelSummary({
    ...previousRange,
    channel: resolvedChannel,
  });
  // const peakLoadQuery = usePeakLoadHeatmap({ ...range, channel: resolvedChannel });

  const kpis = isAdmin
    ? kpisQuery.data ?? []
    : (kpisQuery.data ?? []).filter((kpi) => USER_VISIBLE_KPI_IDS.has(kpi.id));
  const channelSummary = channelSummaryQuery.data ?? [];

  const channelLabel =
    channel === "all" ? "All platforms" : CHANNEL_LIST.find((c) => c.id === channel)?.name;

  return (
    <div className="space-y-4">
      <div className="sticky -top-4 z-20 -mx-4 -mt-2 flex flex-col gap-3 border-b border-border bg-background px-4 py-3 sm:-top-6 sm:-mx-6 sm:px-6 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-base font-bold text-foreground sm:text-lg">
              {SITE_CONFIG.name} Overview
            </h1>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
              <span className="size-1.5 shrink-0 rounded-full bg-primary" />
              {channelLabel} &middot; {DIRECTION_LABELS[direction]}
            </span>
          </div>
          {/* <p className="mt-1 text-sm text-muted-foreground">
            {NAV_ITEMS.find((item) => item.href === "/overview")?.description}
          </p> */}
        </div>

        <FiltersBar
          channel={channel}
          onChannelChange={setChannel}
          direction={direction}
          onDirectionChange={setDirection}
          range={range}
          onRangeChange={setRange}
        />
      </div>

      <TooltipProvider>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
          {kpisQuery.isLoading
            ? Array.from({ length: isAdmin ? KPI_SKELETON_COUNT : USER_VISIBLE_KPI_IDS.size }).map(
                (_, index) => <KpiCard key={index} isLoading />,
              )
            : kpis.map((kpi, index) => <KpiCard key={kpi.id} kpi={kpi} accent={index === 0} />)}
        </div>
      </TooltipProvider>

      <FlowChartCard
        data={trendsQuery.data ?? []}
        direction={direction}
        isLoading={trendsQuery.isLoading}
      />

      {isAdmin && (
        <>
          <ChannelPerformanceCard data={channelSummary} isLoading={channelSummaryQuery.isLoading} />

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <DistributionByChannelCard data={channelSummary} isLoading={channelSummaryQuery.isLoading} />
            <StatusDistributionCard data={channelSummary} isLoading={channelSummaryQuery.isLoading} />
          </div>

          {/* <PeakLoadCard data={peakLoadQuery.data ?? []} isLoading={peakLoadQuery.isLoading} /> */}

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <LatencyCard data={channelSummary} isLoading={channelSummaryQuery.isLoading} />
            <TopFailingChannelsCard data={channelSummary} isLoading={channelSummaryQuery.isLoading} />
            <AnomalyFlagsCard
              current={channelSummary}
              previous={previousChannelSummaryQuery.data ?? []}
              isLoading={channelSummaryQuery.isLoading || previousChannelSummaryQuery.isLoading}
            />
          </div>
        </>
      )}
    </div>
  );
}
