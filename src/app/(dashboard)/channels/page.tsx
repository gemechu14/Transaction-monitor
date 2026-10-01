"use client";

import { useMemo, useState } from "react";
import { ArrowDownWideNarrow, Layers, X } from "lucide-react";

import {
  ChannelCardsSkeleton,
  ChannelFocusGrid,
  ChannelRankingGrid,
  RankChips,
} from "@/components/channels/channel-cards";
import { DayByDayCard } from "@/components/channels/day-by-day-card";
import { PeriodPicker } from "@/components/overview/period-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CHANNEL_LIST, type ChannelId } from "@/config/channels";
import { useMe, useOverviewDataset } from "@/hooks";
import { RANK_ITEMS, computeChannels, type RankMetric } from "@/lib/channels";
import {
  DEFAULT_PERIOD,
  channelName,
  countDays,
  formatRangeLabel,
  type OverviewPeriod,
} from "@/lib/overview";

const PLATFORM_ITEMS: Record<string, string> = {
  all: "All platforms",
  ...Object.fromEntries(CHANNEL_LIST.map((c) => [c.id, c.name])),
};

/** Non-admin users can only rank by volume and value; value is their default. */
const USER_RANK_METRICS: RankMetric[] = ["value", "transactions"];

export default function ChannelsPage() {
  const [period, setPeriod] = useState<OverviewPeriod>(DEFAULT_PERIOD);
  const [channel, setChannel] = useState<ChannelId | "all">("all");
  const [rankChoice, setRankChoice] = useState<RankMetric | null>(null);

  const meQuery = useMe();
  const isAdmin = meQuery.data?.user.role === "ADMIN";
  const rankMetrics = isAdmin ? (Object.keys(RANK_ITEMS) as RankMetric[]) : USER_RANK_METRICS;
  const rankItems = Object.fromEntries(rankMetrics.map((key) => [key, RANK_ITEMS[key]]));
  // Until the user picks, fall back to the role's default (and drop a pick the role can't use).
  const rankBy: RankMetric =
    rankChoice && rankMetrics.includes(rankChoice) ? rankChoice : isAdmin ? "transactions" : "value";

  const datasetQuery = useOverviewDataset();
  const dataset = datasetQuery.data;
  const isLoading = datasetQuery.isLoading || !dataset;

  const view = useMemo(
    () => (dataset ? computeChannels(dataset, period.range, channel) : undefined),
    [dataset, period.range, channel],
  );

  const platformLabel = channel === "all" ? "All platforms" : channelName(channel);
  const dataNote = view?.clipped
    ? `(${formatRangeLabel(period.range)}; data available from 1 Sep)`
    : undefined;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 flex-wrap items-center gap-2.5">
          <h2 className="text-[22px] font-bold tracking-[-0.02em] text-foreground">Channel performance</h2>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-soft py-1 pr-2 pl-2.5 text-xs font-medium text-primary-strong">
            <span className="size-1.5 shrink-0 rounded-full bg-primary" />
            {platformLabel}
            {channel !== "all" && (
              <button
                type="button"
                onClick={() => setChannel("all")}
                aria-label="Clear platform filter"
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
            <SelectTrigger aria-label="Platform" className="h-11 w-48 rounded-[10px] bg-card px-3.5">
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
          {channel === "all" && (
            <Select items={rankItems} value={rankBy} onValueChange={(value) => setRankChoice(value as RankMetric)}>
              <SelectTrigger aria-label="Rank channels by" className="h-11 w-56 rounded-[10px] bg-card px-3.5">
                <ArrowDownWideNarrow className="size-4 text-primary-strong" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {rankMetrics.map((key) => (
                  <SelectItem key={key} value={key}>
                    {RANK_ITEMS[key]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <PeriodPicker value={period} onChange={setPeriod} dataFrom={dataset?.from} />
        </div>
      </div>

      {isLoading || !view ? (
        <ChannelCardsSkeleton count={channel === "all" ? 5 : 6} />
      ) : view.selected ? (
        <div className="space-y-4">
          <ChannelFocusGrid selected={view.selected} platform={view.platform} />
          <RankChips ranks={view.selected.ranks} total={view.stats.length} />
        </div>
      ) : (
        <ChannelRankingGrid stats={view.stats} rankBy={rankBy} />
      )}

      <DayByDayCard
        rows={view?.days ?? []}
        platformLabel={platformLabel}
        periodDays={countDays(period.range)}
        note={dataNote}
        isLoading={isLoading}
      />
    </div>
  );
}
