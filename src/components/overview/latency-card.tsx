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
import type { ChannelSummary } from "@/types/api";

export function LatencyCard({
  data,
  isLoading,
}: {
  data: ChannelSummary[];
  isLoading?: boolean;
}) {
  const rows = [...data]
    .filter((s) => typeof s.avgLatencyMs === "number")
    .sort((a, b) => (b.avgLatencyMs ?? 0) - (a.avgLatencyMs ?? 0));
  const max = Math.max(...rows.map((row) => row.avgLatencyMs ?? 0), 1);

  const totalCount = rows.reduce((acc, row) => acc + row.transactionCount, 0);
  const weightedSum = rows.reduce(
    (acc, row) => acc + (row.avgLatencyMs ?? 0) * row.transactionCount,
    0,
  );
  const weightedMean = totalCount ? Math.round(weightedSum / totalCount) : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>WSO2 gateway latency</CardTitle>
        <CardDescription>Weighted mean response time {weightedMean} ms</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-56 w-full" />
        ) : (
          <ul className="animate-in fade-in slide-in-from-bottom-2 space-y-3 duration-500 ease-out">
            {rows.map((row) => {
              const ms = row.avgLatencyMs ?? 0;
              return (
                <li key={row.channel} className="flex items-center gap-3">
                  <span className="w-24 shrink-0 truncate text-xs text-muted-foreground">
                    {CHANNELS[row.channel]?.shortName ?? row.channel}
                  </span>
                  <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                    <span
                      className="block h-full rounded-full bg-primary transition-[width] duration-700 ease-out"
                      style={{ width: `${Math.max(4, (ms / max) * 100)}%` }}
                    />
                  </span>
                  <span className="w-14 shrink-0 text-right text-xs font-medium text-foreground">
                    {ms} ms
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
