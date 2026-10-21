"use client";

import { useMemo, useState } from "react";
import { Layers, X } from "lucide-react";

// import { AnomalyFlagsCard } from "@/components/overview/anomaly-flags-card";
import { ChannelPerformanceCard } from "@/components/overview/channel-performance-card";
import { DailyTransactionsCard } from "@/components/overview/daily-transactions-card";
import { DistributionByChannelCard } from "@/components/overview/distribution-card";
// import { LatencyCard } from "@/components/overview/latency-card";
import { OverviewKpiGrid } from "@/components/overview/overview-kpi-grid";
import { PeriodPicker } from "@/components/overview/period-picker";
import { ExportMenu } from "@/components/reports/export-menu";
import { buildOverviewReport } from "@/components/reports/report-builders";
// import { StatusDistributionCard } from "@/components/overview/status-distribution-card";
// import { TopFailingChannelsCard } from "@/components/overview/top-failing-channels-card";
import { ValueMixCard } from "@/components/overview/value-mix-card";
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
import { useAllAdvanced, useMe, useOverviewDataset } from "@/hooks";
import { generateMockDailySeries } from "@/lib/mock/all-advanced-data";
import {
  LIVE_KPI_IDS,
  applyLiveTotals,
  computeOverview,
  formatRangeLabel,
  pickSourceTotals,
  sourceRows,
} from "@/lib/overview";

const USER_VISIBLE_KPI_IDS = new Set(["total-value", "total-volume", "avg-value"]);

export default function OverviewPage() {
  // Shared across pages; kept until the user picks another period.
  const { period, setPeriod } = usePeriod();
  // `source` (the dropdown, or a click on the distribution card) drives the live
  // WSO2 totals. The sample dataset no longer has a channel filter, so it stays on "all".
  const [source, setSource] = useState<Wso2Source>("all");
  const channel: ChannelId | "all" = "all";

  const meQuery = useMe();
  const isAdmin = meQuery.data?.user.role === "ADMIN";

  const datasetQuery = useOverviewDataset();
  const dataset = datasetQuery.data;
  // One call per period returns every source, so switching source needs no refetch.
  const totalsQuery = useAllAdvanced({ startDate: period.range.from, endDate: period.range.to });
  const isLoading = datasetQuery.isLoading || !dataset;

  const view = useMemo(
    () => (dataset ? computeOverview(dataset, period.range, channel) : undefined),
    [dataset, period.range, channel],
  );

  const kpis = applyLiveTotals(
    (view?.kpis ?? []).filter((kpi) => isAdmin || USER_VISIBLE_KPI_IDS.has(kpi.id)),
    pickSourceTotals(totalsQuery.data, source),
    period.range,
    totalsQuery.error?.message,
  );
  const platformLabel = WSO2_SOURCE_LABELS[source];
  // The API has no per-day breakdown yet (see ADVANCED_API.md), so the daily
  // chart runs on dummy days that add up to the dummy totals on the cards.
  const dailySeries = useMemo(
    () => generateMockDailySeries({ startDate: period.range.from, endDate: period.range.to }, source),
    [period.range, source],
  );
  const chartSubtitle = `${platformLabel}, ${formatRangeLabel(period.range)}`;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 flex-wrap items-center gap-2.5">
          {/* Page title hidden for now.
          <h2 className="text-[22px] font-bold tracking-[-0.02em] text-foreground">
            Transaction monitoring overview
          </h2> */}
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-soft py-1 pr-2 pl-2.5 text-xs font-medium text-primary-strong">
            <span className="size-1.5 shrink-0 rounded-full bg-primary" />
            {platformLabel}
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
          <PeriodPicker value={period} onChange={setPeriod} dataFrom={dataset?.from} size="sm" />
          <ExportMenu
            // The export holds only live API figures, so it waits for (and needs) the totals.
            disabled={!totalsQuery.data}
            getReport={(author) =>
              totalsQuery.data
                ? buildOverviewReport(
                    {
                      rows: sourceRows(totalsQuery.data),
                      kpis: kpis.filter((kpi) => LIVE_KPI_IDS.has(kpi.id)),
                      source,
                      sourceLabel: platformLabel,
                      range: period.range,
                    },
                    author,
                  )
                : undefined
            }
          />
        </div>
      </div>

      <OverviewKpiGrid
        kpis={kpis}
        isLoading={isLoading}
        loadingIds={totalsQuery.isPending ? LIVE_KPI_IDS : undefined}
        skeletonCount={isAdmin ? 6 : USER_VISIBLE_KPI_IDS.size}
      />

      <DailyTransactionsCard series={dailySeries} subtitle={chartSubtitle} isLoading={totalsQuery.isPending} />

      {/* Side by side: one card ranks channels by value, the other by transactions. */}
      <div className="grid grid-cols-1 gap-4 min-[1101px]:grid-cols-2">
        {(["value", "volume"] as const).map((metric) => (
          <ChannelPerformanceCard
            key={metric}
            metric={metric}
            data={sourceRows(totalsQuery.data)}
            range={period.range}
            selected={source}
            isLoading={totalsQuery.isPending}
            errorMessage={totalsQuery.error?.message}
          />
        ))}
      </div>

      {isAdmin && (
        <>

          <div className="grid grid-cols-1 gap-4 min-[1101px]:grid-cols-2">
            <DistributionByChannelCard
              data={sourceRows(totalsQuery.data)}
              range={period.range}
              selected={source}
              onSelect={setSource}
              isLoading={totalsQuery.isPending}
              errorMessage={totalsQuery.error?.message}
            />
            {/* Status card hidden: allAdvanced has no success/failed/reversed/pending figures.
            <StatusDistributionCard data={dataset?.status} isLoading={isLoading} /> */}
            <ValueMixCard
              data={sourceRows(totalsQuery.data)}
              range={period.range}
              isLoading={totalsQuery.isPending}
              errorMessage={totalsQuery.error?.message}
            />
          </div>

          {/* Hidden for now: latency, failing channels and anomaly flags are still sample data.
          <div className="grid grid-cols-1 gap-3 min-[901px]:grid-cols-2 min-[1181px]:grid-cols-3">
            <LatencyCard data={dataset?.channels ?? []} isLoading={isLoading} />
            <TopFailingChannelsCard data={dataset?.failing ?? []} isLoading={isLoading} />
            <AnomalyFlagsCard
              data={dataset?.anomalies ?? []}
              isLoading={isLoading}
              className="min-[901px]:max-[1180px]:col-span-2"
            />
          </div> */}
        </>
      )}
    </div>
  );
}
