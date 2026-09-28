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
import { STATUS_COLORS } from "@/config/colors";
import { STATUS_CONFIG, type TransactionStatus } from "@/config/status";
import { formatPercent } from "@/lib/format";
import type { ChannelSummary } from "@/types/api";

export function StatusDistributionCard({
  data,
  isLoading,
}: {
  data: ChannelSummary[];
  isLoading?: boolean;
}) {
  const total = data.reduce((acc, s) => acc + s.transactionCount, 0);
  const failed = data.reduce((acc, s) => acc + s.failedCount, 0);
  const pending = data.reduce((acc, s) => acc + s.pendingCount, 0);
  const reversed = data.reduce((acc, s) => acc + s.reversedCount, 0);
  const success = Math.max(0, total - failed - pending - reversed);
  const successRate = total ? success / total : 0;

  const rows: { id: TransactionStatus; value: number }[] = [
    { id: "success", value: success },
    { id: "failed", value: failed },
    { id: "pending", value: pending },
    { id: "reversed", value: reversed },
  ];

  const donutData: DonutDatum[] = rows.map((row) => ({
    key: row.id,
    label: STATUS_CONFIG[row.id].label,
    value: row.value,
    color: STATUS_COLORS[row.id].fg,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Status distribution</CardTitle>
        <CardDescription>Success, failed, pending and reversed outcomes</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-40 w-full" />
        ) : (
          <div className="flex animate-in fade-in slide-in-from-bottom-2 flex-wrap items-center gap-6 duration-500 ease-out">
            <DonutChart
              data={donutData}
              centerLabel="Success rate"
              centerValue={formatPercent(successRate, 1)}
            />
            <ul className="min-w-40 flex-1 space-y-2">
              {rows.map((row) => (
                <li key={row.id} className="flex items-center justify-between gap-2 text-sm">
                  <span className="flex items-center gap-2 text-foreground">
                    <span
                      className="size-2 rounded-full"
                      style={{ backgroundColor: STATUS_COLORS[row.id].fg }}
                    />
                    {STATUS_CONFIG[row.id].label}
                  </span>
                  <span className="font-medium text-foreground">
                    {formatPercent(total ? row.value / total : 0, 1)}
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
