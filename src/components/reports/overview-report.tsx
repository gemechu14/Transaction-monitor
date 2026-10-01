import { Text } from "@react-pdf/renderer";

import { STATUS_COLORS } from "@/config/colors";
import { CHANNELS, type ChannelId } from "@/config/channels";
import { formatCompactNumber } from "@/lib/format";
import {
  channelName,
  formatEtb,
  formatRangeLabel,
  formatShortDate,
  type OverviewKpi,
  type OverviewView,
} from "@/lib/overview";
import type { OverviewChannelRow, OverviewDataset } from "@/types/api";

import {
  BarChart,
  KpiTiles,
  PDF_COLORS,
  ReportDocument,
  Section,
  StackedBar,
  Table,
  TwoColumns,
  type Column,
  type ReportMeta,
} from "./report-kit";

export interface OverviewReportProps {
  meta: Omit<ReportMeta, "eyebrow" | "title" | "chips">;
  dataset: OverviewDataset;
  view: OverviewView;
  /** Already filtered to what the viewer's role may see. */
  kpis: OverviewKpi[];
  channel: ChannelId | "all";
  platformLabel: string;
  isAdmin: boolean;
}

const count = (n: number) => Math.round(n).toLocaleString("en-US");
const pct = (fraction: number, digits = 1) => `${(fraction * 100).toFixed(digits)}%`;
const color = (id: ChannelId) => CHANNELS[id]?.color ?? "#98A2B3";

export function OverviewReport({
  meta,
  dataset,
  view,
  kpis,
  channel,
  platformLabel,
  isAdmin,
}: OverviewReportProps) {
  const channels = [...dataset.channels].sort((a, b) => b.totalValue - a.totalValue);
  const totalCount = channels.reduce((acc, c) => acc + c.transactionCount, 0);
  const baseNote = `Base period ${formatRangeLabel({ from: dataset.from, to: dataset.to })}`;

  const channelColumns: Column<OverviewChannelRow>[] = [
    { header: "Channel", width: 2.2, cell: (r) => channelName(r.channel), dot: (r) => color(r.channel) },
    { header: "Transactions", width: 1.3, align: "right", cell: (r) => count(r.transactionCount) },
    { header: "Value", width: 1.3, align: "right", cell: (r) => formatEtb(r.totalValue) },
    {
      header: "Avg ticket",
      width: 1.2,
      align: "right",
      cell: (r) => formatEtb(r.transactionCount ? r.totalValue / r.transactionCount : 0),
    },
    {
      header: "Share",
      width: 0.9,
      align: "right",
      cell: (r) => pct(totalCount ? r.transactionCount / totalCount : 0),
    },
    ...(isAdmin
      ? ([
          { header: "Success", width: 1, align: "right", cell: (r) => pct(r.successRate) },
          { header: "Latency", width: 1, align: "right", cell: (r) => `${Math.round(r.avgLatencyMs)} ms` },
        ] satisfies Column<OverviewChannelRow>[])
      : []),
  ];

  const status = dataset.status;

  return (
    <ReportDocument
      meta={{
        ...meta,
        eyebrow: "Overview report",
        title: "Transaction monitoring overview",
        chips: [platformLabel, meta.periodLabel, `${view.dataDays} day${view.dataDays === 1 ? "" : "s"} of data`],
      }}
    >
      <Section title="Key figures" note={view.clipped ? "Data available from 1 Sep" : undefined}>
        <KpiTiles tiles={kpis.map((k) => ({ label: k.label, value: k.value, detail: k.detail }))} />
      </Section>

      <Section title="Daily transaction value" note={`${platformLabel}, ${meta.periodLabel}`}>
        <BarChart
          points={view.series.map((d) => ({ label: formatShortDate(d.date), value: d.value }))}
          formatMax={(v) => formatEtb(v)}
        />
      </Section>

      <Section title="Daily transaction volume" note={`${platformLabel}, ${meta.periodLabel}`}>
        <BarChart
          points={view.series.map((d) => ({ label: formatShortDate(d.date), value: d.count }))}
          formatMax={(v) => formatCompactNumber(v)}
          height={90}
        />
      </Section>

      <Section title="Channel performance" note={baseNote}>
        <Table
          columns={channelColumns}
          rows={channels}
          highlight={channel === "all" ? undefined : (r) => r.channel === channel}
        />
      </Section>

      {isAdmin && (
        <>
          <Section title="Status distribution" note={baseNote}>
            <StackedBar
              segments={[
                { label: "Success", value: status.success, color: STATUS_COLORS.success.fg, display: formatCompactNumber(status.success) },
                { label: "Failed", value: status.failed, color: STATUS_COLORS.failed.fg, display: formatCompactNumber(status.failed) },
                { label: "Reversed", value: status.reversed, color: STATUS_COLORS.reversed.fg, display: formatCompactNumber(status.reversed) },
                { label: "Pending", value: status.pending, color: STATUS_COLORS.pending.fg, display: formatCompactNumber(status.pending) },
              ]}
            />
          </Section>

          <TwoColumns
            left={
              <Section title="Top failing channels">
                <Table
                  columns={[
                    { header: "Channel", width: 1.8, cell: (r) => channelName(r.channel), dot: (r) => color(r.channel) },
                    { header: "Failed", width: 1, align: "right", cell: (r) => count(r.failedCount) },
                    { header: "Rate", width: 0.9, align: "right", cell: (r) => pct(r.failureRate, 2) },
                  ]}
                  rows={dataset.failing}
                />
              </Section>
            }
            right={
              <Section title="Anomaly flags">
                {dataset.anomalies.length ? (
                  <Table
                    columns={[
                      { header: "Channel", width: 1.8, cell: (r) => channelName(r.channel), dot: (r) => color(r.channel) },
                      { header: "Failure", width: 1, align: "right", cell: (r) => pct(r.failureRate, 2) },
                      { header: "Baseline", width: 1, align: "right", cell: (r) => pct(r.baselineRate, 2) },
                    ]}
                    rows={dataset.anomalies}
                  />
                ) : (
                  <Text style={{ fontSize: 8.5, color: PDF_COLORS.muted }}>
                    No channel is failing above its baseline.
                  </Text>
                )}
              </Section>
            }
          />
        </>
      )}
    </ReportDocument>
  );
}
