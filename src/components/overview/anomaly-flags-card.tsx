"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { CHANNELS } from "@/config/channels";
import { cn } from "@/lib/utils";
import type { ChannelSummary } from "@/types/api";

function failureRate(summary: ChannelSummary): number {
  return summary.transactionCount
    ? (summary.failedCount + summary.reversedCount) / summary.transactionCount
    : 0;
}

export function AnomalyFlagsCard({
  current,
  previous,
  isLoading,
}: {
  current: ChannelSummary[];
  previous: ChannelSummary[];
  isLoading?: boolean;
}) {
  const previousByChannel = new Map(previous.map((s) => [s.channel, s]));

  const rows = current
    .map((summary) => {
      const prev = previousByChannel.get(summary.channel);
      const rate = failureRate(summary);
      const prevRate = prev ? failureRate(prev) : rate;
      return {
        channel: summary.channel,
        rate,
        prevRate,
        deltaPts: (rate - prevRate) * 100,
      };
    })
    .sort((a, b) => Math.abs(b.deltaPts) - Math.abs(a.deltaPts))
    .slice(0, 4);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Anomaly flags</CardTitle>
        <CardDescription>Failure-rate movement vs previous period</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-40 w-full" />
        ) : (
          <ul className="space-y-2">
            {rows.map((row) => (
              <li
                key={row.channel}
                className="flex items-center justify-between gap-3 rounded-lg bg-status-pending/10 px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">
                    {CHANNELS[row.channel]?.name ?? row.channel}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    Failure rate {(row.rate * 100).toFixed(2)}% vs baseline{" "}
                    {(row.prevRate * 100).toFixed(2)}%
                  </p>
                </div>
                <span
                  className={cn(
                    "shrink-0 text-sm font-semibold",
                    row.deltaPts > 0 ? "text-status-failed" : "text-status-success",
                  )}
                >
                  {row.deltaPts > 0 ? "+" : ""}
                  {row.deltaPts.toFixed(2)}% pts
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
