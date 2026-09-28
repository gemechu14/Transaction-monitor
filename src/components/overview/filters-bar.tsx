"use client";

import { ArrowDownLeft, ArrowUpRight, Layers } from "lucide-react";

import { DateRangePicker } from "@/components/overview/date-range-picker";
import type { FlowDirection } from "@/components/overview/flow-chart-card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SORT_ITEMS, type ChannelSortOption } from "@/config/channel-sort";
import { CHANNEL_LIST, type ChannelId } from "@/config/channels";
import type { DateRange } from "@/lib/date";
import { cn } from "@/lib/utils";

const DIRECTION_OPTIONS: { value: FlowDirection; label: string; icon?: typeof ArrowDownLeft }[] = [
  { value: "both", label: "In & out" },
  { value: "in", label: "In", icon: ArrowDownLeft },
  { value: "out", label: "Out", icon: ArrowUpRight },
];

const SORT_OPTIONS = Object.keys(SORT_ITEMS) as ChannelSortOption[];

const PLATFORM_ITEMS: Record<string, string> = {
  all: "All platforms",
  ...Object.fromEntries(CHANNEL_LIST.map((c) => [c.id, c.name])),
};

export function FiltersBar({
  channel,
  onChannelChange,
  direction,
  onDirectionChange,
  range,
  onRangeChange,
  sortBy,
  onSortByChange,
}: {
  channel: ChannelId | "all";
  onChannelChange: (channel: ChannelId | "all") => void;
  direction: FlowDirection;
  onDirectionChange: (direction: FlowDirection) => void;
  range: DateRange;
  onRangeChange: (range: DateRange) => void;
  /**
   * When provided, this replaces the In & out / In / Out direction toggle with a
   * "Rank by" sort control instead. The direction toggle is disabled for now
   * rather than removed, so it can come back without rebuilding it.
   */
  sortBy?: ChannelSortOption;
  onSortByChange?: (value: ChannelSortOption) => void;
}) {
  const showSort = sortBy !== undefined && onSortByChange !== undefined;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select
        items={PLATFORM_ITEMS}
        value={channel}
        onValueChange={(value) => onChannelChange(value as ChannelId | "all")}
      >
        <SelectTrigger size="sm" className="w-40">
          <Layers className="size-3.5 text-primary" />
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All platforms</SelectItem>
          {CHANNEL_LIST.map((c) => (
            <SelectItem key={c.id} value={c.id}>
              {c.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {showSort ? (
        <Select
          items={SORT_ITEMS}
          value={sortBy}
          onValueChange={(value) => onSortByChange(value as ChannelSortOption)}
        >
          <SelectTrigger size="sm" className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map((option) => (
              <SelectItem key={option} value={option}>
                {SORT_ITEMS[option]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : (
        // Direction filter — disabled for now in favor of the sort control above
        // on pages that pass `sortBy`. Left in place so it's a one-line flip to
        // bring back everywhere else.
        <div className="flex rounded-md border border-border p-0.5">
          {DIRECTION_OPTIONS.map((option) => (
            <Button
              key={option.value}
              size="sm"
              variant="ghost"
              className={cn(
                "h-7 gap-1 px-2.5 text-xs",
                direction === option.value
                  ? "bg-primary/10 text-primary hover:bg-primary/15"
                  : "text-muted-foreground",
              )}
              onClick={() => onDirectionChange(option.value)}
            >
              {option.icon && <option.icon className="size-3.5 text-primary" />}
              {option.label}
            </Button>
          ))}
        </div>
      )}

      <DateRangePicker range={range} onRangeChange={onRangeChange} />
    </div>
  );
}
