"use client";

import { ArrowLeftRight, Rows3 } from "lucide-react";

import { PeriodPicker } from "@/components/overview/period-picker";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { ComparisonType, Interval, SideKey } from "@/lib/comparison";
import type { OverviewPeriod } from "@/lib/overview";
import { cn } from "@/lib/utils";

export const SIDE_DOT_CLASS: Record<SideKey, string> = { a: "bg-orange", b: "bg-primary" };

export interface FieldOption {
  id: string;
  label: string;
}

const TYPE_OPTIONS: { value: ComparisonType; label: string; icon: typeof ArrowLeftRight }[] = [
  { value: "channels", label: "Channel vs channel", icon: ArrowLeftRight },
  { value: "periods", label: "Same channel", icon: Rows3 },
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
  value,
  options,
  disabledId,
  onChange,
}: {
  label: string;
  side?: SideKey;
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
          {side && <span className={cn("size-2 shrink-0 rounded-full", SIDE_DOT_CLASS[side])} aria-hidden />}
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
