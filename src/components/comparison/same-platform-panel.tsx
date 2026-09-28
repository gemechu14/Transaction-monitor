"use client";

import { Layers } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CHANNEL_LIST, type ChannelId } from "@/config/channels";
import { COMPARISON_MODE_OPTIONS, type ComparisonMode, type PeriodOption } from "@/lib/period-options";
import { cn } from "@/lib/utils";

const PLATFORM_ITEMS: Record<string, string> = {
  all: "All platforms",
  ...Object.fromEntries(CHANNEL_LIST.map((c) => [c.id, c.name])),
};

export function SamePlatformPanel({
  platform,
  onPlatformChange,
  mode,
  onModeChange,
  options,
  optionA,
  optionB,
  onChangeA,
  onChangeB,
}: {
  platform: ChannelId | "all";
  onPlatformChange: (value: ChannelId | "all") => void;
  mode: ComparisonMode;
  onModeChange: (value: ComparisonMode) => void;
  options: PeriodOption[];
  optionA: PeriodOption;
  optionB: PeriodOption;
  onChangeA: (value: string) => void;
  onChangeB: (value: string) => void;
}) {
  const itemsFor = (opts: PeriodOption[]) => Object.fromEntries(opts.map((o) => [o.value, o.label]));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Compare periods</CardTitle>
        <CardDescription>
          One platform, two time windows — see how it moved from one {mode} to the next.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Select
            items={PLATFORM_ITEMS}
            value={platform}
            onValueChange={(value) => onPlatformChange(value as ChannelId | "all")}
          >
            <SelectTrigger size="sm" className="w-44">
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

          <div className="flex rounded-md border border-border p-0.5">
            {COMPARISON_MODE_OPTIONS.map((option) => (
              <Button
                key={option.value}
                size="sm"
                variant="ghost"
                className={cn(
                  "h-7 px-2.5 text-xs",
                  mode === option.value
                    ? "bg-primary/10 text-primary hover:bg-primary/15"
                    : "text-muted-foreground",
                )}
                onClick={() => onModeChange(option.value)}
              >
                {option.label}
              </Button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Select items={itemsFor(options)} value={optionA.value} onValueChange={(v) => onChangeA(v as string)}>
            <SelectTrigger size="sm" className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {options.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="text-xs text-muted-foreground">vs</span>
          <Select items={itemsFor(options)} value={optionB.value} onValueChange={(v) => onChangeB(v as string)}>
            <SelectTrigger size="sm" className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {options.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  );
}
