"use client";

import { useMemo, useState } from "react";
import { ArrowDownWideNarrow, Layers, X } from "lucide-react";

import {
  ChannelCardsSkeleton,
  ChannelFocusGrid,
  ChannelRankingGrid,
  RankChips,
} from "@/components/channels/channel-cards";
import { DayByDayCard } from "@/components/channels/day-by-day-card";
import { PeriodPicker } from "@/components/overview/period-picker";
// Export is disabled for now; restore these imports with the menu below.
// import { ExportMenu } from "@/components/reports/export-menu";
// import { buildChannelsReport } from "@/components/reports/report-builders";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { usePeriod } from "@/components/providers/period-provider";
import type { ChannelId } from "@/config/channels";
import { WSO2_SOURCE_LABELS, WSO2_SOURCES, type Wso2Source } from "@/config/wso2-sources";
import { useAllAdvanced, useOverviewDataset } from "@/hooks";
import {
  LIVE_RANK_ITEMS,
  computeChannels,
  computeSourceStats,
  sourceRanks,
  type LiveRankMetric,
} from "@/lib/channels";
import {
  countDays,
  formatRangeLabel,
  sourceRows,
} from "@/lib/overview";

export default function ChannelsPage() {
  // Shared across pages; kept until the user picks another period.
  const { period, setPeriod } = usePeriod();
  // `source` drives the live cards. The day-by-day table is still sample data
  // (a new API is coming), so it stays on all platforms for now.
  const [source, setSource] = useState<Wso2Source>("all");
  const channel: ChannelId | "all" = "all";
  // Every role ranks by value by default, matching the Overview.
  const [rankBy, setRankBy] = useState<LiveRankMetric>("value");

  // Same query (and cache) as the Overview: one call per period, every source in it.
  const totalsQuery = useAllAdvanced({ startDate: period.range.from, endDate: period.range.to });
  const live = useMemo(() => computeSourceStats(sourceRows(totalsQuery.data)), [totalsQuery.data]);
  const selected = source === "all" ? undefined : live.stats.find((s) => s.source === source);

  const datasetQuery = useOverviewDataset();
  const dataset = datasetQuery.data;
  const isLoading = datasetQuery.isLoading || !dataset;

  // The day-by-day table has no API yet and only sample data for one month, so it
  // always shows that whole month (as it did before), not the picked period.
  const tableRange = useMemo(
    () => (dataset ? { from: dataset.from, to: dataset.to } : period.range),
    [dataset, period.range],
  );
  const view = useMemo(
    () => (dataset ? computeChannels(dataset, tableRange, channel) : undefined),
    [dataset, tableRange, channel],
  );

  const sourceLabel = WSO2_SOURCE_LABELS[source];
  const platformLabel = "All platforms";
  const dataNote = `of the sample data (${formatRangeLabel(tableRange)})`;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 flex-wrap items-center gap-2.5">
          <h2 className="text-[22px] font-bold tracking-[-0.02em] text-foreground">Channel performance</h2>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-soft py-1 pr-2 pl-2.5 text-xs font-medium text-primary-strong">
            <span className="size-1.5 shrink-0 rounded-full bg-primary" />
            {sourceLabel}
            {source !== "all" && (
              <button
                type="button"
                onClick={() => setSource("all")}
                aria-label="Show all sources"
                className="-mr-0.5 rounded-full p-0.5 hover:bg-primary/15 focus-visible:outline-2 focus-visible:outline-primary"
              >
                <X className="size-3" />
              </button>
            )}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Select
            items={WSO2_SOURCE_LABELS}
            value={source}
            onValueChange={(value) => setSource(value as Wso2Source)}
          >
            <SelectTrigger aria-label="Source" className="w-48 rounded-[10px] bg-card px-3.5 data-[size=default]:h-10">
              <Layers className="size-4 text-primary-strong" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {WSO2_SOURCES.map((id) => (
                <SelectItem key={id} value={id}>
                  {WSO2_SOURCE_LABELS[id]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {source === "all" && (
            <Select items={LIVE_RANK_ITEMS} value={rankBy} onValueChange={(value) => setRankBy(value as LiveRankMetric)}>
              <SelectTrigger aria-label="Rank channels by" className="w-[204px] gap-1.5 rounded-[10px] bg-card px-3 data-[size=default]:h-10">
                <ArrowDownWideNarrow className="size-4 text-primary-strong" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(LIVE_RANK_ITEMS) as LiveRankMetric[]).map((key) => (
                  <SelectItem key={key} value={key}>
                    {LIVE_RANK_ITEMS[key]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <PeriodPicker value={period} onChange={setPeriod} dataFrom={dataset?.from} size="sm" />
          {/* <ExportMenu
            disabled={isLoading || !view}
            getReport={(author) =>
              dataset && view
                ? buildChannelsReport(
                    { dataset, view, channel, rankBy, platformLabel, range: period.range },
                    author,
                  )
                : undefined
            }
          /> */}
        </div>
      </div>

      {totalsQuery.isPending ? (
        <ChannelCardsSkeleton ranking={source === "all"} />
      ) : live.stats.length === 0 ? (
        <p className="rounded-2xl border border-border bg-card px-6 py-10 text-center text-sm text-muted-foreground">
          {totalsQuery.error ? `Channel figures unavailable: ${totalsQuery.error.message}` : "No channel figures for this period"}
        </p>
      ) : selected ? (
        <div className="space-y-4">
          <ChannelFocusGrid selected={selected} platform={live.platform} periodDays={countDays(period.range)} />
          <RankChips ranks={sourceRanks(live.stats, selected.source)} total={live.stats.length} />
        </div>
      ) : (
        <ChannelRankingGrid stats={live.stats} rankBy={rankBy} />
      )}

      <DayByDayCard
        rows={view?.days ?? []}
        channel={channel}
        platformLabel={platformLabel}
        range={tableRange}
        periodDays={countDays(tableRange)}
        note={dataNote}
        isLoading={isLoading}
      />
    </div>
  );
}
