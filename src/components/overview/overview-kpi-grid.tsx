"use client";

import type { OverviewKpi } from "@/lib/overview";

const CARD_CLASS =
  "@container min-w-0 row-span-3 grid grid-rows-subgrid gap-y-1.5 rounded-2xl border border-border bg-card px-[22px] pt-5 pb-[22px] max-[620px]:p-[18px]";

const LABEL_CLASS = "text-base font-semibold text-foreground max-[1640px]:hidden";
const SHORT_LABEL_CLASS =
  "hidden font-semibold text-foreground max-[1640px]:block max-[1640px]:text-sm max-[620px]:text-[13px]";
// Full numbers are long ("ETB 2,232,593,350.43"), so the size follows the card width (up to 32px) and always fits.
const VALUE_CLASS =
  "text-[length:min(32px,8cqi)] leading-tight font-bold whitespace-nowrap text-primary tabular-nums";
const DETAIL_CLASS = "text-[15px] text-muted-foreground tabular-nums max-[620px]:text-[13px]";

function KpiLabel({ kpi }: { kpi: Pick<OverviewKpi, "label" | "shortLabel"> }) {
  return (
    <>
      <p className={LABEL_CLASS}>{kpi.label}</p>
      <p className={SHORT_LABEL_CLASS}>{kpi.shortLabel}</p>
    </>
  );
}

/**
 * A shimmer bar inside an invisible line of text set in the same type as the
 * real content, so the loading card is exactly as tall as the loaded one.
 */
function ShimmerLine({
  className,
  barClassName,
  delay,
}: {
  className: string;
  barClassName: string;
  delay: string;
}) {
  return (
    <p className={`relative ${className}`}>
      <span className="invisible">0</span>
      <span
        className={`skeleton-shimmer absolute top-1/2 left-0 -translate-y-1/2 ${barClassName}`}
        style={{ animationDelay: delay }}
      />
    </p>
  );
}

/**
 * Loading card. Keeps the real title when it is known so the reader can see
 * which figure is on its way. `index` staggers the shimmer across cards.
 */
function KpiSkeleton({ kpi, index }: { kpi?: OverviewKpi; index: number }) {
  const delay = `${index * 140}ms`;
  return (
    <div className={CARD_CLASS} aria-busy="true">
      {kpi ? (
        <KpiLabel kpi={kpi} />
      ) : (
        <ShimmerLine className="text-base max-[1640px]:text-sm max-[620px]:text-[13px]" barClassName="h-[0.85em] w-28 rounded-full" delay={delay} />
      )}
      <ShimmerLine className={VALUE_CLASS} barClassName="h-[0.8em] w-[58%] max-w-44 rounded-lg" delay={delay} />
      <ShimmerLine className={DETAIL_CLASS} barClassName="h-[0.8em] w-[72%] max-w-56 rounded-full" delay={delay} />
      <span className="sr-only">Loading{kpi ? ` ${kpi.label}` : ""}</span>
    </div>
  );
}

/**
 * Six equal KPI cards in a 3×2 grid (2 per row at ≤620px, 1 at ≤480px so the
 * full amounts stay readable). Each card spans
 * three subgrid rows so titles, numbers and detail lines line up across a row.
 * `loadingIds` swaps just those cards for skeletons, e.g. while live totals load.
 */
export function OverviewKpiGrid({
  kpis,
  isLoading,
  loadingIds,
  skeletonCount = 6,
}: {
  kpis: OverviewKpi[];
  isLoading?: boolean;
  loadingIds?: ReadonlySet<string>;
  skeletonCount?: number;
}) {
  return (
    <div className="grid grid-cols-1 gap-3 min-[481px]:grid-cols-2 min-[621px]:grid-cols-3">
      {isLoading
        ? Array.from({ length: skeletonCount }).map((_, index) => (
            <KpiSkeleton key={index} index={index} />
          ))
        : kpis.map((kpi, index) =>
            loadingIds?.has(kpi.id) ? (
              <KpiSkeleton key={kpi.id} kpi={kpi} index={index} />
            ) : (
              <div key={kpi.id} className={CARD_CLASS}>
                <KpiLabel kpi={kpi} />
                <p className={`kpi-reveal ${VALUE_CLASS}`}>{kpi.value}</p>
                <p className={`kpi-reveal ${DETAIL_CLASS}`} style={{ animationDelay: "60ms" }}>
                  {kpi.detail}
                </p>
              </div>
            ),
          )}
    </div>
  );
}
