"use client";

import { useState } from "react";
import { CalendarDays, Check } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { formatDateRangeLabel, getLastNDays, type DateRange } from "@/lib/date";
import { cn } from "@/lib/utils";

const PERIOD_PRESETS: { label: string; days: number }[] = [
  { label: "Today", days: 1 },
  { label: "Last 7 days", days: 7 },
  // Hidden for now.
  // { label: "Last 4 weeks", days: 28 },
  { label: "This month (30d)", days: 30 },
  { label: "Quarterly (3 months)", days: 90 },
  { label: "6 Months", days: 180 },
  { label: "Yearly", days: 365 },
];

export function DateRangePicker({
  range,
  onRangeChange,
}: {
  range: DateRange;
  onRangeChange: (range: DateRange) => void;
}) {
  const [open, setOpen] = useState(false);
  const [draftFrom, setDraftFrom] = useState(range.from);
  const [draftTo, setDraftTo] = useState(range.to);

  function handleOpenChange(next: boolean) {
    if (next) {
      setDraftFrom(range.from);
      setDraftTo(range.to);
    }
    setOpen(next);
  }

  const activePresetDays = (() => {
    const [fy, fm, fd] = range.from.split("-").map(Number);
    const [ty, tm, td] = range.to.split("-").map(Number);
    const days =
      Math.round(
        (Date.UTC(ty, tm - 1, td) - Date.UTC(fy, fm - 1, fd)) / 86_400_000,
      ) + 1;
    return days;
  })();

  function handlePresetSelect(days: number) {
    onRangeChange(getLastNDays(days));
    setOpen(false);
  }

  const reversed = !!draftFrom && !!draftTo && draftTo < draftFrom;
  const canApply = !!draftFrom && !!draftTo && !reversed;

  function applyCustomRange() {
    if (!canApply) return;
    onRangeChange({ from: draftFrom, to: draftTo });
    setOpen(false);
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger
        render={
          <Button variant="outline" size="sm" className="gap-1.5 text-xs" />
        }
      >
        <CalendarDays className="size-3.5 text-primary" />
        {formatDateRangeLabel(range)}
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="flex max-w-[calc(100vw-2rem)] flex-col overflow-hidden p-0 sm:max-w-none sm:flex-row"
      >
        <div className="w-full shrink-0 border-b border-border py-2 sm:w-44 sm:border-r sm:border-b-0">
          <p className="px-3 pb-1.5 text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
            Period
          </p>
          {PERIOD_PRESETS.map((preset) => (
            <button
              key={preset.label}
              type="button"
              onClick={() => handlePresetSelect(preset.days)}
              className={cn(
                "flex w-full items-center justify-between gap-2 px-3 py-1.5 text-left text-sm hover:bg-accent",
                preset.days === activePresetDays && "text-primary",
              )}
            >
              {preset.label}
              {preset.days === activePresetDays && <Check className="size-3.5 shrink-0" />}
            </button>
          ))}
        </div>

        <div className="w-full shrink-0 p-3 sm:w-56">
          <p className="px-1 pb-2 text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
            Custom range
          </p>
          <div className="space-y-2 px-1">
            {[
              { label: "Start date", value: draftFrom, onChange: setDraftFrom, min: undefined, max: draftTo || undefined },
              { label: "End date", value: draftTo, onChange: setDraftTo, min: draftFrom || undefined, max: undefined },
            ].map((field) => (
              <label key={field.label} className="block">
                <span className="mb-1 block text-xs text-muted-foreground">{field.label}</span>
                <input
                  type="date"
                  value={field.value}
                  min={field.min}
                  max={field.max}
                  onChange={(e) => field.onChange(e.target.value)}
                  className="h-8 w-full rounded-md border border-border bg-background px-2 text-xs text-foreground tabular-nums focus-visible:border-primary focus-visible:outline-2 focus-visible:outline-primary"
                />
              </label>
            ))}
            {reversed && (
              <p className="text-[11px] text-destructive">End date must be on or after the start date</p>
            )}
          </div>

          <Button className="mt-3 w-full" size="sm" onClick={applyCustomRange} disabled={!canApply}>
            Apply custom range
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
