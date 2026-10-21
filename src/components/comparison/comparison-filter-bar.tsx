"use client";

import { ArrowLeftRight, Rows3 } from "lucide-react";

import { PeriodPicker } from "@/components/overview/period-picker";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { ComparisonType, Interval, SideKey } from "@/lib/comparison";
import type { OverviewPeriod } from "@/lib/overview";
import { cn } from "@/lib/utils";

/** Which side has the larger amount; "even" or null (no figures yet) when neither does. */
export type SideLeader = SideKey | "even" | null;
export type SideTone = "lead" | "other";

/**
 * Colours follow the figures, not the position: the side with the larger amount
 * is always the brand blue and the other side orange. Until one side leads
 * (loading, even, or no data), A is orange and B is blue.
 */
export function sideTone(side: SideKey, leader: SideLeader): SideTone {
  const lead: SideKey = leader === "a" || leader === "b" ? leader : "b";
  return side === lead ? "lead" : "other";
}

export const TONE_DOT_CLASS: Record<SideTone, string> = { lead: "bg-primary", other: "bg-orange" };

/** Dot colour for a side, given who leads. */
export function sideDotClass(side: SideKey, leader: SideLeader): string {
  return TONE_DOT_CLASS[sideTone(side, leader)];
}

export interface FieldOption {
  id: string;
  label: string;
}

const TYPE_OPTIONS: { value: ComparisonType; label: string; icon: typeof ArrowLeftRight }[] = [
  { value: "channels", label: "Channel vs channel", icon: ArrowLeftRight },
  { value: "periods", label: "Period over period", icon: Rows3 },
];

const INTERVAL_OPTIONS: { value: Interval; label: string }[] = [
  { value: "day", label: "Day" },
  { value: "week", label: "Week" },
  { value: "month", label: "Month" },
];

/** Page-level switch between comparing two channels and one channel across two periods. */
export function ComparisonTypeToggle({
  type,
  onTypeChange,
}: {
  type: ComparisonType;
  onTypeChange: (type: ComparisonType) => void;
}) {
  return (
    <div className="inline-flex shrink-0 rounded-[10px] bg-muted p-1" role="group" aria-label="Comparison type">
      {TYPE_OPTIONS.map((option) => {
        const active = type === option.value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={active}
            onClick={() => onTypeChange(option.value)}
            className={cn(
              "inline-flex h-9 items-center gap-1.5 rounded-lg px-3.5 text-[13px] font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-primary",
              active ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
            )}
          >
            <option.icon className="size-4" />
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

export function ComparisonFilterBar({ children }: { children: React.ReactNode }) {
  return (
    <section className="flex flex-wrap items-end gap-3 rounded-2xl border border-border bg-card px-5 pt-4 pb-[18px] max-[760px]:flex-col max-[760px]:items-stretch">
      {children}
    </section>
  );
}

/** Earliest day the date fields accept; anything older is a half-typed year. */
const MIN_DAY = "2000-01-01";

/** A date picker for one side, styled like `SideSelect`. */
export function SideDateField({
  label,
  side,
  value,
  max,
  onChange,
}: {
  label: string;
  side: SideKey;
  /** Unused while the colour dot is hidden; kept so it can come back. */
  leader?: SideLeader;
  /** "YYYY-MM-DD" */
  value: string;
  /** Latest pickable day, "YYYY-MM-DD". */
  max: string;
  onChange: (iso: string) => void;
}) {
  const id = `side-date-${side}`;
  return (
    <Field label={label} htmlFor={id}>
      <span className="flex h-10 min-w-40 items-center gap-2 rounded-[10px] border border-border bg-card pr-2.5 pl-3 hover:border-foreground-2 focus-within:border-primary max-[760px]:w-full">
        {/* Side colour dot hidden for the date fields.
        <span className={cn("size-2 shrink-0 rounded-full", sideDotClass(side, leader))} aria-hidden /> */}
        <input
          id={id}
          type="date"
          value={value}
          min={MIN_DAY}
          max={max}
          // Ignore empty or half-typed values (e.g. year "0012" while typing 2026),
          // and keep typed dates within `max`, since typing can get past the picker's limit.
          onChange={(event) => {
            const next = event.target.value;
            if (next && next >= MIN_DAY) onChange(next > max ? max : next);
          }}
          className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-foreground tabular-nums outline-none"
        />
      </span>
    </Field>
  );
}

export function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5 max-[760px]:w-full">
      <label htmlFor={htmlFor} className="text-xs font-medium text-muted-foreground">
        {label}
      </label>
      {children}
    </div>
  );
}

/** A labelled select; `side` adds the orange (A) or blue (B) marker dot. The other side's pick is disabled. */
export function SideSelect({
  label,
  side,
  leader = null,
  value,
  options,
  disabledId,
  onChange,
}: {
  label: string;
  side?: SideKey;
  /** Who has the larger amount, so the dot matches the cards' colours. */
  leader?: SideLeader;
  value: string;
  options: FieldOption[];
  disabledId?: string;
  onChange: (id: string) => void;
}) {
  const items = Object.fromEntries(options.map((o) => [o.id, o.label]));
  return (
    <Field label={label}>
      <Select items={items} value={value} onValueChange={(next) => next && onChange(String(next))}>
        <SelectTrigger
          aria-label={label}
          className="h-10 data-[size=default]:h-10 min-w-40 rounded-[10px] border-border bg-card pr-2.5 pl-3 text-sm font-semibold hover:border-foreground-2 max-[760px]:w-full"
        >
          {/* Only pickers given a `side` show its colour dot (Channel A/B, not the periods). */}
          {side && <span className={cn("size-2 shrink-0 rounded-full", sideDotClass(side, leader))} aria-hidden />}
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.id} value={option.id} disabled={option.id === disabledId}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </Field>
  );
}

export function SwapButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className="flex size-10 shrink-0 items-center justify-center rounded-[10px] border border-border text-foreground-2 transition-colors hover:border-primary hover:text-primary-strong focus-visible:outline-2 focus-visible:outline-primary max-[760px]:w-full"
    >
      <ArrowLeftRight className="size-4" />
    </button>
  );
}

export function IntervalSwitch({ value, onChange }: { value: Interval; onChange: (value: Interval) => void }) {
  return (
    <Field label="Interval">
      <div className="inline-flex h-10 rounded-[10px] border border-border p-0.5" role="group" aria-label="Interval">
        {INTERVAL_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            aria-pressed={value === option.value}
            onClick={() => onChange(option.value)}
            className={cn(
              "rounded-lg px-3.5 text-[13px] font-semibold focus-visible:outline-2 focus-visible:outline-primary max-[760px]:flex-1",
              value === option.value ? "bg-primary-soft text-primary-strong" : "text-muted-foreground hover:bg-muted",
            )}
          >
            {option.label}
          </button>
        ))}
      </div>
    </Field>
  );
}

export function PeriodField({
  value,
  onChange,
  dataFrom,
}: {
  value: OverviewPeriod;
  onChange: (period: OverviewPeriod) => void;
  dataFrom?: string;
}) {
  return (
    <Field label="Period">
      <PeriodPicker value={value} onChange={onChange} dataFrom={dataFrom} size="sm" />
    </Field>
  );
}
