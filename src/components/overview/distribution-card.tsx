"use client";

import { DonutChart, type DonutDatum } from "@/components/charts/donut-chart";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { CHANNELS } from "@/config/channels";
import { NEUTRAL_TEXT } from "@/config/colors";
import { formatCompactNumber, formatPercent } from "@/lib/format";
import type { ChannelSummary } from "@/types/api";

export function DistributionByChannelCard({
  data,
  isLoading,
}: {
  data: ChannelSummary[];
  isLoading?: boolean;
}) {
  const total = data.reduce((acc, s) => acc + s.transactionCount, 0);
  const sorted = [...data].sort((a, b) => b.transactionCount - a.transactionCount);

  const donutData: DonutDatum[] = sorted.map((s) => ({
    key: s.channel,
    label: CHANNELS[s.channel]?.name ?? s.channel,
    value: s.transactionCount,
    color: CHANNELS[s.channel]?.color ?? NEUTRAL_TEXT,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Distribution by channel</CardTitle>
        <CardDescription>Share of total transaction count</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-40 w-full" />
        ) : (
          <div className="flex animate-in fade-in slide-in-from-bottom-2 flex-wrap items-center gap-6 duration-500 ease-out">
            <DonutChart
              data={donutData}
              centerLabel="Total txns"
              centerValue={formatCompactNumber(total)}
            />
            <ul className="min-w-40 flex-1 space-y-2">
              {sorted.map((s) => (
                <li
                  key={s.channel}
                  className="flex items-center justify-between gap-2 text-sm"
                >
                  <span className="flex items-center gap-2 text-foreground">
                    <span
                      className="size-2 rounded-full"
                      style={{ backgroundColor: CHANNELS[s.channel]?.color }}
                    />
                    {CHANNELS[s.channel]?.name ?? s.channel}
                  </span>
                  <span className="font-medium text-foreground">
                    {formatPercent(total ? s.transactionCount / total : 0, 1)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
