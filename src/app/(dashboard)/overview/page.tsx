"use client";

import { useMemo, useState } from "react";
import { Layers, X } from "lucide-react";

import { AnomalyFlagsCard } from "@/components/overview/anomaly-flags-card";
import { ChannelPerformanceCard } from "@/components/overview/channel-performance-card";
import { DailyTransactionsCard } from "@/components/overview/daily-transactions-card";
import { DistributionByChannelCard } from "@/components/overview/distribution-card";
import { LatencyCard } from "@/components/overview/latency-card";
import { OverviewKpiGrid } from "@/components/overview/overview-kpi-grid";
import { PeriodPicker } from "@/components/overview/period-picker";
import { StatusDistributionCard } from "@/components/overview/status-distribution-card";
import { TopFailingChannelsCard } from "@/components/overview/top-failing-channels-card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CHANNEL_LIST, type ChannelId } from "@/config/channels";
import { useMe, useOverviewDataset } from "@/hooks";
import {
  DEFAULT_PERIOD,
  channelName,
  computeOverview,
  formatRangeLabel,
  type OverviewPeriod,
} from "@/lib/overview";

const USER_VISIBLE_KPI_IDS = new Set(["total-value", "total-volume", "avg-value"]);

const PLATFORM_ITEMS: Record<string, string> = {
  all: "All platforms",
  ...Object.fromEntries(CHANNEL_LIST.map((c) => [c.id, c.name])),
};

export default function OverviewPage() {
  const [period, setPeriod] = useState<OverviewPeriod>(DEFAULT_PERIOD);
  const [channel, setChannel] = useState<ChannelId | "all">("all");

  const meQuery = useMe();
  const isAdmin = meQuery.data?.user.role === "ADMIN";

  const datasetQuery = useOverviewDataset();
  const dataset = datasetQuery.data;
  const isLoading = datasetQuery.isLoading || !dataset;

  const view = useMemo(
    () => (dataset ? computeOverview(dataset, period.range, channel) : undefined),
    [dataset, period.range, channel],
  );

  const kpis = (view?.kpis ?? []).filter((kpi) => isAdmin || USER_VISIBLE_KPI_IDS.has(kpi.id));
  const platformLabel = channel === "all" ? "All platforms" : channelName(channel);
  const chartSubtitle = `${platformLabel}, ${formatRangeLabel(period.range)}${
    view?.clipped ? " (data available from 1 Sep)" : ""
  }`;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 flex-wrap items-center gap-2.5">
          <h2 className="text-[22px] font-bold tracking-[-0.02em] text-foreground">
            Transaction monitoring overview
          </h2>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-soft py-1 pr-2 pl-2.5 text-xs font-medium text-primary-strong">
            <span className="size-1.5 shrink-0 rounded-full bg-primary" />
            {platformLabel}
            {channel !== "all" && (
              <button
                type="button"
                onClick={() => setChannel("all")}
                aria-label="Show all platforms"
                className="-mr-0.5 rounded-full p-0.5 hover:bg-primary/15 focus-visible:outline-2 focus-visible:outline-primary"
              >
                <X className="size-3" />
              </button>
            )}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Select
            items={PLATFORM_ITEMS}
            value={channel}
            onValueChange={(value) => setChannel(value as ChannelId | "all")}
          >
            <SelectTrigger aria-label="Platform" className="h-11 w-48 rounded-[10px] bg-card px-3.5 data-[size=default]:h-11">
              <Layers className="size-4 text-primary-strong" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All platforms</SelectItem>
              {CHANNEL_LIST.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <PeriodPicker value={period} onChange={setPeriod} dataFrom={dataset?.from} />
        </div>
      </div>

      <OverviewKpiGrid
        kpis={kpis}
        isLoading={isLoading}
        skeletonCount={isAdmin ? 6 : USER_VISIBLE_KPI_IDS.size}
      />

      <DailyTransactionsCard series={view?.series ?? []} subtitle={chartSubtitle} isLoading={isLoading} />

      <ChannelPerformanceCard
        data={dataset?.channels ?? []}
        selected={channel}
        isLoading={isLoading}
        restricted={!isAdmin}
      />

      {isAdmin && (
        <>

          <div className="grid grid-cols-1 gap-3 min-[901px]:grid-cols-2">
            <DistributionByChannelCard
              data={dataset?.channels ?? []}
              selected={channel}
              onSelect={setChannel}
              isLoading={isLoading}
            />
            <StatusDistributionCard data={dataset?.status} isLoading={isLoading} />
          </div>

          <div className="grid grid-cols-1 gap-3 min-[901px]:grid-cols-2 min-[1181px]:grid-cols-3">
            <LatencyCard data={dataset?.channels ?? []} isLoading={isLoading} />
            <TopFailingChannelsCard data={dataset?.failing ?? []} isLoading={isLoading} />
            <AnomalyFlagsCard
              data={dataset?.anomalies ?? []}
              isLoading={isLoading}
              className="min-[901px]:max-[1180px]:col-span-2"
            />
          </div>
        </>
      )}
    </div>
  );
}
