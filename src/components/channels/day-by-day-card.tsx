"use client";

import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, CalendarDays, ChartColumn, ChevronsUpDown, Table } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { SectionCard } from "@/components/overview/section-card";
import { ExportMenu } from "@/components/reports/export-menu";
import { buildDayByDayReport } from "@/components/reports/report-builders";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import type { ChannelId } from "@/config/channels";
import { useMediaQuery } from "@/hooks/use-media-query";
import {
  // LOW_SUCCESS_RATE, // used by the Success column, hidden for now
  availableGranularities,
  formatEtb2,
  groupDays,
  type DayRow,
  type Granularity,
  type PeriodRow,
} from "@/lib/channels";
import { formatNumber } from "@/lib/format";
import type { DateRange } from "@/lib/date";
import { formatEtb, formatShortDate, niceAxisMax } from "@/lib/overview";
import { cn } from "@/lib/utils";

type View = "table" | "chart";
type SortKey = "start" | "count" | "value" | "avgTicket" | "failed" | "successRate";
type SortDir = "asc" | "desc";

const VIEW_ITEMS: Record<View, string> = { table: "Table", chart: "Chart" };

const GRANULARITY: Record<Granularity, { label: string; title: string; word: string; file: string }> = {
  day: { label: "Day", title: "Day by day", word: "day", file: "daily" },
  week: { label: "Week", title: "Week by week", word: "week", file: "weekly" },
  month: { label: "Month", title: "Month by month", word: "month", file: "monthly" },
};

const COLUMNS: { key: SortKey; label: string; align?: "right" }[] = [
  { key: "start", label: "Day" },
  { key: "count", label: "Transactions", align: "right" },
  { key: "value", label: "Value (ETB)", align: "right" },
  { key: "avgTicket", label: "Avg ticket (ETB)", align: "right" },
  // Hidden for now; restore with the matching cells in DayTable.
  // { key: "failed", label: "Failed / reversed", align: "right" },
  // { key: "successRate", label: "Success", align: "right" },
];

const TRIGGER_CLASS = "h-9 rounded-[10px] bg-card px-3 text-[13px] font-medium";

function sortRows(rows: PeriodRow[], key: SortKey, dir: SortDir): PeriodRow[] {
  const sorted = [...rows].sort((a, b) =>
    key === "start" ? a.start.localeCompare(b.start) : a[key] - b[key],
  );
  return dir === "asc" ? sorted : sorted.reverse();
}

export function DayByDayCard({
  rows,
  channel,
  platformLabel,
  range,
  periodDays,
  note,
  isLoading,
}: {
  rows: DayRow[];
  channel: ChannelId | "all";
  platformLabel: string;
  /** Selected period, for the exported report. */
  range: DateRange;
  /** Length of the selected period; decides whether week and month grouping are offered. */
  periodDays: number;
  /** Replaces "in the selected period" in the subtitle, e.g. "of the sample data (1 – 30 Sep 2026)". */
  note?: string;
  isLoading?: boolean;
}) {
  const [view, setView] = useState<View>("table");
  const [granularity, setGranularity] = useState<Granularity>("day");
  const [sort, setSort] = useState<{ key: SortKey; dir: SortDir }>({ key: "start", dir: "asc" });

  const options = availableGranularities(periodDays);
  // Falls back to days when the period gets too short, but keeps the choice for when it grows again.
  const active = options.includes(granularity) ? granularity : "day";
  const meta = GRANULARITY[active];

  const grouped = useMemo(() => groupDays(rows, active), [rows, active]);
  const sorted = useMemo(() => sortRows(grouped, sort.key, sort.dir), [grouped, sort]);

  const toggleSort = (key: SortKey) =>
    setSort((prev) =>
      prev.key === key
        ? { key, dir: prev.dir === "asc" ? "desc" : "asc" }
        : { key, dir: key === "start" ? "asc" : "desc" },
    );

  return (
    <SectionCard
      title={meta.title}
      description={`${platformLabel}, each ${meta.word} ${note ?? "in the selected period"}`}
      actions={
        <>
          {options.length > 1 && (
            <Select
              items={Object.fromEntries(options.map((g) => [g, GRANULARITY[g].title]))}
              value={active}
              onValueChange={(value) => setGranularity(value as Granularity)}
            >
              <SelectTrigger aria-label="Group rows by" className={cn(TRIGGER_CLASS, "w-40")}>
                <CalendarDays className="size-4 text-primary-strong" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {options.map((g) => (
                  <SelectItem key={g} value={g}>
                    {GRANULARITY[g].title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Select items={VIEW_ITEMS} value={view} onValueChange={(value) => setView(value as View)}>
            <SelectTrigger aria-label="Table or chart" className={cn(TRIGGER_CLASS, "w-28")}>
              {view === "table" ? (
                <Table className="size-4 text-primary-strong" />
              ) : (
                <ChartColumn className="size-4 text-primary-strong" />
              )}
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(VIEW_ITEMS) as View[]).map((v) => (
                <SelectItem key={v} value={v}>
                  {VIEW_ITEMS[v]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <ExportMenu
            size="sm"
            disabled={isLoading || !rows.length}
            getReport={(author) =>
              buildDayByDayReport(
                { rows: sorted, granularity: active, title: meta.title, channel, platformLabel, range },
                author,
              )
            }
          />
        </>
      }
    >
      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-[360px] w-full rounded-xl" />
        </div>
      ) : rows.length === 0 ? (
        <div className="flex h-[260px] items-center justify-center rounded-xl bg-muted text-sm text-muted-foreground">
          No data in this period. Data is available from 1 Sep 2026.
        </div>
      ) : (
        <div className="space-y-4">
          {view === "table" ? (
            <DayTable rows={sorted} heading={meta.label} sort={sort} onSort={toggleSort} />
          ) : (
            <DayChart rows={grouped} granularity={active} />
          )}
        </div>
      )}
    </SectionCard>
  );
}

function DayTable({
  rows,
  heading,
  sort,
  onSort,
}: {
  rows: PeriodRow[];
  heading: string;
  sort: { key: SortKey; dir: SortDir };
  onSort: (key: SortKey) => void;
}) {
  const totals = rows.reduce((acc, r) => ({ count: acc.count + r.count, value: acc.value + r.value }), {
    count: 0,
    value: 0,
  });
  return (
    <div className="relative max-h-[560px] overflow-auto rounded-xl border border-line-soft">
      <table className="w-full border-collapse font-sans text-sm tabular-nums max-[640px]:min-w-[560px]">
        <colgroup>
          <col className="w-[31%]" />
          <col className="w-[23%]" />
          <col className="w-[23%]" />
          <col className="w-[23%]" />
        </colgroup>
        <thead className="sticky top-0 z-10 bg-muted shadow-[inset_0_-1px_0_var(--border)]">
          <tr>
            {COLUMNS.map((col) => {
              const active = sort.key === col.key;
              const Icon = !active ? ChevronsUpDown : sort.dir === "asc" ? ArrowUp : ArrowDown;
              return (
                <th
                  key={col.key}
                  scope="col"
                  aria-sort={active ? (sort.dir === "asc" ? "ascending" : "descending") : "none"}
                  className={cn("h-10 px-5 font-normal", col.align === "right" ? "text-right" : "text-left")}
                >
                  <button
                    type="button"
                    onClick={() => onSort(col.key)}
                    className={cn(
                      "inline-flex items-center gap-1 rounded text-[11px] font-semibold tracking-[0.04em] uppercase transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-primary",
                      col.align === "right" && "flex-row-reverse",
                      active ? "text-foreground" : "text-muted-foreground",
                    )}
                  >
                    {col.key === "start" ? heading : col.label}
                    <Icon className={cn("size-3.5", !active && "opacity-40")} aria-hidden />
                  </button>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.start}
              className="h-[52px] border-b border-line-soft transition-colors last:border-b-0 even:bg-muted/40 hover:bg-primary-soft/50"
            >
              <td className="px-5 whitespace-nowrap">
                <p className="font-medium text-foreground">{row.label}</p>
                <p className={cn("text-xs", row.weekend ? "font-medium text-orange-strong" : "text-muted-foreground")}>
                  {row.sublabel}
                </p>
              </td>
              <td className="px-5 text-right font-medium text-foreground">
                {Math.round(row.count).toLocaleString("en-US")}
              </td>
              <td className="px-5 text-right font-semibold whitespace-nowrap text-foreground">
                {formatEtb2(row.value)}
              </td>
              <td className="px-5 text-right whitespace-nowrap text-muted-foreground">{formatEtb(row.avgTicket)}</td>
              {/* Failed / reversed and Success are hidden for now.
              <td className="px-5 text-right text-foreground">{Math.round(row.failed).toLocaleString("en-US")}</td>
              <td className="px-5 text-right">{(row.successRate * 100).toFixed(1)}%</td> */}
            </tr>
          ))}
        </tbody>
        <tfoot className="sticky bottom-0 z-10 bg-card shadow-[inset_0_1px_0_var(--border)]">
          <tr className="h-12 font-semibold text-foreground">
            <td className="px-5">
              Total{" "}
              <span className="text-xs font-normal text-muted-foreground">
                · {rows.length} {heading.toLowerCase()}
                {rows.length === 1 ? "" : "s"}
              </span>
            </td>
            <td className="px-5 text-right">{Math.round(totals.count).toLocaleString("en-US")}</td>
            <td className="px-5 text-right whitespace-nowrap">{formatEtb2(totals.value)}</td>
            <td className="px-5 text-right whitespace-nowrap text-muted-foreground">
              {formatEtb(totals.count ? totals.value / totals.count : 0)}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

interface ChartRow {
  /** Axis label; the tooltip uses the full label. */
  label: string;
  tooltip: string;
  count: number;
  successRate: number;
  weekend: boolean;
}

function DayChart({ rows, granularity }: { rows: PeriodRow[]; granularity: Granularity }) {
  const isPhone = useMediaQuery("(max-width: 560px)");
  const reducedMotion = useMediaQuery("(prefers-reduced-motion: reduce)");
  const isDay = granularity === "day";

  const data: ChartRow[] = rows.map((r) => ({
    label: granularity === "week" ? formatShortDate(r.start) : r.label,
    tooltip: r.label,
    count: r.count,
    successRate: r.successRate,
    weekend: r.weekend,
  }));
  const yMax = niceAxisMax(Math.max(0, ...data.map((d) => d.count)) * 1.08);
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((f) => f * yMax);
  const labelCount = isPhone ? 5 : 10;
  const xInterval = data.length <= labelCount ? 0 : Math.ceil(data.length / labelCount) - 1;
  const chartLabel = isDay
    ? "Daily transactions bar chart; weekends in orange"
    : `${granularity === "week" ? "Weekly" : "Monthly"} transactions bar chart`;

  return (
    <div>
      <div className="h-[300px] w-full" role="img" aria-label={chartLabel}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid stroke="var(--line-soft)" vertical={false} />
            <XAxis
              dataKey="label"
              interval={xInterval}
              tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
              axisLine={false}
              tickLine={false}
              tickMargin={8}
            />
            <YAxis
              domain={[0, yMax]}
              ticks={yTicks}
              tickFormatter={(v: number) => formatNumber(v)}
              tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
              axisLine={false}
              tickLine={false}
              width={44}
            />
            <Tooltip cursor={{ fill: "var(--muted)" }} content={(props) => <DayTooltip {...props} />} />
            <Bar
              dataKey="count"
              radius={[4, 4, 0, 0]}
              maxBarSize={isDay ? 28 : 64}
              isAnimationActive={!reducedMotion}
              animationDuration={700}
              animationEasing="ease-out"
            >
              {data.map((d) => (
                <Cell key={d.tooltip} fill={d.weekend ? "var(--orange)" : "var(--primary)"} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      {isDay && (
        <div className="mt-3 flex items-center justify-center gap-5 text-[13px] text-muted-foreground">
          <span className="inline-flex items-center gap-2">
            <span className="size-2.5 rounded-[3px] bg-primary" aria-hidden />
            Weekday
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="size-2.5 rounded-[3px] bg-orange" aria-hidden />
            Weekend
          </span>
        </div>
      )}
    </div>
  );
}

function DayTooltip({ active, payload }: { active?: boolean; payload?: ReadonlyArray<{ payload?: unknown }> }) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload as ChartRow;
  return (
    <div className="rounded-lg bg-[#14212b] px-3 py-2 text-xs text-white shadow-lg tabular-nums">
      {row.tooltip}: {Math.round(row.count).toLocaleString("en-US")} transactions
      {/* Success is hidden for now: , {(row.successRate * 100).toFixed(1)}% success */}
    </div>
  );
}
