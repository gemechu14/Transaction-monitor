"use client";

import { useState } from "react";

import { ChannelDetailCard } from "@/components/channels/channel-detail-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { CHANNELS } from "@/config/channels";
import { SORT_ITEMS, type ChannelSortOption } from "@/config/channel-sort";
import type { ChannelSummary } from "@/types/api";

const CARD_SKELETON_COUNT = 7;
const DEFAULT_VISIBLE_COUNT = 5;

function channelName(summary: ChannelSummary): string {
  return CHANNELS[summary.channel]?.name ?? summary.channel;
}

function sortSummaries(data: ChannelSummary[], sortBy: ChannelSortOption): ChannelSummary[] {
  return [...data].sort((a, b) => {
    switch (sortBy) {
      case "latency":
        return (a.avgLatencyMs ?? Infinity) - (b.avgLatencyMs ?? Infinity);
      case "volume":
        return b.transactionCount - a.transactionCount;
      case "value":
        return b.totalValue - a.totalValue;
      case "success":
        return b.successRate - a.successRate;
      case "name":
        return channelName(a).localeCompare(channelName(b));
    }
  });
}

export function ChannelDetailGrid({
  data,
  previousData,
  sortBy,
  isLoading,
}: {
  data: ChannelSummary[];
  previousData?: ChannelSummary[];
  sortBy: ChannelSortOption;
  isLoading?: boolean;
}) {
  const [showAll, setShowAll] = useState(false);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {Array.from({ length: CARD_SKELETON_COUNT }).map((_, index) => (
          <Card key={index}>
            <CardContent className="space-y-3">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-7 w-20" />
              <Skeleton className="h-3 w-28" />
              <Skeleton className="h-32 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const sorted = sortSummaries(data, sortBy);

  if (!sorted.length) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          No platform data for this selection.
        </CardContent>
      </Card>
    );
  }

  const visible = showAll ? sorted : sorted.slice(0, DEFAULT_VISIBLE_COUNT);

  return (
    <div className="space-y-2.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          Showing {visible.length} of {sorted.length} platforms, ranked by{" "}
          {SORT_ITEMS[sortBy].replace(/^Rank by /, "").replace(/^Alphabetical$/, "name")}
        </p>
        {sorted.length > DEFAULT_VISIBLE_COUNT && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs text-primary"
            onClick={() => setShowAll((prev) => !prev)}
          >
            {showAll ? "Show top 5" : `Show all ${sorted.length}`}
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {visible.map((summary) => (
          <ChannelDetailCard
            key={summary.channel}
            summary={summary}
            previous={previousData?.find((p) => p.channel === summary.channel)}
          />
        ))}
      </div>
    </div>
  );
}
