"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrencyCompact } from "@/lib/format";
import type { ReconciliationSummary } from "@/types/api";

const STAT_SKELETON_COUNT = 3;

export function SettlementSummaryCards({
  data,
  isLoading,
}: {
  data: ReconciliationSummary[];
  isLoading?: boolean;
}) {
  const grossInflow = data.reduce((acc, row) => acc + row.inflow, 0);
  const grossOutflow = data.reduce((acc, row) => acc + row.outflow, 0);

  const stats = [
    { label: "Gross inflow", value: grossInflow },
    { label: "Gross outflow", value: grossOutflow },
    { label: "Net settlement position", value: grossInflow - grossOutflow },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      {isLoading
        ? Array.from({ length: STAT_SKELETON_COUNT }).map((_, index) => (
            <Card key={index}>
              <CardContent className="space-y-2">
                <Skeleton className="h-3 w-28" />
                <Skeleton className="h-7 w-32" />
              </CardContent>
            </Card>
          ))
        : stats.map((stat) => (
            <Card key={stat.label}>
              <CardContent className="space-y-1.5">
                <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                  {stat.label}
                </p>
                <p className="text-2xl font-semibold text-foreground">
                  {stat.value < 0 ? "-" : ""}
                  {formatCurrencyCompact(Math.abs(stat.value), "ETB", 2)}
                </p>
              </CardContent>
            </Card>
          ))}
    </div>
  );
}
