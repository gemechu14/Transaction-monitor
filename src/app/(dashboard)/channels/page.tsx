"use client";

import { useMemo, useState } from "react";

import { ChannelDetailGrid } from "@/components/channels/channel-detail-grid";
import { DailyFlowCard } from "@/components/channels/daily-flow-card";
import { FiltersBar } from "@/components/overview/filters-bar";
import type { FlowDirection } from "@/components/overview/flow-chart-card";
import { type ChannelSortOption } from "@/config/channel-sort";
import { CHANNEL_LIST, type ChannelId } from "@/config/channels";
import { getLastNDays, shiftRangeBack, type DateRange } from "@/lib/date";
import { useChannelDailyFlow, useChannelSummary } from "@/hooks";

const DIRECTION_LABELS: Record<FlowDirection, string> = {
  both: "incoming & outgoing",
  in: "incoming only",
  out: "outgoing only",
};

export default function ChannelsPage() {
  const [range, setRange] = useState<DateRange>(() => getLastNDays(30));
  const [channel, setChannel] = useState<ChannelId | "all">("all");
  const [direction, setDirection] = useState<FlowDirection>("both");
  const [sortBy, setSortBy] = useState<ChannelSortOption>("latency");

  const previousRange = useMemo(() => shiftRangeBack(range), [range]);
  const resolvedChannel = channel === "all" ? undefined : channel;
  const channelSummaryQuery = useChannelSummary({ ...range, channel: resolvedChannel });
  const previousChannelSummaryQuery = useChannelSummary({
    ...previousRange,
    channel: resolvedChannel,
  });
  const dailyFlowQuery = useChannelDailyFlow({ ...range, channel: resolvedChannel });

  const channelSummary = channelSummaryQuery.data ?? [];
  const previousChannelSummary = previousChannelSummaryQuery.data ?? [];
  const dailyFlow = dailyFlowQuery.data ?? [];

  const channelLabel =
    channel === "all" ? "All platforms" : CHANNEL_LIST.find((c) => c.id === channel)?.name;

  return (
    <div className="space-y-4">
      <div className="sticky -top-4 z-20 -mx-4 -mt-2 flex flex-col gap-3 border-b border-border bg-background px-4 py-3 sm:-top-6 sm:-mx-6 sm:px-6 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-base font-bold text-foreground sm:text-lg">Channel Performance</h1>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
              <span className="size-1.5 shrink-0 rounded-full bg-primary" />
              {channelLabel} &middot; {DIRECTION_LABELS[direction]}
            </span>
          </div>
        </div>

        <FiltersBar
          channel={channel}
          onChannelChange={setChannel}
          direction={direction}
          onDirectionChange={setDirection}
          range={range}
          onRangeChange={setRange}
          sortBy={sortBy}
          onSortByChange={setSortBy}
        />
      </div>

      <ChannelDetailGrid
        data={channelSummary}
        previousData={previousChannelSummary}
        sortBy={sortBy}
        isLoading={channelSummaryQuery.isLoading}
      />

      <DailyFlowCard
        data={dailyFlow}
        channelLabel={channelLabel ?? "All platforms"}
        isLoading={dailyFlowQuery.isLoading}
      />
    </div>
  );
}
