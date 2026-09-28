"use client";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { CHANNELS } from "@/config/channels";
import { formatPercent } from "@/lib/format";
import type { ChannelSummary } from "@/types/api";

export function TopFailingChannelsCard({
  data,
  isLoading,
}: {
  data: ChannelSummary[];
  isLoading?: boolean;
}) {
  const rows = data
    .map((s) => ({
      ...s,
      failureRate: s.transactionCount ? (s.failedCount + s.reversedCount) / s.transactionCount : 0,
    }))
    .sort((a, b) => b.failureRate - a.failureRate)
    .slice(0, 3);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Top failing channels</CardTitle>
        <CardDescription>Highest failure rate in the selected period</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-40 w-full" />
        ) : (
          <ul className="space-y-3">
            {rows.map((row) => (
              <li key={row.channel} className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">
                    {CHANNELS[row.channel]?.name ?? row.channel}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {row.failedCount.toLocaleString()} failed · {row.reversedCount.toLocaleString()}{" "}
                    reversed
                  </p>
                </div>
                <Badge className="shrink-0 bg-status-failed/10 text-status-failed">
                  {formatPercent(row.failureRate, 2)}
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
