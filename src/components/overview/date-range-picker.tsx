"use client";

import { useState } from "react";
import { CalendarDays, Check, ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { addDays, formatDateRangeLabel, getLastNDays, toISODate, type DateRange } from "@/lib/date";
import { cn } from "@/lib/utils";

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const PERIOD_PRESETS: { label: string; days: number }[] = [
  { label: "Today", days: 1 },
  { label: "Last 7 days", days: 7 },
  { label: "Last 4 weeks", days: 28 },
  { label: "This month (30d)", days: 30 },
  { label: "Quarterly (3 months)", days: 90 },
  { label: "6 Months", days: 180 },
  { label: "Yearly", days: 365 },
];

function buildMonthGrid(viewDate: Date): Date[] {
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const first = new Date(year, month, 1);
  const gridStart = addDays(first, -first.getDay());
  return Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));
}

export function DateRangePicker({
  range,
  onRangeChange,
}: {
  range: DateRange;
  onRangeChange: (range: DateRange) => void;
}) {
  const [open, setOpen] = useState(false);
  const [viewDate, setViewDate] = useState(() => new Date(range.to));
  const [draftFrom, setDraftFrom] = useState(range.from);
  const [draftTo, setDraftTo] = useState(range.to);
  const [pendingStart, setPendingStart] = useState<string | null>(null);

  function handleOpenChange(next: boolean) {
    if (next) {
      setDraftFrom(range.from);
      setDraftTo(range.to);
      setPendingStart(null);
      setViewDate(new Date(range.to));
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

  function handleDayClick(iso: string) {
    if (!pendingStart) {
      setPendingStart(iso);
      setDraftFrom(iso);
      setDraftTo(iso);
      return;
    }
    if (iso < pendingStart) {
      setDraftFrom(iso);
      setDraftTo(pendingStart);
    } else {
      setDraftFrom(pendingStart);
      setDraftTo(iso);
    }
    setPendingStart(null);
  }

  function applyCustomRange() {
    onRangeChange({ from: draftFrom, to: draftTo });
    setOpen(false);
  }

  const grid = buildMonthGrid(viewDate);
  const currentMonth = viewDate.getMonth();

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

        <div className="w-full shrink-0 p-3 sm:w-72">
          <p className="px-1 pb-2 text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
            Custom range
          </p>
          <div className="mb-2 flex items-center justify-between px-1">
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setViewDate(addDays(new Date(viewDate.getFullYear(), viewDate.getMonth(), 1), -1))}
              aria-label="Previous month"
            >
              <ChevronLeft className="size-4" />
            </Button>
            <p className="text-sm font-medium text-foreground">
              {MONTH_NAMES[viewDate.getMonth()]} {viewDate.getFullYear()}
            </p>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1))}
              aria-label="Next month"
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>

          <div className="grid grid-cols-7 gap-y-0.5">
            {WEEKDAYS.map((day) => (
              <div
                key={day}
                className="flex h-7 items-center justify-center text-[11px] font-medium text-muted-foreground"
              >
                {day}
              </div>
            ))}
            {grid.map((date) => {
              const iso = toISODate(date);
              const inCurrentMonth = date.getMonth() === currentMonth;
              const isStart = iso === draftFrom;
              const isEnd = iso === draftTo;
              const inRange = iso >= draftFrom && iso <= draftTo;

              return (
                <button
                  key={iso}
                  type="button"
                  onClick={() => handleDayClick(iso)}
                  className={cn(
                    "relative h-7 text-xs",
                    inRange && "bg-primary/10",
                    isStart && "rounded-l-md",
                    isEnd && "rounded-r-md",
                  )}
                >
                  <span
                    className={cn(
                      "flex size-7 items-center justify-center rounded-full",
                      !inCurrentMonth && "text-muted-foreground/40",
                      (isStart || isEnd) && "bg-primary font-medium text-primary-foreground",
                      !isStart && !isEnd && inRange && "font-medium text-primary",
                    )}
                  >
                    {date.getDate()}
                  </span>
                </button>
              );
            })}
          </div>

          <Button className="mt-3 w-full" size="sm" onClick={applyCustomRange}>
            Apply custom range
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
