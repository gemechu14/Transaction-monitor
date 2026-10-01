"use client";

import { SectionCard } from "@/components/overview/section-card";
import { Skeleton } from "@/components/ui/skeleton";
import { CHANNELS } from "@/config/channels";
import type { OverviewFailingChannel } from "@/types/api";

export function TopFailingChannelsCard({
  data,
  isLoading,
}: {
  data: OverviewFailingChannel[];
  isLoading?: boolean;
}) {
  const rows = [...data].sort((a, b) => b.failureRate - a.failureRate);

  return (
    <SectionCard title="Top failing channels" description="Highest failure rate this period">
      {isLoading ? (
        <Skeleton className="h-40 w-full" />
      ) : (
        <ul className="divide-y divide-line-soft">
          {rows.map((row) => (
            <li key={row.channel} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-foreground">
                  {CHANNELS[row.channel]?.name ?? row.channel}
                </p>
                <p className="truncate text-xs text-muted-foreground tabular-nums">
                  {row.failedCount.toLocaleString("en-US")} failed, {row.reversedCount.toLocaleString("en-US")}{" "}
                  reversed
                </p>
              </div>
              <span className="shrink-0 rounded-full bg-bad-soft px-2.5 py-1 text-xs font-semibold text-bad tabular-nums">
                {(row.failureRate * 100).toFixed(2)}%
              </span>
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  );
}
