import type { ChannelId } from "@/config/channels";
import { WSO2_SOURCE_LABELS, type Wso2ChannelSource, type Wso2Source } from "@/config/wso2-sources";
import {
  RANK_ITEMS,
  formatEtb2,
  sortChannels,
  type ChannelsView,
  type Granularity,
  type PeriodRow,
  type RankMetric,
} from "@/lib/channels";
import {
  avgPayment,
  COMPARISON_TYPE_LABELS,
  formatAmount,
  gapBetween,
  shareOfAmount,
  type BottomLine,
  type Insight,
  type PeriodOption,
  type SideFigures,
  type SideKey,
} from "@/lib/comparison";
import type { DateRange } from "@/lib/date";
import { formatNumber } from "@/lib/format";
import {
  formatEtb,
  formatFullRangeLabel,
  formatLongDate,
  formatRangeLabel,
  type OverviewKpi,
  type SourceRow,
} from "@/lib/overview";
import type { OverviewDataset } from "@/types/api";

import { fileSlug, type Cell, type ReportSpec, type ReportTable } from "./report-spec";

/**
 * Turns each page's on-screen figures into a `ReportSpec`. Builders only read
 * what the page already computed, so an export always matches the screen.
 */

/** Who generated the report and when; filled in by the export button. */
export interface ReportAuthor {
  preparedBy: string;
  accessLevel: string;
  generatedAt: Date;
}

export interface ExportRequest {
  spec: ReportSpec;
  /** File name without extension. */
  fileBase: string;
}

function clippedNote(dataset: OverviewDataset, range: DateRange): string[] {
  return range.from < dataset.from
    ? [`Data is available from ${formatLongDate(dataset.from)}; earlier days in the reporting period are not included.`]
    : [];
}

/** Indexes of the items matching `test`, for `highlightRows`. */
function indexesOf<T>(items: T[], test: (item: T) => boolean): number[] {
  return items.flatMap((item, i) => (test(item) ? [i] : []));
}

/* ---------- Overview ---------- */

/** What the Overview export leaves out, and why. */
const OVERVIEW_LIVE_NOTE =
  "Figures are live totals from WSO2 for the reporting period. Success and failure rates, latency, transaction status and daily figures are not included because the API does not provide them yet.";

/** Only figures that came from the live API: the totals KPIs and the per-source table. */
export function buildOverviewReport(
  input: {
    /** Every WSO2 source's totals for the period. */
    rows: SourceRow[];
    /** The live KPIs (total value, volume, average transaction value), as shown on screen. */
    kpis: OverviewKpi[];
    source: Wso2Source;
    sourceLabel: string;
    range: DateRange;
  },
  author: ReportAuthor,
): ExportRequest {
  const { rows, kpis, source, sourceLabel, range } = input;
  const sorted = [...rows].sort((a, b) => b.totalAmount - a.totalAmount);
  const totalCount = sorted.reduce((acc, r) => acc + r.totalTransactions, 0);
  const totalValue = sorted.reduce((acc, r) => acc + r.totalAmount, 0);

  const performance: ReportTable = {
    title: "Channel performance",
    note: "Live totals per source, ranked by amount",
    pdf: true,
    columns: [
      { header: "Source", kind: "text", width: 1.6 },
      { header: "Transactions", kind: "count" },
      { header: "Amount (ETB)", kind: "etb" },
      { header: "Avg amount (ETB)", kind: "etbRound" },
      { header: "Share of transactions", kind: "percent" },
      { header: "Share of amount", kind: "percent" },
    ],
    rows: sorted.map((r) => [
      WSO2_SOURCE_LABELS[r.source],
      r.totalTransactions,
      r.totalAmount,
      r.totalTransactions ? r.totalAmount / r.totalTransactions : 0,
      totalCount ? r.totalTransactions / totalCount : 0,
      totalValue ? r.totalAmount / totalValue : 0,
    ]),
    highlightRows: source === "all" ? undefined : indexesOf(sorted, (r) => r.source === source),
  };

  return {
    fileBase: `overview-${fileSlug(source)}-${range.from}-${range.to}`,
    spec: {
      code: "OVERVIEW",
      eyebrow: "Overview report",
      title: "Transaction monitoring overview",
      reportName: "Transaction monitoring overview",
      periodLabel: formatFullRangeLabel(range),
      scope: `${sourceLabel} · ${formatRangeLabel(range)}`,
      orientation: "portrait",
      keyFigures: kpis.map((k) => ({ label: k.label, value: k.value, detail: k.detail })),
      takeaways: [],
      tables: [performance],
      notes: [OVERVIEW_LIVE_NOTE],
      ...author,
    },
  };
}

/* ---------- Channels ---------- */

export function buildChannelsReport(
  input: {
    dataset: OverviewDataset;
    view: ChannelsView;
    channel: ChannelId | "all";
    rankBy: RankMetric;
    platformLabel: string;
    range: DateRange;
  },
  author: ReportAuthor,
): ExportRequest {
  const { dataset, view, channel, platformLabel, range } = input;
  // A single platform is shown against the others, ranked by value.
  const rankBy: RankMetric = channel === "all" ? input.rankBy : "value";
  const ranked = sortChannels(view.stats, rankBy);
  const selected = view.selected;

  const ranking: ReportTable = {
    title: "Channel ranking",
    note: `Ranked by ${RANK_ITEMS[rankBy].replace(/^Rank by /, "")}`,
    pdf: true,
    columns: [
      { header: "Channel", kind: "text", width: 1.6 },
      { header: "Transactions", kind: "count" },
      { header: "Amount (ETB)", kind: "etb" },
      { header: "Success rate", kind: "percent" },
      { header: "Avg latency (ms)", kind: "ms" },
      { header: "Avg amount (ETB)", kind: "etbRound" },
      { header: "Share", kind: "percent" },
    ],
    rows: ranked.map((s) => [s.name, s.count, s.value, s.successRate, Math.round(s.avgLatencyMs), s.avgTicket, s.share]),
    highlightRows: channel === "all" ? undefined : indexesOf(ranked, (s) => s.channel === channel),
  };

  const days: ReportTable = {
    title: "Daily summary",
    note: platformLabel,
    pdf: false,
    columns: [
      { header: "Date", kind: "text" },
      { header: "Day", kind: "text" },
      { header: "Transactions", kind: "count" },
      { header: "Amount (ETB)", kind: "etb" },
      { header: "Avg amount (ETB)", kind: "etbRound" },
      { header: "Failed / reversed", kind: "count" },
      { header: "Success rate", kind: "percent" },
    ],
    rows: view.days.map((d) => [d.date, d.weekday, d.count, d.value, d.avgTicket, d.failed, d.successRate]),
  };

  return {
    fileBase: `channels-${fileSlug(channel)}-${range.from}-${range.to}`,
    spec: {
      code: "CHANNELS",
      eyebrow: "Channel performance",
      title: selected ? `${selected.name} performance` : "Channel performance",
      reportName: "Channel performance",
      periodLabel: formatFullRangeLabel(range),
      scope: `${platformLabel} · ${formatRangeLabel(range)}`,
      orientation: "landscape",
      keyFigures: selected
        ? [
            {
              label: "Transactions",
              value: formatNumber(selected.count),
              detail: `~ ${formatNumber(selected.perDay)} per day, rank ${selected.ranks.transactions} of ${view.stats.length}`,
            },
            {
              label: "Transaction amount",
              value: formatEtb2(selected.value),
              detail: `Avg amount ${formatEtb(selected.avgTicket)}, rank ${selected.ranks.value} of ${view.stats.length}`,
            },
            {
              label: "Success rate",
              value: `${(selected.successRate * 100).toFixed(2)}%`,
              detail: `Avg latency ${Math.round(selected.avgLatencyMs)} ms`,
            },
          ]
        : [],
      takeaways: [],
      tables: [ranking, days],
      notes: clippedNote(dataset, range),
      ...author,
    },
  };
}

/* ---------- Comparison ---------- */

export type ComparisonExportInput =
  | {
      type: "channels";
      channels: { a: Wso2ChannelSource; b: Wso2ChannelSource };
      range: DateRange;
    }
  | {
      type: "periods";
      channel: Wso2Source;
      periods: { a: PeriodOption; b: PeriodOption };
    };

export function buildComparisonReport(
  input: ComparisonExportInput & {
    a: SideFigures;
    b: SideFigures;
    insights: Insight[];
    line: BottomLine | null;
  },
  author: ReportAuthor,
): ExportRequest {
  const { a, b, insights, line } = input;
  const leaderName = (leader: SideKey | "even" | null) =>
    leader === "a" ? a.name : leader === "b" ? b.name : leader === "even" ? "Even" : null;

  const metricRow = (label: string, kind: "etb" | "count" | "etbRound", va: number | null, vb: number | null): Cell[] => {
    const gap = gapBetween(va, vb);
    return [
      label,
      { value: va, kind },
      { value: vb, kind },
      { value: gap.leader === null ? null : gap.difference, kind },
      leaderName(gap.leader),
      gap.caption,
    ];
  };

  const headToHead: ReportTable = {
    title: "Head-to-head",
    pdf: true,
    columns: [
      { header: "Metric", kind: "text", width: 1.5 },
      { header: a.name, kind: "count" },
      { header: b.name, kind: "count" },
      { header: "Difference", kind: "count" },
      { header: "Ahead", kind: "text", width: 1.2 },
      { header: "Gap", kind: "text", width: 1.2 },
    ],
    rows: [
      metricRow("Amount (ETB)", "etb", a.amount, b.amount),
      metricRow("Transactions", "count", a.transactions, b.transactions),
      metricRow("Avg payment (ETB)", "etbRound", avgPayment(a), avgPayment(b)),
    ],
  };

  const keyInsights: ReportTable = {
    title: "Key insights",
    pdf: false,
    columns: [
      { header: "Insight", kind: "text" },
      { header: "Detail", kind: "text" },
    ],
    rows: insights.map((i) => [i.title, i.text]),
  };

  const share = shareOfAmount(a, b);
  const sideFigure = (side: SideFigures) => ({
    label: `${side.name} amount`,
    value: side.amount === null ? "No data" : formatAmount(side.amount),
    detail:
      side.transactions === null
        ? "Transaction count not available"
        : `${Math.round(side.transactions).toLocaleString("en-US")} transactions`,
  });

  const common = {
    code: "COMPARISON" as const,
    title: `${a.name} vs ${b.name}`,
    reportName: `${a.name} vs ${b.name}`,
    orientation: "portrait" as const,
    keyFigures: [
      sideFigure(a),
      sideFigure(b),
      {
        label: "Share of combined amount",
        value: share ? `${Math.round(share.a)}% / ${Math.round(share.b)}%` : "No data",
        detail: `${a.name} / ${b.name}`,
      },
    ],
    headline: line ? { value: line.parts.map((p) => p.text).join(""), detail: line.detail } : undefined,
    takeaways: insights.map((i) => i.text),
    tables: [headToHead, keyInsights],
    notes: [],
    ...author,
  };

  if (input.type === "channels") {
    const { range, channels } = input;
    return {
      fileBase: `comparison-${fileSlug(channels.a)}-vs-${fileSlug(channels.b)}-${range.from}-${range.to}`,
      spec: {
        ...common,
        eyebrow: COMPARISON_TYPE_LABELS.channels,
        periodLabel: formatFullRangeLabel(range),
        scope: `${COMPARISON_TYPE_LABELS.channels} · ${formatRangeLabel(range)}`,
      },
    };
  }

  const { periods, channel } = input;
  const platform = WSO2_SOURCE_LABELS[channel];
  return {
    fileBase: `comparison-${fileSlug(channel)}-${periods.a.range.from}-vs-${periods.b.range.from}`,
    spec: {
      ...common,
      eyebrow: COMPARISON_TYPE_LABELS.periods,
      periodLabel: `${periods.a.label} vs ${periods.b.label}`,
      scope: `${COMPARISON_TYPE_LABELS.periods} · ${platform}`,
      subtitle: `${periods.a.label} vs ${periods.b.label} · ${platform}`,
    },
  };
}

/* ---------- Daily / weekly / monthly summary (Channels page table) ---------- */

export function buildDayByDayReport(
  input: {
    rows: PeriodRow[];
    granularity: Granularity;
    /** "Daily summary", "Weekly summary" or "Monthly summary". */
    title: string;
    channel: ChannelId | "all";
    platformLabel: string;
    range: DateRange;
  },
  author: ReportAuthor,
): ExportRequest {
  const { rows, granularity, title, channel, platformLabel, range } = input;
  const isDay = granularity === "day";
  const count = rows.reduce((acc, r) => acc + r.count, 0);
  const value = rows.reduce((acc, r) => acc + r.value, 0);
  const unit = isDay ? "day" : granularity;

  const table: ReportTable = {
    title,
    note: platformLabel,
    pdf: true,
    columns: [
      ...(isDay
        ? ([
            { header: "Date", kind: "text" },
            { header: "Day", kind: "text", width: 0.8 },
          ] as const)
        : ([
            { header: granularity === "week" ? "Week" : "Month", kind: "text", width: 1.6 },
            { header: "Days", kind: "count", width: 0.6 },
          ] as const)),
      { header: "Transactions", kind: "count" },
      { header: "Amount (ETB)", kind: "etb" },
      { header: "Avg amount (ETB)", kind: "etbRound" },
    ],
    rows: rows.map((r) => [
      ...(isDay ? [r.start, r.sublabel.split(",")[0]] : [r.label, r.days]),
      r.count,
      r.value,
      r.avgTicket,
    ]),
  };

  return {
    fileBase: `channels-${fileSlug(channel)}-${granularity === "day" ? "daily" : `${granularity}ly`}-${range.from}-${range.to}`,
    spec: {
      code: "CHANNELS",
      eyebrow: "Channel performance",
      title,
      reportName: `Channel performance – ${title.toLowerCase()}`,
      periodLabel: formatFullRangeLabel(range),
      scope: `${platformLabel} · ${formatRangeLabel(range)}`,
      orientation: "portrait",
      keyFigures: [
        {
          label: "Total transactions",
          value: formatNumber(count),
          detail: `~ ${formatNumber(rows.length ? count / rows.length : 0)} per ${unit}`,
        },
        {
          label: "Total amount",
          value: formatEtb2(value),
          detail: `~ ${formatEtb2(rows.length ? value / rows.length : 0)} per ${unit}`,
        },
        {
          label: "Average amount",
          value: formatEtb(count ? value / count : 0),
          detail: `Across ${rows.length} ${rows.length === 1 ? unit : `${unit}s`}`,
        },
      ],
      takeaways: [],
      tables: [table],
      notes: [],
      ...author,
    },
  };
}
