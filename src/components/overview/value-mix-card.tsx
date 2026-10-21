"use client";

import { SectionCard } from "@/components/overview/section-card";
import { WSO2_SOURCE_LABELS } from "@/config/wso2-sources";
import type { DateRange } from "@/lib/date";
import { formatAmountValue } from "@/lib/format";
import { formatFullRangeLabel, type SourceRow } from "@/lib/overview";

/** Sources named in the bar and tiles; the rest are added up into Others. */
const TOP_COUNT = 3;
// Ranked parts of a whole: one blue, strongest for the largest share and lighter
// for each next one, ending with Others as the palest step (as in the donut card).
const COLORS = [
  "var(--primary)",
  "color-mix(in srgb, var(--primary) 62%, transparent)",
  "color-mix(in srgb, var(--primary) 38%, transparent)",
  "color-mix(in srgb, var(--primary) 20%, transparent)",
];

interface Segment {
  key: string;
  label: string;
  amount: number;
  color: string;
}

/** Top sources by amount, then Others, so there are always four tiles. */
function toSegments(rows: SourceRow[]): Segment[] {
  const sorted = [...rows].sort((a, b) => b.totalAmount - a.totalAmount);
  const top = sorted.slice(0, TOP_COUNT).map((row, index) => ({
    key: row.source,
    label: WSO2_SOURCE_LABELS[row.source],
    amount: row.totalAmount,
    color: COLORS[index],
  }));
  const rest = sorted.slice(TOP_COUNT);
  return [
    ...top,
    {
      key: "others",
      label: `Others (${rest.length})`,
      amount: rest.reduce((acc, r) => acc + r.totalAmount, 0),
      color: COLORS[TOP_COUNT],
    },
  ];
}

/** 55.1%, 0.28%, <0.01%: one decimal from 1%, two below, and a floor beyond that. */
function formatShare(percent: number): string {
  if (percent === 0) return "0%";
  if (percent >= 1) return `${percent.toFixed(1)}%`;
  if (percent >= 0.01) return `${percent.toFixed(2)}%`;
  return "<0.01%";
}

const HEADLINE_CLASS = "text-[40px] leading-none font-semibold text-foreground tabular-nums";
const TILE_LABEL_CLASS = "flex items-center gap-2 text-[13px] text-foreground-2";
const TILE_VALUE_CLASS = "mt-1 text-lg font-semibold text-foreground tabular-nums";

/** A shimmer bar inside an invisible line of the real type, so heights match exactly. */
function ShimmerLine({ className, barClassName, delay = 0 }: { className: string; barClassName: string; delay?: number }) {
  return (
    <p className={`relative ${className}`}>
      <span className="invisible">0</span>
      <span
        className={`skeleton-shimmer absolute top-1/2 left-0 -translate-y-1/2 ${barClassName}`}
        style={{ animationDelay: `${delay}ms` }}
      />
    </p>
  );
}

function LoadingState() {
  return (
    <div aria-busy="true">
      <ShimmerLine className={HEADLINE_CLASS} barClassName="h-[0.8em] w-56 rounded-lg" />
      <div className="skeleton-shimmer mt-5 h-3.5 rounded-full" />
      <ul className="mt-5 grid grid-cols-2 gap-3">
        {Array.from({ length: TOP_COUNT + 1 }, (_, index) => (
          <li key={index} className="rounded-xl bg-muted px-4 py-3">
            <ShimmerLine className={TILE_LABEL_CLASS} barClassName="h-[0.8em] w-24 rounded-full" delay={index * 100} />
            <ShimmerLine className={TILE_VALUE_CLASS} barClassName="h-[0.8em] w-32 rounded-full" delay={index * 100} />
          </li>
        ))}
      </ul>
      <span className="sr-only">Loading value by source</span>
    </div>
  );
}

/**
 * How the period's total amount splits across WSO2 sources, from the same
 * allAdvanced call as the KPIs. Takes the place of the status card, since the
 * API has no success/failed/reversed/pending figures.
 */
export function ValueMixCard({
  data,
  range,
  isLoading,
  errorMessage,
}: {
  data: SourceRow[];
  range: DateRange;
  isLoading?: boolean;
  errorMessage?: string;
}) {
  const segments = toSegments(data);
  const total = segments.reduce((acc, s) => acc + s.amount, 0);
  const pct = (amount: number) => (total ? (amount / total) * 100 : 0);
  const leader = segments[0];

  return (
    <SectionCard title="Share of value" description={`Share of total value in ETB, ${formatFullRangeLabel(range)}`}>
      {isLoading ? (
        <LoadingState />
      ) : data.length === 0 || total === 0 ? (
        <p className="flex h-44 items-center justify-center text-sm text-muted-foreground">
          {errorMessage ? `Source figures unavailable: ${errorMessage}` : "No transactions in this period"}
        </p>
      ) : (
        <>
          <p className={HEADLINE_CLASS}>
            {formatShare(pct(leader.amount))}
            <span className="ml-2 align-middle text-sm font-normal text-muted-foreground">
              of value via {leader.label}
            </span>
          </p>

          <div className="mt-5 flex h-3.5 gap-0.5 overflow-hidden rounded-full" aria-hidden>
            {segments.map((segment) => (
              <span
                key={segment.key}
                className="h-full first:rounded-l-full last:rounded-r-full"
                style={{ width: `${pct(segment.amount)}%`, backgroundColor: segment.color }}
              />
            ))}
          </div>

          <ul className="mt-5 grid grid-cols-2 gap-3">
            {segments.map((segment) => (
              <li key={segment.key} className="rounded-xl bg-muted px-4 py-3">
                <p className={TILE_LABEL_CLASS}>
                  <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: segment.color }} />
                  <span className="truncate">{segment.label}</span>
                </p>
                <p className={TILE_VALUE_CLASS}>
                  {formatShare(pct(segment.amount))}
                  <span className="ml-1.5 text-xs font-normal text-muted-foreground">({formatAmountValue(segment.amount)})</span>
                </p>
              </li>
            ))}
          </ul>
        </>
      )}
    </SectionCard>
  );
}
