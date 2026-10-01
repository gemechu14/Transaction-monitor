"use client";

import { Skeleton } from "@/components/ui/skeleton";
import type { OverviewKpi } from "@/lib/overview";

const CARD_CLASS =
  "row-span-3 grid grid-rows-subgrid gap-y-1.5 rounded-2xl border border-border bg-card px-[22px] pt-5 pb-[22px] max-[620px]:p-[18px]";

/**
 * Six equal KPI cards in a 3×2 grid (2 per row at ≤620px). Each card spans
 * three subgrid rows so titles, numbers and detail lines line up across a row.
 */
export function OverviewKpiGrid({
  kpis,
  isLoading,
  skeletonCount = 6,
}: {
  kpis: OverviewKpi[];
  isLoading?: boolean;
  skeletonCount?: number;
}) {
  return (
    <div className="grid grid-cols-2 gap-3 min-[621px]:grid-cols-3">
      {isLoading
        ? Array.from({ length: skeletonCount }).map((_, index) => (
            <div key={index} className={CARD_CLASS}>
              <Skeleton className="h-5 w-28" />
              <Skeleton className="h-9 w-32" />
              <Skeleton className="h-4 w-40" />
            </div>
          ))
        : kpis.map((kpi) => (
            <div key={kpi.id} className={CARD_CLASS}>
              <p className="text-base font-semibold text-foreground max-[1640px]:hidden">
                {kpi.label}
              </p>
              <p className="hidden font-semibold text-foreground max-[1640px]:block max-[1640px]:text-sm max-[620px]:text-[13px]">
                {kpi.shortLabel}
              </p>
              <p className="text-[32px] leading-tight font-bold whitespace-nowrap text-primary-display tabular-nums max-[1640px]:text-[28px] max-[620px]:text-2xl">
                {kpi.value}
              </p>
              <p className="text-[15px] text-muted-foreground tabular-nums max-[620px]:text-[13px]">
                {kpi.detail}
              </p>
            </div>
          ))}
    </div>
  );
}
