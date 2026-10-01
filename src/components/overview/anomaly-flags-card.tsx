"use client";

import { SectionCard } from "@/components/overview/section-card";
import { Skeleton } from "@/components/ui/skeleton";
import { CHANNELS } from "@/config/channels";
import { cn } from "@/lib/utils";
import type { OverviewAnomalyFlag } from "@/types/api";

export function AnomalyFlagsCard({
  data,
  isLoading,
  className,
}: {
  data: OverviewAnomalyFlag[];
  isLoading?: boolean;
  className?: string;
}) {
  return (
    <SectionCard
      title="Anomaly flags"
      description="Failure-rate change vs previous period"
      className={className}
    >
      {isLoading ? (
        <Skeleton className="h-40 w-full" />
      ) : (
        <ul className="space-y-2">
          {data.map((row) => {
            const deltaPts = (row.failureRate - row.baselineRate) * 100;
            const worsening = deltaPts > 0;
            return (
              <li
                key={row.channel}
                className={cn(
                  "flex items-center justify-between gap-3 rounded-[10px] px-3 py-2.5",
                  worsening ? "bg-bad-soft" : "bg-muted",
                )}
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">
                    {CHANNELS[row.channel]?.name ?? row.channel}
                  </p>
                  <p className="truncate text-xs text-muted-foreground tabular-nums">
                    Now {(row.failureRate * 100).toFixed(2)}%, baseline {(row.baselineRate * 100).toFixed(2)}%
                  </p>
                </div>
                <span
                  className={cn(
                    "shrink-0 text-sm font-semibold tabular-nums",
                    worsening ? "text-bad" : "text-good",
                  )}
                >
                  <span aria-hidden>{worsening ? "▲" : "▼"}</span> {Math.abs(deltaPts).toFixed(2)} pts
                  <span className="sr-only">{worsening ? " (worsening)" : " (improving)"}</span>
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </SectionCard>
  );
}
