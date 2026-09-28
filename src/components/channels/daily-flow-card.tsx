"use client";

import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown, Download } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { BRAND_COLOR, NEUTRAL_BORDER, NEUTRAL_TEXT } from "@/config/colors";
import { formatDateLabel, formatDayLabel, MONTHS } from "@/lib/date";
import { formatCompactNumber, formatCurrencyCompact, formatPercent } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { ChannelDailyFlow } from "@/types/api";

const INCOMING_COLOR = BRAND_COLOR;
const OUTGOING_COLOR = "#F79009";

type ViewMode = "diagram" | "table";
type Metric = "volume" | "value";
type SuccessSort = "asc" | "desc" | null;
type Granularity = "day" | "week" | "month";

const VIEW_ITEMS: Record<ViewMode, string> = { diagram: "Diagram", table: "Table" };
const GRANULARITY_LABELS: Record<Granularity, string> = {
  day: "Day to day",
  week: "Week to week",
  month: "Month to month",
};
const PERIOD_HEADING: Record<Granularity, string> = { day: "Day", week: "Week", month: "Month" };
const PERIOD_WORD: Record<Granularity, string> = { day: "day", week: "week", month: "month" };

/** Minimum days of data before week/month aggregation is offered — roughly one month and one quarter. */
const WEEK_MIN_DAYS = 28;
const MONTH_MIN_DAYS = 84;
const TABLE_SCROLL_HEIGHT = 420;

interface FlowBucket {
  key: string;
  label: string;
  incomingCount: number;
  outgoingCount: number;
  incomingValue: number;
  outgoingValue: number;
  transactionCount: number;
  /** Fraction 0-1, weighted by transaction count across the bucket. */
  successRate: number;
}

function toBucket(key: string, label: string, rows: ChannelDailyFlow[]): FlowBucket {
  const incomingCount = rows.reduce((acc, r) => acc + r.incomingCount, 0);
  const outgoingCount = rows.reduce((acc, r) => acc + r.outgoingCount, 0);
  const incomingValue = rows.reduce((acc, r) => acc + r.incomingValue, 0);
  const outgoingValue = rows.reduce((acc, r) => acc + r.outgoingValue, 0);
  const transactionCount = rows.reduce((acc, r) => acc + r.transactionCount, 0);
  const successRate = transactionCount
    ? rows.reduce((acc, r) => acc + r.successRate * r.transactionCount, 0) / transactionCount
    : 0;
  return { key, label, incomingCount, outgoingCount, incomingValue, outgoingValue, transactionCount, successRate };
}

function formatMonthLabel(key: string): string {
  const [year, month] = key.split("-").map(Number);
  return `${MONTHS[month - 1]} ${year}`;
}

function aggregateByGranularity(data: ChannelDailyFlow[], granularity: Granularity): FlowBucket[] {
  if (granularity === "day") {
    return data.map((row) => toBucket(row.date, formatDayLabel(row.date), [row]));
  }

  if (granularity === "week") {
    const buckets: FlowBucket[] = [];
    for (let i = 0; i < data.length; i += 7) {
      const chunk = data.slice(i, i + 7);
      const label =
        chunk.length > 1
          ? `${formatDateLabel(chunk[0].date)} – ${formatDateLabel(chunk[chunk.length - 1].date)}`
          : formatDateLabel(chunk[0].date);
      buckets.push(toBucket(chunk[0].date, label, chunk));
    }
    return buckets;
  }

  const groups = new Map<string, ChannelDailyFlow[]>();
  for (const row of data) {
    const key = row.date.slice(0, 7);
    const list = groups.get(key) ?? [];
    list.push(row);
    groups.set(key, list);
  }
  return Array.from(groups.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, rows]) => toBucket(key, formatMonthLabel(key), rows));
}

function downloadDailyFlowCsv(rows: FlowBucket[], granularity: Granularity) {
  const header = [
    PERIOD_HEADING[granularity],
    "Incoming count",
    "Incoming value",
    "Outgoing count",
    "Outgoing value",
    "Total",
    "Net position",
    "Success rate",
  ];
  const lines = rows.map((row) =>
    [
      row.key,
      row.incomingCount,
      row.incomingValue,
      row.outgoingCount,
      row.outgoingValue,
      row.transactionCount,
      row.incomingValue - row.outgoingValue,
      (row.successRate * 100).toFixed(2),
    ].join(","),
  );
  const csv = [header.join(","), ...lines].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `channel-${granularity}-flow.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

export function DailyFlowCard({
  data,
  channelLabel,
  isLoading,
}: {
  data: ChannelDailyFlow[];
  channelLabel: string;
  isLoading?: boolean;
}) {
  const [viewMode, setViewMode] = useState<ViewMode>("table");
  const [metric, setMetric] = useState<Metric>("volume");
  const [successSort, setSuccessSort] = useState<SuccessSort>(null);
  const [granularity, setGranularity] = useState<Granularity>("day");

  const availableGranularities = useMemo<Granularity[]>(() => {
    const options: Granularity[] = ["day"];
    if (data.length >= WEEK_MIN_DAYS) options.push("week");
    if (data.length >= MONTH_MIN_DAYS) options.push("month");
    return options;
  }, [data.length]);

  // Falls back to "day" when the selected range shrinks below the chosen granularity's threshold,
  // without discarding the user's preference — it re-applies automatically if the range grows again.
  const effectiveGranularity = availableGranularities.includes(granularity) ? granularity : "day";

  const buckets = useMemo(
    () => aggregateByGranularity(data, effectiveGranularity),
    [data, effectiveGranularity],
  );

  const chartRows = useMemo(
    () =>
      buckets.map((bucket) => ({
        label: bucket.label,
        incoming: metric === "volume" ? bucket.incomingCount : bucket.incomingValue,
        outgoing: metric === "volume" ? bucket.outgoingCount : bucket.outgoingValue,
      })),
    [buckets, metric],
  );

  const tableRows = useMemo(() => {
    if (!successSort) return buckets;
    const sorted = [...buckets].sort((a, b) => a.successRate - b.successRate);
    return successSort === "asc" ? sorted : sorted.reverse();
  }, [buckets, successSort]);

  const formatValue = (value: number) =>
    metric === "volume" ? formatCompactNumber(value) : formatCurrencyCompact(value);

  const cycleSuccessSort = () => {
    setSuccessSort((prev) => (prev === null ? "desc" : prev === "desc" ? "asc" : null));
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col items-start gap-3 @lg/card-header:flex-row @lg/card-header:items-center @lg/card-header:justify-between">
          <div>
            <CardTitle>{GRANULARITY_LABELS[effectiveGranularity]} incoming vs outgoing</CardTitle>
            <CardDescription>
              {channelLabel} — each {PERIOD_WORD[effectiveGranularity]} in the selected period, split by
              flow direction
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Select
              items={Object.fromEntries(
                availableGranularities.map((g) => [g, GRANULARITY_LABELS[g]]),
              )}
              value={effectiveGranularity}
              onValueChange={(value) => setGranularity(value as Granularity)}
            >
              <SelectTrigger size="sm" className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {availableGranularities.map((g) => (
                  <SelectItem key={g} value={g}>
                    {GRANULARITY_LABELS[g]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              items={VIEW_ITEMS}
              value={viewMode}
              onValueChange={(value) => setViewMode(value as ViewMode)}
            >
              <SelectTrigger size="sm" className="w-28 text-foreground">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(VIEW_ITEMS) as ViewMode[]).map((option) => (
                  <SelectItem key={option} value={option}>
                    {VIEW_ITEMS[option]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex rounded-md border border-border p-0.5">
              <Button
                size="sm"
                variant="ghost"
                className={cn(
                  "h-7 px-2.5 text-xs",
                  metric === "volume"
                    ? "bg-primary/10 text-primary hover:bg-primary/15"
                    : "text-muted-foreground",
                )}
                onClick={() => setMetric("volume")}
              >
                Volume
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className={cn(
                  "h-7 px-2.5 text-xs",
                  metric === "value"
                    ? "bg-primary/10 text-primary hover:bg-primary/15"
                    : "text-muted-foreground",
                )}
                onClick={() => setMetric("value")}
              >
                Value
              </Button>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="h-7 gap-1 px-2.5 text-xs text-muted-foreground"
              onClick={() => downloadDailyFlowCsv(buckets, effectiveGranularity)}
            >
              <Download className="size-3.5" />
              CSV
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-80 w-full" />
        ) : viewMode === "diagram" ? (
          <div className="h-80 w-full animate-in fade-in slide-in-from-bottom-2 duration-500 ease-out">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartRows} margin={{ top: 8, right: 12, left: 4, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={NEUTRAL_BORDER} vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11, fill: NEUTRAL_TEXT }}
                  axisLine={{ stroke: NEUTRAL_BORDER }}
                  tickLine={false}
                  minTickGap={24}
                />
                <YAxis
                  tickFormatter={formatValue}
                  tick={{ fontSize: 11, fill: NEUTRAL_TEXT }}
                  axisLine={false}
                  tickLine={false}
                  width={56}
                />
                <Tooltip
                  contentStyle={{ borderRadius: 8, fontSize: 12, border: `1px solid ${NEUTRAL_BORDER}` }}
                  formatter={(value, name) => [
                    formatValue(Number(value)),
                    name === "incoming" ? "Incoming" : "Outgoing",
                  ]}
                />
                <Legend
                  verticalAlign="bottom"
                  height={28}
                  iconType="circle"
                  formatter={(value) => (value === "incoming" ? "Incoming" : "Outgoing")}
                />
                <Bar
                  dataKey="incoming"
                  fill={INCOMING_COLOR}
                  radius={[3, 3, 0, 0]}
                  isAnimationActive
                  animationDuration={600}
                  animationEasing="ease-out"
                />
                <Bar
                  dataKey="outgoing"
                  fill={OUTGOING_COLOR}
                  radius={[3, 3, 0, 0]}
                  isAnimationActive
                  animationDuration={600}
                  animationEasing="ease-out"
                  animationBegin={100}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div
            className="overflow-y-auto rounded-md border border-border"
            style={{ maxHeight: TABLE_SCROLL_HEIGHT }}
          >
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-card">
                <TableRow className="hover:bg-transparent">
                  <TableHead>{PERIOD_HEADING[effectiveGranularity]}</TableHead>
                  <TableHead className="text-right">Incoming</TableHead>
                  <TableHead className="text-right">Outgoing</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Net position</TableHead>
                  <TableHead className="text-right">
                    <button
                      type="button"
                      onClick={cycleSuccessSort}
                      className="inline-flex items-center gap-1 hover:text-foreground"
                    >
                      Success
                      {successSort === "asc" ? (
                        <ArrowUp className="size-3.5" />
                      ) : successSort === "desc" ? (
                        <ArrowDown className="size-3.5" />
                      ) : (
                        <ArrowUpDown className="size-3.5" />
                      )}
                    </button>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tableRows.map((row) => {
                  const netPosition = row.incomingValue - row.outgoingValue;
                  return (
                    <TableRow key={row.key}>
                      <TableCell className="text-xs text-foreground">{row.label}</TableCell>
                      <TableCell className="text-right">
                        <p className="text-xs text-foreground">
                          {formatCompactNumber(row.incomingCount)}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          {formatCurrencyCompact(row.incomingValue, "ETB", 2)}
                        </p>
                      </TableCell>
                      <TableCell className="text-right">
                        <p className="text-xs text-foreground">
                          {formatCompactNumber(row.outgoingCount)}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          {formatCurrencyCompact(row.outgoingValue, "ETB", 2)}
                        </p>
                      </TableCell>
                      <TableCell className="text-right text-xs text-foreground">
                        {formatCompactNumber(row.transactionCount)}
                      </TableCell>
                      <TableCell className="text-right text-xs text-foreground">
                        {netPosition < 0 ? "-" : ""}
                        {formatCurrencyCompact(Math.abs(netPosition), "ETB", 2)}
                      </TableCell>
                      <TableCell className="text-right text-xs text-primary">
                        {formatPercent(row.successRate, 1)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
