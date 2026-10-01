"use client";

import { useState } from "react";
import { CalendarDays, Check, ChevronDown, ChevronLeft, ChevronRight, RotateCcw } from "lucide-react";

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  MAX_CUSTOM_DAYS,
  OVERVIEW_TODAY,
  PERIOD_PRESETS,
  countDays,
  formatFullRangeLabel,
  formatLongDate,
  type OverviewPeriod,
} from "@/lib/overview";
import { cn } from "@/lib/utils";

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

interface MonthRef {
  year: number;
  month: number;
}

function isoFromUTC(year: number, month: number, day: number): string {
  return new Date(Date.UTC(year, month, day)).toISOString().slice(0, 10);
}

function monthOf(iso: string): MonthRef {
  const [y, m] = iso.split("-").map(Number);
  return { year: y, month: m - 1 };
}

function addMonths({ year, month }: MonthRef, delta: number): MonthRef {
  return monthOf(isoFromUTC(year, month + delta, 1));
}

/** Six Sunday-first weeks covering the month, including the neighbouring months' days. */
function monthGrid({ year, month }: MonthRef): { iso: string; inMonth: boolean }[] {
  const firstWeekday = new Date(Date.UTC(year, month, 1)).getUTCDay();
  return Array.from({ length: 42 }, (_, i) => {
    const iso = isoFromUTC(year, month, i - firstWeekday + 1);
    return { iso, inMonth: monthOf(iso).month === month };
  });
}

/** The month to show for `iso`, never past the last month with data. */
function viewFor(iso: string): MonthRef {
  const latest = monthOf(OVERVIEW_TODAY);
  const target = monthOf(iso);
  return target.year * 12 + target.month > latest.year * 12 + latest.month ? latest : target;
}

export function PeriodPicker({
  value,
  onChange,
  dataFrom,
  size = "default",
}: {
  value: OverviewPeriod;
  onChange: (period: OverviewPeriod) => void;
  /** First day with data; earlier days stay pickable but are dimmed. */
  dataFrom?: string;
  /** "sm" is the 40px control used inside filter bars. */
  size?: "default" | "sm";
}) {
  const [open, setOpen] = useState(false);
  const [customOpen, setCustomOpen] = useState(false);
  const [draftFrom, setDraftFrom] = useState<string | null>(value.range.from);
  const [draftTo, setDraftTo] = useState<string | null>(value.range.to);
  const [hovered, setHovered] = useState<string | null>(null);
  const [view, setView] = useState<MonthRef>(() => viewFor(value.range.to));

  function handleOpenChange(next: boolean) {
    if (next) {
      // Every open starts from the applied range.
      setDraftFrom(value.range.from);
      setDraftTo(value.range.to);
      setHovered(null);
      setView(viewFor(value.range.to));
      // The calendar stays tucked away unless a custom range is what's applied.
      setCustomOpen(value.preset === null);
    }
    setOpen(next);
  }

  // First click sets the start, second the end (swapping if earlier); a third starts over.
  function pickDay(iso: string) {
    if (!draftFrom || draftTo) {
      setDraftFrom(iso);
      setDraftTo(null);
    } else if (iso < draftFrom) {
      setDraftTo(draftFrom);
      setDraftFrom(iso);
    } else {
      setDraftTo(iso);
    }
  }

  function reset() {
    setDraftFrom(null);
    setDraftTo(null);
  }

  // While the end is still open, preview the range up to the hovered day.
  const previewTo = draftFrom && !draftTo ? hovered : draftTo;
  const [rangeStart, rangeEnd] =
    draftFrom && previewTo
      ? previewTo < draftFrom
        ? [previewTo, draftFrom]
        : [draftFrom, previewTo]
      : [draftFrom, draftFrom];

  const selectedDays = draftFrom && draftTo ? countDays({ from: draftFrom, to: draftTo }) : 0;
  const tooLong = selectedDays > MAX_CUSTOM_DAYS;
  const canApply = !!draftFrom && !!draftTo && !tooLong;

  function apply() {
    if (!canApply || !draftFrom || !draftTo) return;
    const preset = PERIOD_PRESETS.find((p) => p.range.from === draftFrom && p.range.to === draftTo);
    onChange({ preset: preset?.id ?? null, range: { from: draftFrom, to: draftTo } });
    setOpen(false);
  }

  const canGoForward = isoFromUTC(view.year, view.month + 1, 1) <= OVERVIEW_TODAY;

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger
        render={
          <button
            type="button"
            aria-expanded={open}
            aria-label={`Period: ${formatFullRangeLabel(value.range)}`}
            className={cn(
              "inline-flex min-w-[264px] items-center gap-2 rounded-[10px] border bg-card px-3.5 text-sm text-foreground hover:bg-muted focus-visible:outline-2 focus-visible:outline-primary",
              size === "sm" ? "h-10" : "h-11",
              open ? "border-primary" : "border-border",
            )}
          />
        }
      >
        <CalendarDays className="size-4 shrink-0 text-primary-strong" />
        <span className="flex-1 text-left font-medium whitespace-nowrap tabular-nums">
          {formatFullRangeLabel(value.range)}
        </span>
        <ChevronDown className={cn("size-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")} />
      </PopoverTrigger>

      <PopoverContent
        align="end"
        className="w-[240px] max-w-[calc(100vw-32px)] overflow-hidden rounded-xl p-0 shadow-lg ring-1 ring-border"
      >
        {/* One view at a time: presets (apply on one click), or the custom-range calendar. */}
        {!customOpen && (
          <div className="p-1.5">
            <p className="px-2.5 pt-1.5 pb-1 text-[11px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">
              Date range
            </p>
            <ul>
              {PERIOD_PRESETS.map((preset) => {
                const active = value.preset === preset.id;
                return (
                  <li key={preset.id}>
                    <button
                      type="button"
                      aria-pressed={active}
                      onClick={() => {
                        onChange({ preset: preset.id, range: preset.range });
                        setOpen(false);
                      }}
                      className={cn(
                        "flex w-full items-center justify-between gap-2 rounded-md px-2.5 py-1.5 text-left text-[13px] text-foreground-2 hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-primary",
                        active && "bg-primary-soft font-semibold text-primary-strong hover:bg-primary-soft hover:text-primary-strong",
                      )}
                    >
                      {preset.label}
                      {active && <Check className="size-3.5 shrink-0" />}
                    </button>
                  </li>
                );
              })}
            </ul>
            <div className="mt-1 border-t border-line-soft pt-1">
              <button
                type="button"
                aria-expanded={false}
                onClick={() => setCustomOpen(true)}
                className={cn(
                  "flex w-full items-center justify-between gap-2 rounded-md px-2.5 py-1.5 text-left text-[13px] text-foreground-2 hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-primary",
                  value.preset === null && "bg-primary-soft font-semibold text-primary-strong hover:bg-primary-soft hover:text-primary-strong",
                )}
              >
                Custom range
                <ChevronRight className="size-3.5 shrink-0" />
              </button>
            </div>
          </div>
        )}

        {customOpen && (
          <div className="p-3">
            <button
              type="button"
              onClick={() => setCustomOpen(false)}
              className="-mx-1 mb-2 inline-flex items-center gap-1 rounded-md px-1 py-0.5 text-[13px] font-semibold text-foreground hover:bg-muted focus-visible:outline-2 focus-visible:outline-primary"
            >
              <ChevronLeft className="size-4 text-muted-foreground" />
              Custom range
            </button>

            {/* Start / End boxes; the one the next click fills is outlined. Clicking a box re-picks it. */}
            <div className="grid grid-cols-2 gap-1.5">
              {(
                [
                  { label: "Start", date: draftFrom, next: !draftFrom, onClick: reset },
                  { label: "End", date: draftTo, next: !!draftFrom && !draftTo, onClick: () => setDraftTo(null) },
                ] as const
              ).map((field) => (
                <button
                  key={field.label}
                  type="button"
                  onClick={field.onClick}
                  disabled={field.label === "End" && !draftFrom}
                  aria-label={`${field.label} date: ${field.date ? formatLongDate(field.date) : "not set"}`}
                  className={cn(
                    "rounded-lg border px-2 py-1 text-left focus-visible:outline-2 focus-visible:outline-primary disabled:cursor-default",
                    field.next ? "border-primary bg-primary-soft" : "border-border hover:bg-muted",
                  )}
                >
                  <span className="block text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">
                    {field.label}
                  </span>
                  <span
                    className={cn(
                      "block text-xs font-medium tabular-nums",
                      field.date ? "text-foreground" : "text-muted-foreground",
                    )}
                  >
                    {field.date ? formatLongDate(field.date) : "—"}
                  </span>
                </button>
              ))}
            </div>
            <p className={cn("mt-1.5 mb-2 text-[11px]", tooLong ? "text-bad" : "text-muted-foreground")} aria-live="polite">
              {tooLong
                ? `Pick ${MAX_CUSTOM_DAYS} days or fewer`
                : !draftFrom
                  ? "Click a start date"
                  : !draftTo
                    ? "Now click an end date"
                    : `${selectedDays} ${selectedDays === 1 ? "day" : "days"} selected${
                        dataFrom && draftFrom < dataFrom ? `, data from ${formatLongDate(dataFrom)}` : ""
                      }`}
            </p>

            <div className="mb-1 flex items-center justify-between">
              <NavButton label="Previous month" onClick={() => setView((v) => addMonths(v, -1))}>
                <ChevronLeft className="size-4" />
              </NavButton>
              <p className="text-[13px] font-semibold text-foreground" aria-live="polite">
                {MONTH_NAMES[view.month]} {view.year}
              </p>
              <NavButton label="Next month" disabled={!canGoForward} onClick={() => setView((v) => addMonths(v, 1))}>
                <ChevronRight className="size-4" />
              </NavButton>
            </div>

            <div className="grid grid-cols-7 text-center" onMouseLeave={() => setHovered(null)}>
              {WEEKDAYS.map((day) => (
                <span key={day} className="flex h-6 items-center justify-center text-[11px] font-medium text-muted-foreground">
                  {day}
                </span>
              ))}
              {monthGrid(view).map(({ iso, inMonth }) => {
                if (!inMonth) {
                  return (
                    <span key={iso} aria-hidden className="flex h-7 items-center justify-center text-xs text-muted-foreground/35 tabular-nums">
                      {Number(iso.slice(8))}
                    </span>
                  );
                }
                const isStartDay = iso === rangeStart;
                const isEndDay = iso === rangeEnd;
                const isEnd = isStartDay || isEndDay;
                const spansDays = rangeStart !== rangeEnd;
                const inRange = !!rangeStart && !!rangeEnd && iso > rangeStart && iso < rangeEnd;
                const future = iso > OVERVIEW_TODAY;
                const noData = !!dataFrom && iso < dataFrom;
                return (
                  <button
                    key={iso}
                    type="button"
                    disabled={future}
                    onClick={() => pickDay(iso)}
                    onMouseEnter={() => setHovered(iso)}
                    onFocus={() => setHovered(iso)}
                    aria-label={`${formatLongDate(iso)}${noData ? ", no data" : ""}`}
                    aria-pressed={isEnd}
                    className={cn(
                      "relative flex h-7 items-center justify-center rounded-md text-xs tabular-nums focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:text-muted-foreground/35",
                      !future && "text-foreground",
                      noData && !isEnd && !inRange && "text-muted-foreground",
                      inRange && "rounded-none bg-primary-soft text-primary-strong",
                      isEnd && "bg-primary font-semibold text-primary-foreground",
                      // Start rounds on the left, end on the right, so the range reads as one band.
                      spansDays && isStartDay && "rounded-r-none",
                      spansDays && isEndDay && "rounded-l-none",
                      !isEnd && !inRange && !future && "hover:bg-muted",
                    )}
                  >
                    {Number(iso.slice(8))}
                    {iso === OVERVIEW_TODAY && !isEnd && (
                      <span className="absolute bottom-0.5 size-1 rounded-full bg-orange" aria-hidden />
                    )}
                  </button>
                );
              })}
            </div>

            <div className="mt-2 border-t border-line-soft pt-2.5">
              <div className="flex items-center justify-end gap-1.5">
                <button
                  type="button"
                  onClick={reset}
                  disabled={!draftFrom}
                  className="inline-flex h-8 items-center gap-1 rounded-md px-2.5 text-xs font-medium text-foreground-2 hover:bg-muted focus-visible:outline-2 focus-visible:outline-primary disabled:opacity-40"
                >
                  <RotateCcw className="size-3" />
                  Reset
                </button>
                <button
                  type="button"
                  onClick={apply}
                  disabled={!canApply}
                  className="h-8 rounded-md bg-primary px-4 text-xs font-semibold text-primary-foreground hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-40"
                >
                  Apply
                </button>
              </div>
            </div>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

function NavButton({
  label,
  disabled,
  onClick,
  className,
  children,
}: {
  label: string;
  disabled?: boolean;
  onClick: () => void;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "flex size-7 items-center justify-center rounded-md border border-border text-foreground-2 hover:bg-muted focus-visible:outline-2 focus-visible:outline-primary disabled:opacity-30 disabled:hover:bg-transparent",
        className,
      )}
    >
      {children}
    </button>
  );
}
