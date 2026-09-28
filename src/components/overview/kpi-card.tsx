"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatKpiValue, formatSignedPercent } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Kpi } from "@/types/api";

export function KpiCard({
  kpi,
  isLoading,
  accent = false,
}: {
  kpi?: Kpi;
  isLoading?: boolean;
  accent?: boolean;
}) {
  if (isLoading || !kpi) {
    return (
      <Card size="sm">
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-5 w-12 rounded-full" />
          </div>
          <Skeleton className="h-7 w-24" />
          <Skeleton className="h-4 w-32" />
        </CardContent>
      </Card>
    );
  }

  const hasChange = typeof kpi.change === "number" && kpi.change !== 0;
  const isIncrease = (kpi.change ?? 0) > 0;
  const isGoodChange = kpi.higherIsBetter === false ? !isIncrease : isIncrease;

  return (
    <Card size="sm">
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <p className="truncate text-sm font-semibold text-foreground">{kpi.label}</p>
          {hasChange && (
            <span
              className={cn(
                "inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-xs font-semibold",
                isGoodChange ? "bg-primary/10 text-primary" : "bg-status-failed/10 text-status-failed",
              )}
            >
              {formatSignedPercent(kpi.change ?? 0)}
            </span>
          )}
        </div>

        <div>
          <p className={cn("text-2xl font-bold", accent ? "text-primary" : "text-foreground")}>
            {formatKpiValue(kpi)}
          </p>
          {kpi.helperText && (
            <p className="truncate text-sm text-muted-foreground">{kpi.helperText}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
