"use client";

import { useState } from "react";

import { SectionCard } from "@/components/overview/section-card";
import {
  WSO2_SOURCE_INITIALS,
  WSO2_SOURCE_LABELS,
  type Wso2ChannelSource,
  type Wso2Source,
} from "@/config/wso2-sources";
import { formatCompactNumber } from "@/lib/format";
import type { SourceRow } from "@/lib/overview";
import { cn } from "@/lib/utils";

const SIZE = 176;
const RADIUS = 66;
const STROKE = 20;
const STROKE_FOCUSED = 26;
const GAP = 3;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

const LAYOUT_CLASS = "flex items-center gap-8 max-[620px]:flex-col max-[620px]:items-stretch";
const ROW_CLASS = "flex w-full items-center gap-2.5 rounded-lg px-2 py-1 text-left text-sm";

/** Sources shown by name; the rest are added up into one "Others" row and slice. */
const TOP_COUNT = 5;
const OTHERS = "others";

type SliceKey = Wso2ChannelSource | typeof OTHERS;

interface Slice {
  key: SliceKey;
  label: string;
  initials: string;
  count: number;
  /** The sources this slice covers: one, or every source folded into Others. */
  sources: Wso2ChannelSource[];
}

/** Top sources by transaction count, then one Others slice for the rest. */
function toSlices(rows: SourceRow[]): Slice[] {
  const sorted = [...rows].sort((a, b) => b.totalTransactions - a.totalTransactions);
  const top: Slice[] = sorted.slice(0, TOP_COUNT).map((row) => ({
    key: row.source,
    label: WSO2_SOURCE_LABELS[row.source],
    initials: WSO2_SOURCE_INITIALS[row.source],
    count: row.totalTransactions,
    sources: [row.source],
  }));
  const rest = sorted.slice(TOP_COUNT);
  if (rest.length === 0) return top;
  return [
    ...top,
    {
      key: OTHERS,
      label: "Others",
      initials: `+${rest.length}`,
      count: rest.reduce((acc, r) => acc + r.totalTransactions, 0),
      sources: rest.map((r) => r.source),
    },
  ];
}

/** 55.1%, 0.28%, <0.01%: one decimal from 1%, two below, and a floor beyond that. */
function formatShare(fraction: number): string {
  const percent = fraction * 100;
  if (percent === 0) return "0%";
  if (percent >= 1) return `${percent.toFixed(1)}%`;
  if (percent >= 0.01) return `${percent.toFixed(2)}%`;
  return "<0.01%";
}

/** Same ring and rows as the loaded card, so nothing shifts when data arrives. */
function LoadingState() {
  return (
    <div className={LAYOUT_CLASS} aria-busy="true">
      <div className="relative shrink-0 self-center" style={{ width: SIZE, height: SIZE }}>
        <div
          className="skeleton-shimmer size-full rounded-full"
          style={{
            mask: `radial-gradient(circle, transparent ${RADIUS - STROKE / 2}px, #000 ${RADIUS - STROKE / 2 + 0.5}px, #000 ${RADIUS + STROKE / 2}px, transparent ${RADIUS + STROKE / 2 + 0.5}px)`,
          }}
        />
      </div>
      <ul className="min-w-0 flex-1 space-y-1">
        {Array.from({ length: TOP_COUNT + 1 }, (_, index) => {
          const delay = { animationDelay: `${index * 60}ms` };
          return (
            <li key={index} className={ROW_CLASS}>
              <span className="skeleton-shimmer size-[26px] shrink-0 rounded-lg" style={delay} />
              <span className="flex-1">
                <span className="skeleton-shimmer block h-3 w-28 rounded-full" style={delay} />
              </span>
              <span className="skeleton-shimmer h-3 w-10 rounded-full" style={delay} />
            </li>
          );
        })}
      </ul>
      <span className="sr-only">Loading distribution by channel</span>
    </div>
  );
}

/**
 * Share of transaction count per WSO2 source, from the same allAdvanced call as
 * the KPIs. Clicking a slice or row sets the page's source filter.
 */
export function DistributionByChannelCard({
  data,
  selected,
  onSelect,
  isLoading,
  errorMessage,
}: {
  data: SourceRow[];
  selected: Wso2Source;
  onSelect: (source: Wso2Source) => void;
  isLoading?: boolean;
  errorMessage?: string;
}) {
  const [hovered, setHovered] = useState<SliceKey | null>(null);
  const total = data.reduce((acc, r) => acc + r.totalTransactions, 0);
  const slices = toSlices(data);
  const othersSources = slices.find((s) => s.key === OTHERS)?.sources ?? [];
  // A selected source folded into Others highlights the Others slice.
  const selectedKey: SliceKey | null =
    selected === "all" ? null : othersSources.includes(selected) ? OTHERS : selected;
  const focused = hovered ?? selectedKey;
  const focusedSlice = slices.find((s) => s.key === focused);
  const share = (slice: Slice) => (total ? slice.count / total : 0);

  // Others is not one source, so it can't filter the page; only real sources toggle.
  const toggle = (key: SliceKey) => {
    if (key !== OTHERS) onSelect(selected === key ? "all" : key);
  };

  const arcs = slices.map((slice, index) => ({
    slice,
    length: share(slice) * CIRCUMFERENCE,
    offset: slices.slice(0, index).reduce((acc, s) => acc + share(s) * CIRCUMFERENCE, 0),
  }));

  return (
    <SectionCard title="Distribution by channel" description="Share of total transaction count">
      {isLoading ? (
        <LoadingState />
      ) : data.length === 0 ? (
        <p className="flex h-44 items-center justify-center text-sm text-muted-foreground">
          {errorMessage ? `Channel figures unavailable: ${errorMessage}` : "No channel figures for this period"}
        </p>
      ) : (
        <div className={LAYOUT_CLASS}>
          <div className="relative shrink-0 self-center" style={{ width: SIZE, height: SIZE }}>
            {/* Rotated so the first slice starts at 12 o'clock. */}
            <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} className="-rotate-90" aria-hidden>
              {total === 0 && (
                <circle cx={SIZE / 2} cy={SIZE / 2} r={RADIUS} fill="none" stroke="var(--track)" strokeWidth={STROKE} />
              )}
              {arcs
                .filter(({ length }) => length > 0)
                .map(({ slice, length, offset: start }) => {
                  const isFocused = focused === slice.key;
                  return (
                    <circle
                      key={slice.key}
                      cx={SIZE / 2}
                      cy={SIZE / 2}
                      r={RADIUS}
                      fill="none"
                      // Others is drawn lighter so it reads as a remainder, not a channel.
                      stroke={slice.key === OTHERS ? "var(--donut-others)" : "var(--primary)"}
                      strokeWidth={isFocused ? STROKE_FOCUSED : STROKE}
                      strokeDasharray={`${Math.max(0, length - GAP)} ${CIRCUMFERENCE}`}
                      strokeDashoffset={-start}
                      className={cn(
                        "transition-[stroke-width,opacity] duration-200 motion-reduce:transition-none",
                        slice.key !== OTHERS && "cursor-pointer",
                        focused && !isFocused && "opacity-[0.22]",
                      )}
                      onMouseEnter={() => setHovered(slice.key)}
                      onMouseLeave={() => setHovered(null)}
                      onClick={() => toggle(slice.key)}
                    />
                  );
                })}
            </svg>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
              <span className="max-w-full truncate text-xs text-muted-foreground">
                {focusedSlice ? focusedSlice.label : "Total"}
              </span>
              <span className="text-xl font-bold text-foreground tabular-nums">
                {focusedSlice ? formatShare(share(focusedSlice)) : formatCompactNumber(total)}
              </span>
            </div>
          </div>

          <ul className="min-w-0 flex-1 space-y-1">
            {slices.map((slice) => {
              const isOthers = slice.key === OTHERS;
              const isSelected = selectedKey === slice.key;
              return (
                <li key={slice.key}>
                  <button
                    type="button"
                    aria-pressed={isOthers ? undefined : isSelected}
                    title={isOthers ? slice.sources.map((s) => WSO2_SOURCE_LABELS[s]).join(", ") : undefined}
                    onClick={() => toggle(slice.key)}
                    onMouseEnter={() => setHovered(slice.key)}
                    onMouseLeave={() => setHovered(null)}
                    onFocus={() => setHovered(slice.key)}
                    onBlur={() => setHovered(null)}
                    className={cn(
                      ROW_CLASS,
                      "hover:bg-muted focus-visible:outline-2 focus-visible:outline-primary",
                      isOthers && "cursor-default",
                      isSelected && "bg-primary-soft hover:bg-primary-soft",
                    )}
                  >
                    <span className="flex size-[26px] shrink-0 items-center justify-center rounded-lg bg-primary-soft text-[11px] font-bold text-primary-strong">
                      {slice.initials}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-foreground">
                      {slice.label}
                      {isOthers && (
                        <span className="text-muted-foreground"> ({slice.sources.length} sources)</span>
                      )}
                    </span>
                    <span className="font-semibold text-foreground tabular-nums">{formatShare(share(slice))}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </SectionCard>
  );
}
