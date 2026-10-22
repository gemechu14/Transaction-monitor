"use client";

import { useMemo, useState } from "react";

import { BottomLinePanel } from "@/components/comparison/bottom-line-panel";
import {
  ComparisonFilterBar,
  ComparisonTypeToggle,
  IntervalSelect,
  PeriodField,
  SideDateField,
  SideRangeField,
  SideSelect,
  SwapButton,
  type FieldOption,
} from "@/components/comparison/comparison-filter-bar";
import { HeadToHeadCard } from "@/components/comparison/head-to-head-card";
import { KeyInsightsCard } from "@/components/comparison/key-insights-card";
import { ShareOfAmountCard } from "@/components/comparison/share-of-amount-card";
import { usePeriod } from "@/components/providers/period-provider";
import { ExportMenu } from "@/components/reports/export-menu";
import { buildComparisonReport, type ComparisonExportInput } from "@/components/reports/report-builders";
import {
  WSO2_CHANNEL_SOURCES,
  WSO2_SOURCE_LABELS,
  type Wso2ChannelSource,
  type Wso2Source,
} from "@/config/wso2-sources";
import { useAllAdvanced } from "@/hooks";
import {
  bottomLine,
  gapBetween,
  buildLivePeriodOptions,
  channelInsights,
  COMPARISON_TYPE_LABELS,
  dayOption,
  defaultCustomRanges,
  defaultPeriodIds,
  EARLIEST_DAY,
  latestCompleteDay,
  liveFigures,
  liveSideName,
  nextOptionId,
  PERIOD_SIDE_LABELS,
  periodInsights,
  rangeOption,
  type ComparisonType,
  type Interval,
  type SideFigures,
  type SideKey,
} from "@/lib/comparison";
import { addDays, parseISODate, toISODate } from "@/lib/date";
import { countDays, formatRangeLabel } from "@/lib/overview";

const CHANNEL_OPTIONS: FieldOption[] = WSO2_CHANNEL_SOURCES.map((id) => ({ id, label: WSO2_SOURCE_LABELS[id] }));
const PLATFORM_OPTIONS: FieldOption[] = [{ id: "all", label: WSO2_SOURCE_LABELS.all }, ...CHANNEL_OPTIONS];

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

  // Channel vs channel: the two largest sources by default.
  const [channels, setChannels] = useState<{ a: Wso2ChannelSource; b: Wso2ChannelSource }>({
    a: "ips_incoming",
    b: "telebirrToBank",
  });
  // Shared across pages; kept until the user picks another period.
  const { period, setPeriod } = usePeriod();

  // Period comparison
  const [sameChannel, setSameChannel] = useState<Wso2Source>("all");
  const [interval, setIntervalKind] = useState<Interval>("day");
  // `null` means "this interval's defaults": the last two complete periods.
  const [periodIds, setPeriodIds] = useState<{ a: string; b: string } | null>(null);
  // Custom range: any two date ranges, kept when switching intervals.
  const [customRanges, setCustomRanges] = useState(() => defaultCustomRanges());

  const periodOptions = useMemo(() => buildLivePeriodOptions(interval), [interval]);
  const periodIdList = periodOptions.map((o) => o.id);
  const selectedPeriods = periodIds ?? defaultPeriodIds(periodOptions);
  // Day ids are the dates themselves, and the date pickers allow any past day,
  // so a day period is built from its id rather than looked up in the list.
  const optionFor = (side: SideKey) =>
    interval === "custom"
      ? rangeOption(customRanges[side])
      : interval === "day"
        ? dayOption(selectedPeriods[side])
        : periodOptions.find((o) => o.id === selectedPeriods[side]);
  const optionA = optionFor("a");
  const optionB = optionFor("b");
  const maxDay = latestCompleteDay();

  /** Sets one side's day; if that's the other side's day, moves the other side to the day before (after, on the earliest day). */
  function pickDay(side: SideKey, iso: string) {
    const other: SideKey = side === "a" ? "b" : "a";
    const next = { ...selectedPeriods, [side]: iso };
    if (next[other] === iso) next[other] = toISODate(addDays(parseISODate(iso), iso === EARLIEST_DAY ? 1 : -1));
    setPeriodIds(next);
  }

  /** One side's period picker: a date for Daily, a date range for Custom, a dropdown otherwise. */
  function periodField(side: SideKey) {
    const other: SideKey = side === "a" ? "b" : "a";
    const label = PERIOD_SIDE_LABELS[side];
    if (interval === "custom") {
      return (
        <SideRangeField
          label={label}
          side={side}
          value={customRanges[side]}
          max={maxDay}
          onChange={(range) => setCustomRanges((pair) => ({ ...pair, [side]: range }))}
        />
      );
    }
    if (interval === "day") {
      return (
        <SideDateField
          label={label}
          side={side}
          leader={leader}
          value={selectedPeriods[side]}
          max={maxDay}
          onChange={(iso) => pickDay(side, iso)}
        />
      );
    }
    // No `side`: the period pickers show no colour dot.
    return (
      <SideSelect
        label={label}
        value={selectedPeriods[side]}
        options={periodOptions}
        disabledId={selectedPeriods[other]}
        onChange={(id) => setPeriodIds(pickSide(selectedPeriods, side, id, periodIdList))}
      />
    );
  }

  // allAdvanced returns every source per call: one call covers Channel comparison,
  // and each side of Period comparison needs its own date range.
  const isChannels = type === "channels";
  const rangeA = isChannels ? period.range : optionA?.range;
  const rangeB = isChannels ? period.range : optionB?.range;
  const queryA = useAllAdvanced({ startDate: rangeA?.from ?? "", endDate: rangeA?.to ?? "" });
  const queryB = useAllAdvanced({ startDate: rangeB?.from ?? "", endDate: rangeB?.to ?? "" });
  const isLoading = queryA.isPending || queryB.isPending;
  const error = queryA.error ?? queryB.error;

  const result = useMemo(() => {
    if (isLoading) return null;

    if (isChannels) {
      const a: SideFigures = { name: liveSideName(channels.a), ...liveFigures(queryA.data, channels.a) };
      const b: SideFigures = { name: liveSideName(channels.b), ...liveFigures(queryA.data, channels.b) };
      const totals = liveFigures(queryA.data, "all");
      return {
        a,
        b,
        insights: channelInsights(a, b, totals, countDays(period.range)),
        line: bottomLine(a, b, { periodLabel: formatRangeLabel(period.range) }),
        exportInput: { type: "channels", channels, range: period.range } satisfies ComparisonExportInput,
      };
    }

    if (!optionA || !optionB) return null;
    const caption = liveSideName(sameChannel);
    const a: SideFigures = { name: optionA.shortLabel, caption, ...liveFigures(queryA.data, sameChannel) };
    const b: SideFigures = { name: optionB.shortLabel, caption, ...liveFigures(queryB.data, sameChannel) };
    return {
      a,
      b,
      insights: periodInsights(a, b),
      line: bottomLine(a, b, { prefix: caption }),
      exportInput: {
        type: "periods",
        channel: sameChannel,
        periods: { a: optionA, b: optionB },
      } satisfies ComparisonExportInput,
    };
  }, [isLoading, isChannels, channels, period.range, optionA, optionB, sameChannel, queryA.data, queryB.data]);
  // Who has the larger amount: that side is blue everywhere on the page, the other orange.
  const leader = result ? gapBetween(result.a.amount, result.b.amount).leader : null;

  return (
    // `inter-ui`: Inter at the same line height as the Overview and Channels pages.
    <div className="inter-ui space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 flex-wrap items-center gap-2.5">
          {/* Page title hidden for now.
          <h2 className="text-[22px] font-bold tracking-[-0.02em] text-foreground">Transaction comparison</h2> */}
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-soft px-2.5 py-1 text-xs font-medium text-primary-strong">
            <span className="size-1.5 shrink-0 rounded-full bg-primary" />
            {COMPARISON_TYPE_LABELS[type]}
          </span>
        </div>
        <ComparisonTypeToggle type={type} onTypeChange={setType} />
      </div>

      <ComparisonFilterBar>
        {type === "channels" ? (
          <>
            <SideSelect
              label="Channel A"
              side="a"
              leader={leader}
              value={channels.a}
              options={CHANNEL_OPTIONS}
              disabledId={channels.b}
              onChange={(id) => setChannels((pair) => pickSide(pair, "a", id as Wso2ChannelSource, WSO2_CHANNEL_SOURCES))}
            />
            <SwapButton label="Swap channels" onClick={() => setChannels(({ a, b }) => ({ a: b, b: a }))} />
            <SideSelect
              label="Channel B"
              side="b"
              leader={leader}
              value={channels.b}
              options={CHANNEL_OPTIONS}
              disabledId={channels.a}
              onChange={(id) => setChannels((pair) => pickSide(pair, "b", id as Wso2ChannelSource, WSO2_CHANNEL_SOURCES))}
            />
            <PeriodField value={period} onChange={setPeriod} />
          </>
        ) : (
          <>
            <SideSelect
              label="Channel"
              value={sameChannel}
              options={PLATFORM_OPTIONS}
              onChange={(id) => setSameChannel(id as Wso2Source)}
            />
            <IntervalSelect
              value={interval}
              onChange={(next) => {
                setIntervalKind(next);
                setPeriodIds(null);
              }}
            />
            {periodField("a")}
            <SwapButton
              label="Swap periods"
              onClick={() =>
                interval === "custom"
                  ? setCustomRanges(({ a, b }) => ({ a: b, b: a }))
                  : setPeriodIds({ a: selectedPeriods.b, b: selectedPeriods.a })
              }
            />
            {periodField("b")}
          </>
        )}
        <div className="ml-auto self-start max-[760px]:order-first max-[760px]:ml-0 max-[760px]:self-end">
          <ExportMenu
            disabled={isLoading || !result}
            getReport={(author) =>
              result ? buildComparisonReport({ ...result, ...result.exportInput }, author) : undefined
            }
          />
        </div>
      </ComparisonFilterBar>

      {error && (
        <p role="alert" className="rounded-xl border border-border bg-card px-4 py-3 text-sm text-muted-foreground">
          Comparison figures unavailable: {error.message}
        </p>
      )}

      <HeadToHeadCard a={result?.a ?? EMPTY_SIDE} b={result?.b ?? EMPTY_SIDE} isLoading={isLoading} />

      <div className="grid grid-cols-1 gap-3 min-[1001px]:grid-cols-2">
        <KeyInsightsCard insights={result?.insights ?? []} isLoading={isLoading} />
        <ShareOfAmountCard a={result?.a ?? EMPTY_SIDE} b={result?.b ?? EMPTY_SIDE} isLoading={isLoading} />
      </div>

      <BottomLinePanel line={result?.line ?? null} isLoading={isLoading} />
    </div>
  );
}
