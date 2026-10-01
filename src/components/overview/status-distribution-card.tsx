"use client";

import { SectionCard } from "@/components/overview/section-card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCompactNumber } from "@/lib/format";
import type { OverviewStatusBreakdown } from "@/types/api";

const SEGMENTS: {
  id: keyof OverviewStatusBreakdown;
  label: string;
  color: string;
  /** Counts are approximate for these, so they read "≈ 683.9K". */
  approximate?: boolean;
  /** Small counts read better in full, e.g. "8,257". */
  full?: boolean;
}[] = [
  { id: "success", label: "Success", color: "var(--primary)", approximate: true },
  { id: "failed", label: "Failed", color: "var(--bad)" },
  { id: "reversed", label: "Reversed", color: "var(--reversed)", full: true },
  { id: "pending", label: "Pending", color: "var(--orange)", approximate: true },
];

/** How every transaction in the base period ended. Not filtered by period or platform. */
export function StatusDistributionCard({
  data,
  isLoading,
}: {
  data?: OverviewStatusBreakdown;
  isLoading?: boolean;
}) {
  const total = data ? data.success + data.failed + data.reversed + data.pending : 0;
  const pct = (count: number) => (total ? (count / total) * 100 : 0);

  return (
    <SectionCard title="Transaction status" description="How transactions ended this month">
      {isLoading || !data ? (
        <Skeleton className="h-44 w-full" />
      ) : (
        <>
          <p className="text-[40px] leading-none font-semibold text-foreground tabular-nums">
            {pct(data.success).toFixed(1)}%
            <span className="ml-2 align-middle text-sm font-normal text-muted-foreground">
              completed successfully
            </span>
          </p>

          <div className="mt-5 flex h-3.5 gap-0.5 overflow-hidden rounded-full" aria-hidden>
            {SEGMENTS.map((segment) => (
              <span
                key={segment.id}
                className="h-full first:rounded-l-full last:rounded-r-full"
                style={{ width: `${pct(data[segment.id])}%`, backgroundColor: segment.color }}
              />
            ))}
          </div>

          <ul className="mt-5 grid grid-cols-2 gap-3">
            {SEGMENTS.map((segment) => {
              const count = data[segment.id];
              const countLabel = segment.full
                ? count.toLocaleString("en-US")
                : `${segment.approximate ? "≈ " : ""}${formatCompactNumber(count)}`;
              return (
                <li key={segment.id} className="rounded-xl bg-muted px-4 py-3">
                  <p className="flex items-center gap-2 text-[13px] text-foreground-2">
                    <span className="size-2 rounded-full" style={{ backgroundColor: segment.color }} />
                    {segment.label}
                  </p>
                  <p className="mt-1 text-lg font-semibold text-foreground tabular-nums">
                    {pct(count).toFixed(1)}%
                    <span className="ml-1.5 text-xs font-normal text-muted-foreground">({countLabel})</span>
                  </p>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </SectionCard>
  );
}
