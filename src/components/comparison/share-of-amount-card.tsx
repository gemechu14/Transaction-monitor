"use client";

import { SIDE_DOT_CLASS } from "@/components/comparison/comparison-filter-bar";
import { SectionCard } from "@/components/overview/section-card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatAmount, shareOfAmount, type SideFigures, type SideKey } from "@/lib/comparison";
import { cn } from "@/lib/utils";

const SIZE = 220;
const RADIUS = 84;
const STROKE = 30;
const GAP = 3;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const SIDE_STROKE: Record<SideKey, string> = { a: "var(--orange)", b: "var(--primary)" };

export function ShareOfAmountCard({
  a,
  b,
  isLoading,
}: {
  a: SideFigures;
  b: SideFigures;
  isLoading?: boolean;
}) {
  const share = shareOfAmount(a, b);

  return (
    <SectionCard title="Share of amount" description="How the combined amount splits between the two sides">
      {isLoading ? (
        <Skeleton className="h-56 w-full" />
      ) : !share ? (
        <div className="flex h-56 items-center justify-center rounded-xl bg-muted text-sm text-muted-foreground">
          Not enough data for this comparison.
        </div>
      ) : (
        <ShareBody a={a} b={b} share={share} />
      )}
    </SectionCard>
  );
}

function ShareBody({
  a,
  b,
  share,
}: {
  a: SideFigures;
  b: SideFigures;
  share: { a: number; b: number; combined: number };
}) {
  const lengthA = (share.a / 100) * CIRCUMFERENCE;
  const lengthB = (share.b / 100) * CIRCUMFERENCE;
  const slices: { side: SideKey; length: number; offset: number }[] = [
    { side: "a", length: lengthA, offset: 0 },
    { side: "b", length: lengthB, offset: lengthA },
  ];

  const leader = share.a >= share.b ? a : b;
  const leaderShare = Math.max(share.a, share.b);
  const takeaway = `${leader.name} brings ${leaderShare.toFixed(1)}% of the combined amount${
    Math.abs(share.a - 50) <= 3 ? ", so the two are almost level" : ""
  }.`;

  return (
    <>
      <div className="flex items-center gap-8 max-[760px]:flex-col max-[760px]:items-stretch">
        <div className="relative shrink-0 self-center" style={{ width: SIZE, height: SIZE }}>
          <svg
            width={SIZE}
            height={SIZE}
            viewBox={`0 0 ${SIZE} ${SIZE}`}
            className="-rotate-90"
            role="img"
            aria-label={`${a.name} ${share.a.toFixed(1)}%, ${b.name} ${share.b.toFixed(1)}% of the combined amount`}
          >
            {slices.map((slice) =>
              slice.length > 0 ? (
                <circle
                  key={slice.side}
                  cx={SIZE / 2}
                  cy={SIZE / 2}
                  r={RADIUS}
                  fill="none"
                  stroke={SIDE_STROKE[slice.side]}
                  strokeWidth={STROKE}
                  strokeDasharray={`${Math.max(0, slice.length - (share.a > 0 && share.b > 0 ? GAP : 0))} ${CIRCUMFERENCE}`}
                  strokeDashoffset={-slice.offset}
                />
              ) : null,
            )}
          </svg>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-xs text-muted-foreground">Combined</span>
            <span className="text-lg font-bold text-foreground tabular-nums">{formatAmount(share.combined)}</span>
          </div>
        </div>

        <ul className="min-w-0 flex-1 space-y-4">
          {(["a", "b"] as const).map((side) => {
            const figures = side === "a" ? a : b;
            return (
              <li key={side}>
                <p className="flex items-center gap-2 text-sm font-medium text-foreground-2">
                  <span className={cn("size-2.5 shrink-0 rounded-full", SIDE_DOT_CLASS[side])} aria-hidden />
                  {figures.name}
                </p>
                <p className="text-2xl font-bold text-foreground tabular-nums">{share[side].toFixed(1)}%</p>
                <p className="text-[13px] text-muted-foreground tabular-nums">
                  {figures.amount === null ? "—" : formatAmount(figures.amount)}
                </p>
              </li>
            );
          })}
        </ul>
      </div>
      <p className="mt-5 border-t border-line-soft pt-4 text-sm text-foreground-2">{takeaway}</p>
    </>
  );
}
