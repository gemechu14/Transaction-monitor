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
import { formatCompactNumber } from "@/lib/format";
import {
  channelName,
  formatEtb,
  formatFullRangeLabel,
  formatLongDate,
  formatRangeLabel,
  type OverviewKpi,
  type OverviewView,
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

const RESTRICTED_NOTE =
  "Operational metrics (success and failure rates, latency, status distribution, failing channels and anomaly flags) are restricted to administrators and are not included in this report.";

function clippedNote(dataset: OverviewDataset, range: DateRange): string[] {
  return range.from < dataset.from
    ? [`Data is available from ${formatLongDate(dataset.from)}; earlier days in the reporting period are not included.`]
    : [];
}

function indexOrUndefined(index: number): number | undefined {
  return index >= 0 ? index : undefined;
}

/* ---------- Overview ---------- */

export function buildOverviewReport(
  input: {
    dataset: OverviewDataset;
    view: OverviewView;
    /** Already filtered to what the viewer's role may see. */
    kpis: OverviewKpi[];
    channel: ChannelId | "all";
    platformLabel: string;
    range: DateRange;
    isAdmin: boolean;
  },
  author: ReportAuthor,
): ExportRequest {
  const { dataset, view, kpis, channel, platformLabel, range, isAdmin } = input;
  const channels = [...dataset.channels].sort((a, b) => b.totalValue - a.totalValue);
  const totalCount = channels.reduce((acc, c) => acc + c.transactionCount, 0);

  const daily: ReportTable = {
    title: "Daily transactions",
    note: platformLabel,
    pdf: false,
    columns: [
      { header: "Date", kind: "text" },
      { header: "Transactions", kind: "count" },
      { header: "Value (ETB)", kind: "etb" },
      { header: "Avg ticket (ETB)", kind: "etbRound" },
    ],
    rows: view.series.map((d) => [d.date, d.count, d.value, d.count ? d.value / d.count : 0]),
  };

  const performance: ReportTable = {
    title: "Channel performance",
    note: "Base month figures per channel",
    pdf: true,
    columns: [
      { header: "Channel", kind: "text", width: 1.6 },
      { header: "Transactions", kind: "count" },
      { header: "Value (ETB)", kind: "etb" },
      { header: "Avg ticket (ETB)", kind: "etbRound" },
      { header: "Share", kind: "percent" },
      ...(isAdmin
        ? ([
            { header: "Success rate", kind: "percent" },
            { header: "Avg latency (ms)", kind: "ms" },
          ] as const)
        : []),
    ],
    rows: channels.map((c) => [
      channelName(c.channel),
      c.transactionCount,
      c.totalValue,
      c.transactionCount ? c.totalValue / c.transactionCount : 0,
      totalCount ? c.transactionCount / totalCount : 0,
      ...(isAdmin ? [c.successRate, Math.round(c.avgLatencyMs)] : []),
    ]),
    highlightRow: channel === "all" ? undefined : indexOrUndefined(channels.findIndex((c) => c.channel === channel)),
  };

  return {
    fileBase: `overview-${fileSlug(channel)}-${range.from}-${range.to}`,
    spec: {
      code: "OVERVIEW",
      eyebrow: "Overview report",
      title: "Transaction monitoring overview",
      reportName: "Transaction monitoring overview",
      periodLabel: formatFullRangeLabel(range),
      scope: `${platformLabel} · ${formatRangeLabel(range)}`,
      orientation: "portrait",
      keyFigures: kpis.map((k) => ({ label: k.label, value: k.value, detail: k.detail })),
      takeaways: [],
      tables: [daily, performance],
      notes: [...clippedNote(dataset, range), ...(isAdmin ? [] : [RESTRICTED_NOTE])],
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
      { header: "Value (ETB)", kind: "etb" },
      { header: "Success rate", kind: "percent" },
      { header: "Avg latency (ms)", kind: "ms" },
      { header: "Avg ticket (ETB)", kind: "etbRound" },
      { header: "Share", kind: "percent" },
    ],
    rows: ranked.map((s) => [s.name, s.count, s.value, s.successRate, Math.round(s.avgLatencyMs), s.avgTicket, s.share]),
    highlightRow: channel === "all" ? undefined : indexOrUndefined(ranked.findIndex((s) => s.channel === channel)),
  };

  const days: ReportTable = {
    title: "Day by day",
    note: platformLabel,
    pdf: false,
    columns: [
      { header: "Date", kind: "text" },
      { header: "Day", kind: "text" },
      { header: "Transactions", kind: "count" },
      { header: "Value (ETB)", kind: "etb" },
      { header: "Avg ticket (ETB)", kind: "etbRound" },
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
              value: formatCompactNumber(selected.count),
              detail: `~ ${formatCompactNumber(selected.perDay)} per day, rank ${selected.ranks.transactions} of ${view.stats.length}`,
            },
            {
              label: "Transaction value",
              value: formatEtb2(selected.value),
              detail: `Avg ticket ${formatEtb(selected.avgTicket)}, rank ${selected.ranks.value} of ${view.stats.length}`,
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
        eyebrow: "Channel vs channel",
        periodLabel: formatFullRangeLabel(range),
        scope: `Channel vs channel · ${formatRangeLabel(range)}`,
      },
    };
  }

  const { periods, channel } = input;
  const platform = WSO2_SOURCE_LABELS[channel];
  return {
    fileBase: `comparison-${fileSlug(channel)}-${periods.a.range.from}-vs-${periods.b.range.from}`,
    spec: {
      ...common,
      eyebrow: "Period over period",
      periodLabel: `${periods.a.label} vs ${periods.b.label}`,
      scope: `Period over period · ${platform}`,
      subtitle: `${periods.a.label} vs ${periods.b.label} · ${platform}`,
    },
  };
}

/* ---------- Day by day (Channels page table) ---------- */

export function buildDayByDayReport(
  input: {
    rows: PeriodRow[];
    granularity: Granularity;
    /** "Day by day", "Week by week" or "Month by month". */
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
      { header: "Value (ETB)", kind: "etb" },
      { header: "Avg ticket (ETB)", kind: "etbRound" },
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
          value: formatCompactNumber(count),
          detail: `~ ${formatCompactNumber(rows.length ? count / rows.length : 0)} per ${unit}`,
        },
        {
          label: "Total value",
          value: formatEtb2(value),
          detail: `~ ${formatEtb2(rows.length ? value / rows.length : 0)} per ${unit}`,
        },
        {
          label: "Average ticket",
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
