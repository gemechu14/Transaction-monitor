"use client";

import { ArrowLeftRight, Layers } from "lucide-react";

import { DateRangePicker } from "@/components/overview/date-range-picker";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CHANNEL_LIST, CHANNELS, type ChannelId } from "@/config/channels";
import type { DateRange } from "@/lib/date";

export interface PlatformSelection {
  channel: ChannelId | "all";
}

const PLATFORM_ITEMS: Record<string, string> = {
  all: "All platforms",
  ...Object.fromEntries(CHANNEL_LIST.map((c) => [c.id, c.name])),
};

function Side({
  label,
  accent,
  value,
  onChange,
}: {
  label: string;
  accent: string;
  value: PlatformSelection;
  onChange: (next: PlatformSelection) => void;
}) {
  const color = value.channel === "all" ? undefined : CHANNELS[value.channel]?.color;

  return (
    <div className="flex-1 space-y-2.5 rounded-lg border border-border p-3">
      <p className="flex items-center gap-1.5 text-[10px] font-semibold tracking-wider uppercase" style={{ color: accent }}>
        <span className="size-1.5 shrink-0 rounded-full" style={{ backgroundColor: color ?? accent }} />
        {label}
      </p>
      <Select
        items={PLATFORM_ITEMS}
        value={value.channel}
        onValueChange={(next) => onChange({ ...value, channel: next as ChannelId | "all" })}
      >
        <SelectTrigger size="sm" className="w-full">
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
    </div>
  );
}

export function CrossPlatformPanel({
  a,
  onChangeA,
  b,
  onChangeB,
  range,
  onRangeChange,
}: {
  a: PlatformSelection;
  onChangeA: (next: PlatformSelection) => void;
  b: PlatformSelection;
  onChangeB: (next: PlatformSelection) => void;
  range: DateRange;
  onRangeChange: (range: DateRange) => void;
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-3 @lg/card-header:flex-row @lg/card-header:items-center @lg/card-header:justify-between">
          <div>
            <CardTitle>Compare platforms</CardTitle>
            <CardDescription>
              Two platforms over the same date range, so the comparison isn&apos;t skewed by unequal
              periods.
            </CardDescription>
          </div>
          <DateRangePicker range={range} onRangeChange={onRangeChange} />
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
          <Side label="Side A" accent="var(--muted-foreground)" value={a} onChange={onChangeA} />
          <ArrowLeftRight className="mx-auto size-4 shrink-0 text-muted-foreground sm:mx-0" />
          <Side label="Side B" accent="var(--primary)" value={b} onChange={onChangeB} />
        </div>
      </CardContent>
    </Card>
  );
}
