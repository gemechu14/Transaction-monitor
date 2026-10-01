"use client";

import { useMemo, useState } from "react";

import { BottomLinePanel } from "@/components/comparison/bottom-line-panel";
import {
  ComparisonFilterBar,
  IntervalSwitch,
  PeriodField,
  SideSelect,
  SwapButton,
  type FieldOption,
} from "@/components/comparison/comparison-filter-bar";
import { HeadToHeadCard } from "@/components/comparison/head-to-head-card";
import { KeyInsightsCard } from "@/components/comparison/key-insights-card";
import { ShareOfAmountCard } from "@/components/comparison/share-of-amount-card";
import { CHANNEL_LIST, type ChannelId } from "@/config/channels";
import { useOverviewDataset } from "@/hooks";
import {
  bottomLine,
  buildPeriodOptions,
  channelInsights,
  defaultPeriodIds,
  figuresFor,
  nextOptionId,
  periodFigures,
  periodInsights,
  sideName,
  type ComparisonType,
  type Interval,
  type SideFigures,
  type SideKey,
} from "@/lib/comparison";
import { DEFAULT_PERIOD, formatRangeLabel, type OverviewPeriod } from "@/lib/overview";

const CHANNEL_OPTIONS: FieldOption[] = CHANNEL_LIST.map((c) => ({ id: c.id, label: c.name }));
const PLATFORM_OPTIONS: FieldOption[] = [{ id: "all", label: "All platforms" }, ...CHANNEL_OPTIONS];
const CHANNEL_IDS = CHANNEL_LIST.map((c) => c.id);

const EMPTY_SIDE: SideFigures = { name: "", amount: null, transactions: null };

/** Sets one side, and if that now matches the other side, moves the other side on to the next option. */
function pickSide<T extends string>(pair: { a: T; b: T }, side: SideKey, id: T, ids: T[]): { a: T; b: T } {
  const other: SideKey = side === "a" ? "b" : "a";
  const next = { ...pair, [side]: id };
  if (next[other] === id) next[other] = nextOptionId(ids, id, id);
  return next;
}

export default function ComparisonPage() {
  const [type, setType] = useState<ComparisonType>("channels");

  // Channel vs channel
  const [channels, setChannels] = useState<{ a: ChannelId; b: ChannelId }>({ a: "telebirr", b: "mbesa_p2p" });
  const [period, setPeriod] = useState<OverviewPeriod>(DEFAULT_PERIOD);

  // Same channel
  const [sameChannel, setSameChannel] = useState<ChannelId | "all">("all");
  const [interval, setIntervalKind] = useState<Interval>("day");
  // `null` means "this interval's defaults", so they can be worked out once the data has loaded.
  const [periodIds, setPeriodIds] = useState<{ a: string; b: string } | null>(null);

  const datasetQuery = useOverviewDataset();
  const dataset = datasetQuery.data;
  const isLoading = datasetQuery.isLoading || !dataset;

  const periodOptions = useMemo(() => (dataset ? buildPeriodOptions(dataset, interval) : []), [dataset, interval]);
  const periodIdList = periodOptions.map((o) => o.id);
  const selectedPeriods = periodIds ?? defaultPeriodIds(periodOptions);

  const result = useMemo(() => {
    if (!dataset) return null;

    if (type === "channels") {
      const a: SideFigures = { name: sideName(channels.a), ...figuresFor(dataset, channels.a, period.range) };
      const b: SideFigures = { name: sideName(channels.b), ...figuresFor(dataset, channels.b, period.range) };
      const totals = figuresFor(dataset, "all", period.range);
      const periodDays = dataset.daily.filter((d) => d.date >= period.range.from && d.date <= period.range.to).length;
      return {
        a,
        b,
        insights: channelInsights(a, b, totals, periodDays),
        line: bottomLine(a, b, { periodLabel: formatRangeLabel(period.range) }),
      };
    }

    const optionA = periodOptions.find((o) => o.id === selectedPeriods.a);
    const optionB = periodOptions.find((o) => o.id === selectedPeriods.b);
    if (!optionA || !optionB) return null;
    const caption = sideName(sameChannel);
    const a: SideFigures = { name: optionA.shortLabel, caption, ...periodFigures(dataset, sameChannel, optionA) };
    const b: SideFigures = { name: optionB.shortLabel, caption, ...periodFigures(dataset, sameChannel, optionB) };
    return {
      a,
      b,
      insights: periodInsights(a, b),
      line: bottomLine(a, b, { prefix: caption }),
    };
  }, [dataset, type, channels, period.range, periodOptions, selectedPeriods.a, selectedPeriods.b, sameChannel]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2.5">
        <h2 className="text-[22px] font-bold tracking-[-0.02em] text-foreground">Comparison</h2>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-soft px-2.5 py-1 text-xs font-medium text-primary-strong">
          <span className="size-1.5 shrink-0 rounded-full bg-primary" />
          {type === "channels" ? "Channel vs channel" : "Same channel"}
        </span>
      </div>

      <ComparisonFilterBar type={type} onTypeChange={setType}>
        {type === "channels" ? (
          <>
            <SideSelect
              label="Channel A"
              side="a"
              value={channels.a}
              options={CHANNEL_OPTIONS}
              disabledId={channels.b}
              onChange={(id) => setChannels((pair) => pickSide(pair, "a", id as ChannelId, CHANNEL_IDS))}
            />
            <SwapButton label="Swap channels" onClick={() => setChannels(({ a, b }) => ({ a: b, b: a }))} />
            <SideSelect
              label="Channel B"
              side="b"
              value={channels.b}
              options={CHANNEL_OPTIONS}
              disabledId={channels.a}
              onChange={(id) => setChannels((pair) => pickSide(pair, "b", id as ChannelId, CHANNEL_IDS))}
            />
            <PeriodField value={period} onChange={setPeriod} dataFrom={dataset?.from} />
          </>
        ) : (
          <>
            <SideSelect
              label="Channel"
              value={sameChannel}
              options={PLATFORM_OPTIONS}
              onChange={(id) => setSameChannel(id as ChannelId | "all")}
            />
            <IntervalSwitch
              value={interval}
              onChange={(next) => {
                setIntervalKind(next);
                setPeriodIds(null);
              }}
            />
            <SideSelect
              label="Period A"
              side="a"
              value={selectedPeriods.a}
              options={periodOptions}
              disabledId={selectedPeriods.b}
              onChange={(id) => setPeriodIds(pickSide(selectedPeriods, "a", id, periodIdList))}
            />
            <SwapButton
              label="Swap periods"
              onClick={() => setPeriodIds({ a: selectedPeriods.b, b: selectedPeriods.a })}
            />
            <SideSelect
              label="Period B"
              side="b"
              value={selectedPeriods.b}
              options={periodOptions}
              disabledId={selectedPeriods.a}
              onChange={(id) => setPeriodIds(pickSide(selectedPeriods, "b", id, periodIdList))}
            />
          </>
        )}
      </ComparisonFilterBar>

      <HeadToHeadCard a={result?.a ?? EMPTY_SIDE} b={result?.b ?? EMPTY_SIDE} isLoading={isLoading} />

      <div className="grid grid-cols-1 gap-3 min-[1001px]:grid-cols-2">
        <KeyInsightsCard insights={result?.insights ?? []} isLoading={isLoading} />
        <ShareOfAmountCard a={result?.a ?? EMPTY_SIDE} b={result?.b ?? EMPTY_SIDE} isLoading={isLoading} />
      </div>

      <BottomLinePanel line={result?.line ?? null} isLoading={isLoading} />
    </div>
  );
}
