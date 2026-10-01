"use client";

import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, CalendarDays, ChartColumn, ChevronsUpDown, Download, Table } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { SectionCard } from "@/components/overview/section-card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useMediaQuery } from "@/hooks/use-media-query";
import {
  LOW_SUCCESS_RATE,
  availableGranularities,
  formatEtb2,
  groupDays,
  type DayRow,
  type Granularity,
  type PeriodRow,
} from "@/lib/channels";
import { formatCompactNumber } from "@/lib/format";
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
  { key: "count", label: "Transactions" },
  { key: "value", label: "Value", align: "right" },
  { key: "avgTicket", label: "Avg ticket", align: "right" },
  { key: "failed", label: "Failed / reversed", align: "right" },
  { key: "successRate", label: "Success", align: "right" },
];

const TRIGGER_CLASS = "h-9 rounded-[10px] bg-card px-3 text-[13px] font-medium";

function sortRows(rows: PeriodRow[], key: SortKey, dir: SortDir): PeriodRow[] {
  const sorted = [...rows].sort((a, b) =>
    key === "start" ? a.start.localeCompare(b.start) : a[key] - b[key],
  );
  return dir === "asc" ? sorted : sorted.reverse();
}

function downloadCsv(rows: PeriodRow[], granularity: Granularity) {
  const isDay = granularity === "day";
  const header = [
    ...(isDay ? ["Date", "Day"] : ["Start date", "End date", "Days"]),
    "Transactions",
    "Value (ETB)",
    "Avg ticket (ETB)",
    "Failed",
    "Success rate (%)",
  ];
  const lines = rows.map((r) =>
    [
      ...(isDay ? [r.start, r.sublabel.split(",")[0]] : [r.start, r.end, r.days]),
      Math.round(r.count),
      r.value.toFixed(2),
      r.avgTicket.toFixed(2),
      Math.round(r.failed),
      (r.successRate * 100).toFixed(2),
    ].join(","),
  );
  const blob = new Blob([[header.join(","), ...lines].join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${GRANULARITY[granularity].file}-transactions.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

export function DayByDayCard({
  rows,
  platformLabel,
  periodDays,
  note,
  isLoading,
}: {
  rows: DayRow[];
  platformLabel: string;
  /** Length of the selected period; decides whether week and month grouping are offered. */
  periodDays: number;
  /** Appended to the subtitle, e.g. when the period starts before the data does. */
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
      description={`${platformLabel}, each ${meta.word} in the selected period${note ? ` ${note}` : ""}`}
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
          <button
            type="button"
            onClick={() => downloadCsv(sorted, active)}
            disabled={!rows.length}
            className="inline-flex h-9 items-center gap-1.5 rounded-[10px] border border-border px-3 text-[13px] font-medium text-foreground transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-primary disabled:opacity-50"
          >
            <Download className="size-4 text-muted-foreground" aria-hidden />
            CSV
          </button>
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
  return (
    <div className="relative max-h-[560px] overflow-auto rounded-xl border border-line-soft">
      <table className="w-full border-collapse text-sm tabular-nums max-[900px]:min-w-[760px]">
        <thead className="sticky top-0 z-10 bg-card shadow-[inset_0_-1px_0_var(--border)]">
          <tr>
            {COLUMNS.map((col) => {
              const active = sort.key === col.key;
              const Icon = !active ? ChevronsUpDown : sort.dir === "asc" ? ArrowUp : ArrowDown;
              return (
                <th
                  key={col.key}
                  scope="col"
                  aria-sort={active ? (sort.dir === "asc" ? "ascending" : "descending") : "none"}
                  className={cn("h-11 px-4 font-normal", col.align === "right" ? "text-right" : "text-left")}
                >
                  <button
                    type="button"
                    onClick={() => onSort(col.key)}
                    className={cn(
                      "inline-flex items-center gap-1 rounded text-xs font-semibold transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-primary",
                      active ? "text-foreground" : "text-muted-foreground",
                    )}
                  >
                    {col.key === "start" ? heading : col.label}
                    <Icon className={cn("size-3.5", !active && "opacity-50")} aria-hidden />
                  </button>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const low = row.successRate < LOW_SUCCESS_RATE;
            return (
              <tr
                key={row.start}
                className="h-[52px] border-b border-line-soft transition-colors last:border-b-0 hover:bg-muted/70"
              >
                <td className="px-4 whitespace-nowrap">
                  <p className="font-semibold text-foreground">{row.label}</p>
                  <p className={cn("text-xs", row.weekend ? "font-medium text-orange-strong" : "text-muted-foreground")}>
                    {row.sublabel}
                  </p>
                </td>
                <td className="px-4 font-semibold text-foreground">{formatCompactNumber(row.count)}</td>
                <td className="px-4 text-right font-medium whitespace-nowrap text-foreground">
                  {formatEtb2(row.value)}
                </td>
                <td className="px-4 text-right whitespace-nowrap text-muted-foreground">{formatEtb(row.avgTicket)}</td>
                <td className="px-4 text-right text-foreground">{Math.round(row.failed).toLocaleString("en-US")}</td>
                <td className="px-4 text-right">
                  <span
                    className={cn(
                      "inline-flex h-6 items-center gap-1 rounded-full px-2.5 text-xs font-semibold",
                      low ? "bg-orange-soft text-orange-strong" : "bg-primary-soft text-primary-strong",
                    )}
                  >
                    {low && <ArrowDown className="size-3" aria-hidden />}
                    {(row.successRate * 100).toFixed(1)}%
                    {low && <span className="sr-only"> (below {(LOW_SUCCESS_RATE * 100).toFixed(1)}%)</span>}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
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
              tickFormatter={(v: number) => formatCompactNumber(v)}
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
      {row.tooltip}: {Math.round(row.count).toLocaleString("en-US")} transactions,{" "}
      {(row.successRate * 100).toFixed(1)}% success
    </div>
  );
}
