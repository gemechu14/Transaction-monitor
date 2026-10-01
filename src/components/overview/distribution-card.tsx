"use client";

import { useState } from "react";

import { SectionCard } from "@/components/overview/section-card";
import { Skeleton } from "@/components/ui/skeleton";
import { CHANNELS, type ChannelId } from "@/config/channels";
import { formatCompactNumber } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { OverviewChannelRow } from "@/types/api";

const SIZE = 176;
const RADIUS = 66;
const STROKE = 20;
const STROKE_FOCUSED = 26;
const GAP = 3;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function DistributionByChannelCard({
  data,
  selected,
  onSelect,
  isLoading,
}: {
  data: OverviewChannelRow[];
  selected: ChannelId | "all";
  onSelect: (channel: ChannelId | "all") => void;
  isLoading?: boolean;
}) {
  const [hovered, setHovered] = useState<ChannelId | null>(null);
  const total = data.reduce((acc, r) => acc + r.transactionCount, 0);
  const sorted = [...data].sort((a, b) => b.transactionCount - a.transactionCount);
  const focused = hovered ?? (selected === "all" ? null : selected);
  const focusedRow = sorted.find((r) => r.channel === focused);
  const share = (row: OverviewChannelRow) => (total ? row.transactionCount / total : 0);

  const toggle = (channel: ChannelId) => onSelect(selected === channel ? "all" : channel);

  const slices = sorted.map((row, index) => ({
    row,
    length: share(row) * CIRCUMFERENCE,
    offset: sorted.slice(0, index).reduce((acc, r) => acc + share(r) * CIRCUMFERENCE, 0),
  }));

  return (
    <SectionCard title="Distribution by channel" description="Share of total transaction count">
      {isLoading ? (
        <Skeleton className="h-44 w-full" />
      ) : (
        <div className="flex items-center gap-8 max-[620px]:flex-col max-[620px]:items-stretch">
          <div className="relative shrink-0 self-center" style={{ width: SIZE, height: SIZE }}>
            {/* Rotated so the first slice starts at 12 o'clock. */}
            <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} className="-rotate-90" aria-hidden>
              {slices.map(({ row, length, offset: start }) => {
                const isFocused = focused === row.channel;
                return (
                  <circle
                    key={row.channel}
                    cx={SIZE / 2}
                    cy={SIZE / 2}
                    r={RADIUS}
                    fill="none"
                    stroke="var(--primary)"
                    strokeWidth={isFocused ? STROKE_FOCUSED : STROKE}
                    strokeDasharray={`${Math.max(0, length - GAP)} ${CIRCUMFERENCE}`}
                    strokeDashoffset={-start}
                    className={cn(
                      "cursor-pointer transition-[stroke-width,opacity] duration-200 motion-reduce:transition-none",
                      focused && !isFocused && "opacity-[0.22]",
                    )}
                    onMouseEnter={() => setHovered(row.channel)}
                    onMouseLeave={() => setHovered(null)}
                    onClick={() => toggle(row.channel)}
                  />
                );
              })}
            </svg>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-xs text-muted-foreground">
                {focusedRow ? CHANNELS[focusedRow.channel]?.name : "Total"}
              </span>
              <span className="text-xl font-bold text-foreground tabular-nums">
                {focusedRow ? `${(share(focusedRow) * 100).toFixed(1)}%` : formatCompactNumber(total)}
              </span>
            </div>
          </div>

          <ul className="min-w-0 flex-1 space-y-1">
            {sorted.map((row) => {
              const config = CHANNELS[row.channel];
              const isSelected = selected === row.channel;
              return (
                <li key={row.channel}>
                  <button
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => toggle(row.channel)}
                    onMouseEnter={() => setHovered(row.channel)}
                    onMouseLeave={() => setHovered(null)}
                    onFocus={() => setHovered(row.channel)}
                    onBlur={() => setHovered(null)}
                    className={cn(
                      "flex w-full items-center gap-2.5 rounded-lg px-2 py-1 text-left text-sm hover:bg-muted focus-visible:outline-2 focus-visible:outline-primary",
                      isSelected && "bg-primary-soft hover:bg-primary-soft",
                    )}
                  >
                    <span className="flex size-[26px] shrink-0 items-center justify-center rounded-lg bg-primary-soft text-[11px] font-bold text-primary-strong">
                      {config?.initials}
                    </span>
                    <span className="flex-1 whitespace-nowrap text-foreground">{config?.name ?? row.channel}</span>
                    <span className="font-semibold text-foreground tabular-nums">
                      {(share(row) * 100).toFixed(1)}%
                    </span>
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
