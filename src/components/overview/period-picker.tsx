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

export function PeriodPicker({
  value,
  onChange,
  dataFrom,
  size = "default",
}: {
  value: OverviewPeriod;
  onChange: (period: OverviewPeriod) => void;
  /** First day with data; earlier days stay pickable. */
  dataFrom?: string;
  /** "sm" is the 40px control used inside filter bars. */
  size?: "default" | "sm";
}) {
  const [open, setOpen] = useState(false);
  const [customOpen, setCustomOpen] = useState(false);
  const [draftFrom, setDraftFrom] = useState<string | null>(value.range.from);
  const [draftTo, setDraftTo] = useState<string | null>(value.range.to);

  function handleOpenChange(next: boolean) {
    if (next) {
      // Every open starts from the applied range.
      setDraftFrom(value.range.from);
      setDraftTo(value.range.to);
      // The custom fields stay tucked away unless a custom range is what's applied.
      setCustomOpen(value.preset === null);
    }
    setOpen(next);
  }

  function reset() {
    setDraftFrom(null);
    setDraftTo(null);
  }

  const reversed = !!draftFrom && !!draftTo && draftTo < draftFrom;
  const selectedDays = draftFrom && draftTo && !reversed ? countDays({ from: draftFrom, to: draftTo }) : 0;
  const tooLong = selectedDays > MAX_CUSTOM_DAYS;
  const canApply = !!draftFrom && !!draftTo && !reversed && !tooLong;

  function apply() {
    if (!canApply || !draftFrom || !draftTo) return;
    const preset = PERIOD_PRESETS.find((p) => p.range.from === draftFrom && p.range.to === draftTo);
    onChange({ preset: preset?.id ?? null, range: { from: draftFrom, to: draftTo } });
    setOpen(false);
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger
        render={
          <button
            type="button"
            aria-expanded={open}
            aria-label={`Period: ${formatFullRangeLabel(value.range)}`}
            className={cn(
              "inline-flex items-center gap-1 rounded-[10px] border bg-card px-2.5 text-[13px] text-foreground hover:bg-muted focus-visible:outline-2 focus-visible:outline-primary",
              size === "sm" ? "h-10" : "h-11",
              open ? "border-primary" : "border-border",
            )}
          />
        }
      >
        <CalendarDays className="size-3.5 shrink-0 text-primary-strong" />
        <span className="flex-1 text-left font-medium whitespace-nowrap tabular-nums">
          {formatFullRangeLabel(value.range)}
        </span>
        <ChevronDown className={cn("size-3.5 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")} />
      </PopoverTrigger>

      <PopoverContent
        align="end"
        className="w-[240px] max-w-[calc(100vw-32px)] overflow-hidden rounded-xl p-0 shadow-lg ring-1 ring-border"
      >
        {/* One view at a time: presets (apply on one click), or the custom start/end date fields. */}
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

            <div className="space-y-2">
              {[
                { label: "Start date", value: draftFrom, onChange: setDraftFrom, min: undefined, max: draftTo ?? OVERVIEW_TODAY },
                { label: "End date", value: draftTo, onChange: setDraftTo, min: draftFrom ?? undefined, max: OVERVIEW_TODAY },
              ].map((field) => (
                <label key={field.label} className="block">
                  <span className="mb-1 block text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">
                    {field.label}
                  </span>
                  <input
                    type="date"
                    value={field.value ?? ""}
                    min={field.min}
                    max={field.max}
                    onChange={(e) => field.onChange(e.target.value || null)}
                    className="h-9 w-full rounded-lg border border-border bg-card px-2.5 text-xs font-medium text-foreground tabular-nums focus-visible:border-primary focus-visible:outline-2 focus-visible:outline-primary"
                  />
                </label>
              ))}
            </div>
            <p
              className={cn("mt-2 text-[11px]", tooLong || reversed ? "text-bad" : "text-muted-foreground")}
              aria-live="polite"
            >
              {reversed
                ? "End date must be on or after the start date"
                : tooLong
                  ? `Pick ${MAX_CUSTOM_DAYS} days or fewer`
                  : !draftFrom
                    ? "Choose a start date"
                    : !draftTo
                      ? "Choose an end date"
                      : `${selectedDays} ${selectedDays === 1 ? "day" : "days"} selected${
                          dataFrom && draftFrom < dataFrom ? `, data from ${formatLongDate(dataFrom)}` : ""
                        }`}
            </p>

            <div className="mt-2 border-t border-line-soft pt-2.5">
              <div className="flex items-center justify-end gap-1.5">
                <button
                  type="button"
                  onClick={reset}
                  disabled={!draftFrom && !draftTo}
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
