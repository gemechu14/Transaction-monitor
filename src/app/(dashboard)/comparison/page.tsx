"use client";

import { useMemo, useState } from "react";
import { ArrowLeftRight, Layers } from "lucide-react";

import { ComparisonStatGrid } from "@/components/comparison/comparison-stat-grid";
import { ComparisonSummary } from "@/components/comparison/comparison-summary";
import { CrossPlatformPanel, type PlatformSelection } from "@/components/comparison/cross-platform-panel";
import { SamePlatformPanel } from "@/components/comparison/same-platform-panel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CHANNELS, type ChannelId } from "@/config/channels";
import { useChannelSummary } from "@/hooks";
import { aggregateChannelSummaries } from "@/lib/aggregate-channel-summary";
import { formatDateRangeLabel, getLastNDays, type DateRange } from "@/lib/date";
import {
  buildDayOptions,
  buildMonthOptions,
  buildWeekOptions,
  type ComparisonMode,
  type PeriodOption,
} from "@/lib/period-options";

type ComparisonTab = "same" | "cross";

function platformLabel(channel: ChannelId | "all"): string {
  return channel === "all" ? "All platforms" : (CHANNELS[channel]?.name ?? channel);
}

export default function ComparisonPage() {
  const [tab, setTab] = useState<ComparisonTab>("same");

  const dayOptions = useMemo(() => buildDayOptions(), []);
  const weekOptions = useMemo(() => buildWeekOptions(), []);
  const monthOptions = useMemo(() => buildMonthOptions(), []);
  const optionsByMode: Record<ComparisonMode, PeriodOption[]> = {
    day: dayOptions,
    week: weekOptions,
    month: monthOptions,
  };

  const [samePlatform, setSamePlatform] = useState<ChannelId | "all">("all");
  const [sameMode, setSameMode] = useState<ComparisonMode>("day");
  const [sameSelection, setSameSelection] = useState<Record<ComparisonMode, { a: string; b: string }>>(
    () => ({
      day: { a: dayOptions[1].value, b: dayOptions[0].value },
      week: { a: weekOptions[1].value, b: weekOptions[0].value },
      month: { a: monthOptions[1].value, b: monthOptions[0].value },
    }),
  );

  const sameOptions = optionsByMode[sameMode];
  const sameCurrent = sameSelection[sameMode];
  const sameOptionA = sameOptions.find((o) => o.value === sameCurrent.a) ?? sameOptions[1];
  const sameOptionB = sameOptions.find((o) => o.value === sameCurrent.b) ?? sameOptions[0];

  function setSameSide(side: "a" | "b", value: string) {
    setSameSelection((prev) => ({ ...prev, [sameMode]: { ...prev[sameMode], [side]: value } }));
  }

  const [crossRange, setCrossRange] = useState<DateRange>(() => getLastNDays(30));
  const [crossA, setCrossA] = useState<PlatformSelection>(() => ({ channel: "telebirr" }));
  const [crossB, setCrossB] = useState<PlatformSelection>(() => ({ channel: "mbesa_p2p" }));

  const resolved =
    tab === "same"
      ? {
          channelA: samePlatform,
          rangeA: sameOptionA.range,
          labelA: `${platformLabel(samePlatform)} · ${sameOptionA.label}`,
          channelB: samePlatform,
          rangeB: sameOptionB.range,
          labelB: `${platformLabel(samePlatform)} · ${sameOptionB.label}`,
        }
      : {
          channelA: crossA.channel,
          rangeA: crossRange,
          labelA: `${platformLabel(crossA.channel)} · ${formatDateRangeLabel(crossRange)}`,
          channelB: crossB.channel,
          rangeB: crossRange,
          labelB: `${platformLabel(crossB.channel)} · ${formatDateRangeLabel(crossRange)}`,
        };

  const queryA = useChannelSummary({
    ...resolved.rangeA,
    channel: resolved.channelA === "all" ? undefined : resolved.channelA,
  });
  const queryB = useChannelSummary({
    ...resolved.rangeB,
    channel: resolved.channelB === "all" ? undefined : resolved.channelB,
  });

  const isLoading = queryA.isLoading || queryB.isLoading;
  const aggA = useMemo(() => aggregateChannelSummaries(queryA.data ?? []), [queryA.data]);
  const aggB = useMemo(() => aggregateChannelSummaries(queryB.data ?? []), [queryB.data]);

  return (
    <div className="space-y-4">
      <div className="sticky -top-4 z-20 -mx-4 -mt-2 flex flex-col gap-3 border-b border-border bg-background px-4 py-3 sm:-top-6 sm:-mx-6 sm:px-6 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-base font-bold text-foreground sm:text-lg">Comparison</h1>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
              <span className="size-1.5 shrink-0 rounded-full bg-primary" />
              {tab === "same" ? "Same platform" : "Cross-platform"}
            </span>
          </div>
        </div>
      </div>

      <Tabs value={tab} onValueChange={(value) => setTab(value as ComparisonTab)}>
        <TabsList className="h-11 gap-1 rounded-xl bg-muted/60 p-1 shadow-inner">
          <TabsTrigger
            value="cross"
            className="gap-1.5 rounded-lg px-4 text-sm font-semibold data-active:bg-background data-active:text-primary data-active:shadow-md"
          >
            <ArrowLeftRight className="size-4" />
            Cross-platform
          </TabsTrigger>
          <TabsTrigger
            value="same"
            className="gap-1.5 rounded-lg px-4 text-sm font-semibold data-active:bg-background data-active:text-primary data-active:shadow-md"
          >
            <Layers className="size-4" />
            Same platform
          </TabsTrigger>
        </TabsList>

        <TabsContent value="same" className="mt-4">
          <SamePlatformPanel
            platform={samePlatform}
            onPlatformChange={setSamePlatform}
            mode={sameMode}
            onModeChange={setSameMode}
            options={sameOptions}
            optionA={sameOptionA}
            optionB={sameOptionB}
            onChangeA={(value) => setSameSide("a", value)}
            onChangeB={(value) => setSameSide("b", value)}
          />
        </TabsContent>

        <TabsContent value="cross" className="mt-4">
          <CrossPlatformPanel
            a={crossA}
            onChangeA={setCrossA}
            b={crossB}
            onChangeB={setCrossB}
            range={crossRange}
            onRangeChange={setCrossRange}
          />
        </TabsContent>
      </Tabs>

      <ComparisonStatGrid
        labelA={resolved.labelA}
        labelB={resolved.labelB}
        a={aggA}
        b={aggB}
        isLoading={isLoading}
      />

      <ComparisonSummary
        labelA={resolved.labelA}
        labelB={resolved.labelB}
        a={aggA}
        b={aggB}
        isLoading={isLoading}
      />
    </div>
  );
}
