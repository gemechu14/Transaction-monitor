"use client";

import { SectionCard } from "@/components/overview/section-card";
import { Skeleton } from "@/components/ui/skeleton";
import { CHANNELS } from "@/config/channels";
import { cn } from "@/lib/utils";
import type { OverviewChannelRow } from "@/types/api";

/** Latency above this reads as slow and switches to orange. */
const SLOW_LATENCY_MS = 400;

export function LatencyCard({
  data,
  isLoading,
}: {
  data: OverviewChannelRow[];
  isLoading?: boolean;
}) {
  const rows = [...data].sort((a, b) => b.avgLatencyMs - a.avgLatencyMs);
  const max = Math.max(...rows.map((r) => r.avgLatencyMs), 1);
  const totalCount = rows.reduce((acc, r) => acc + r.transactionCount, 0);
  const weightedMean = totalCount
    ? Math.round(rows.reduce((acc, r) => acc + r.avgLatencyMs * r.transactionCount, 0) / totalCount)
    : 0;

  return (
    <SectionCard title="Gateway latency" description={`Weighted mean response time ${weightedMean} ms`}>
      {isLoading ? (
        <Skeleton className="h-56 w-full" />
      ) : (
        <ul className="space-y-3.5">
          {rows.map((row) => {
            const slow = row.avgLatencyMs > SLOW_LATENCY_MS;
            return (
              <li key={row.channel} className="flex items-center gap-3">
                <span className="w-24 shrink-0 truncate text-[13px] text-foreground-2">
                  {CHANNELS[row.channel]?.name ?? row.channel}
                </span>
                <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-track">
                  <span
                    className={cn("block h-full rounded-full", slow ? "bg-orange" : "bg-primary")}
                    style={{ width: `${(row.avgLatencyMs / max) * 100}%` }}
                  />
                </span>
                <span
                  className={cn(
                    "w-14 shrink-0 text-right text-[13px] tabular-nums",
                    slow ? "font-bold text-orange-strong" : "font-medium text-foreground",
                  )}
                >
                  {row.avgLatencyMs} ms
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </SectionCard>
  );
}
