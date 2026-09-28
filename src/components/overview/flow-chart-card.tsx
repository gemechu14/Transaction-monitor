"use client";

import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
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
import { NEUTRAL_BORDER, NEUTRAL_TEXT } from "@/config/colors";
import { formatDateLabel, formatHourLabel } from "@/lib/date";
import { formatCompactNumber, formatCurrencyCompact } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { TransactionTrendPoint } from "@/types/api";

const INCOMING_COLOR = "#00ADEF";
const OUTGOING_COLOR = "#F79009";
const OUTGOING_FILL_COLOR = "#98A2B3";

type ChartType = "area" | "line" | "bar" | "stacked-area" | "scatter";
type Metric = "count" | "amount";

const CHART_TYPE_OPTIONS: { value: ChartType; label: string }[] = [
  { value: "area", label: "Area (trend)" },
  { value: "line", label: "Line" },
  { value: "bar", label: "Grouped bars" },
  { value: "stacked-area", label: "Stacked area" },
  { value: "scatter", label: "X/Y scatter (in vs out)" },
];

const CHART_TYPE_ITEMS: Record<string, string> = Object.fromEntries(
  CHART_TYPE_OPTIONS.map((option) => [option.value, option.label]),
);

interface Row {
  timestamp: string;
  label: string;
  incoming: number;
  outgoing: number;
}

export type FlowDirection = "both" | "in" | "out";

export function FlowChartCard({
  data,
  direction = "both",
  isLoading,
}: {
  data: TransactionTrendPoint[];
  direction?: FlowDirection;
  isLoading?: boolean;
}) {
  const [chartType, setChartType] = useState<ChartType>("area");
  const [metric, setMetric] = useState<Metric>("count");

  const rows = useMemo<Row[]>(
    () =>
      data.map((point) => ({
        timestamp: point.timestamp,
        label: point.timestamp.includes("T")
          ? formatHourLabel(point.timestamp)
          : formatDateLabel(point.timestamp),
        incoming: metric === "count" ? point.incomingVolume : point.incomingValue,
        outgoing: metric === "count" ? point.outgoingVolume : point.outgoingValue,
      })),
    [data, metric],
  );

  const formatValue = (value: number) =>
    metric === "count" ? formatCompactNumber(value) : formatCurrencyCompact(value);

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col items-start gap-3 @lg/card-header:flex-row @lg/card-header:items-center @lg/card-header:justify-between">
          <div>
            <CardTitle>Incoming vs outgoing flow</CardTitle>
            <CardDescription>
              Gateway-routed traffic for the selected platform, direction and period
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Select
              items={CHART_TYPE_ITEMS}
              value={chartType}
              onValueChange={(value) => setChartType(value as ChartType)}
            >
              <SelectTrigger size="sm" className="w-44 border-primary/50 text-black">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CHART_TYPE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
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
                  metric === "count" ? "bg-primary/10 text-primary hover:bg-primary/15" : "text-muted-foreground",
                )}
                onClick={() => setMetric("count")}
              >
                Count
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className={cn(
                  "h-7 px-2.5 text-xs",
                  metric === "amount" ? "bg-primary/10 text-primary hover:bg-primary/15" : "text-muted-foreground",
                )}
                onClick={() => setMetric("amount")}
              >
                Amount
              </Button>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-80 w-full" />
        ) : (
          <div key={chartType} className="h-80 w-full animate-in fade-in slide-in-from-bottom-2 duration-500 ease-out">
            <ResponsiveContainer width="100%" height="100%">
              {renderChart(chartType, rows, formatValue, direction)}
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function renderChart(
  chartType: ChartType,
  rows: Row[],
  formatValue: (value: number) => string,
  direction: "both" | "in" | "out",
) {
  const seriesName = (name: string) => (name === "incoming" ? "Incoming" : "Outgoing");
  const showIncoming = direction !== "out";
  const showOutgoing = direction !== "in";

  if (chartType === "scatter") {
    return (
      <ScatterChart margin={{ top: 8, right: 12, left: 4, bottom: 12 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={NEUTRAL_BORDER} />
        <XAxis
          type="number"
          dataKey="incoming"
          name="Incoming"
          tickFormatter={formatValue}
          tick={{ fontSize: 11, fill: NEUTRAL_TEXT }}
          label={{ value: "Incoming", position: "insideBottom", offset: -6, fontSize: 11, fill: NEUTRAL_TEXT }}
        />
        <YAxis
          type="number"
          dataKey="outgoing"
          name="Outgoing"
          tickFormatter={formatValue}
          tick={{ fontSize: 11, fill: NEUTRAL_TEXT }}
          width={56}
        />
        <Tooltip
          cursor={{ strokeDasharray: "3 3" }}
          contentStyle={{ borderRadius: 8, fontSize: 12, border: `1px solid ${NEUTRAL_BORDER}` }}
          formatter={(value, name) => [formatValue(Number(value)), seriesName(String(name))]}
          labelFormatter={() => ""}
        />
        <Scatter
          data={rows}
          fill={INCOMING_COLOR}
          isAnimationActive
          animationDuration={600}
          animationEasing="ease-out"
        />
      </ScatterChart>
    );
  }

  const tooltip = (
    <Tooltip
      contentStyle={{ borderRadius: 8, fontSize: 12, border: `1px solid ${NEUTRAL_BORDER}` }}
      formatter={(value, name) => [formatValue(Number(value)), seriesName(String(name))]}
    />
  );
  const legend = (
    <Legend
      verticalAlign="bottom"
      height={28}
      iconType="circle"
      formatter={(value) => seriesName(value)}
    />
  );
  const grid = <CartesianGrid strokeDasharray="3 3" stroke={NEUTRAL_BORDER} vertical={false} />;
  const xAxis = (
    <XAxis
      dataKey="label"
      tick={{ fontSize: 11, fill: NEUTRAL_TEXT }}
      axisLine={{ stroke: NEUTRAL_BORDER }}
      tickLine={false}
      minTickGap={24}
    />
  );
  const yAxis = (
    <YAxis
      tickFormatter={formatValue}
      tick={{ fontSize: 11, fill: NEUTRAL_TEXT }}
      axisLine={false}
      tickLine={false}
      width={56}
    />
  );

  if (chartType === "line") {
    return (
      <LineChart data={rows} margin={{ top: 8, right: 12, left: 4, bottom: 0 }}>
        {grid}
        {xAxis}
        {yAxis}
        {tooltip}
        {legend}
        {showIncoming && (
          <Line
            type="monotone"
            dataKey="incoming"
            stroke={INCOMING_COLOR}
            strokeWidth={2}
            dot={false}
            isAnimationActive
            animationDuration={700}
            animationEasing="ease-out"
          />
        )}
        {showOutgoing && (
          <Line
            type="monotone"
            dataKey="outgoing"
            stroke={OUTGOING_COLOR}
            strokeWidth={2}
            dot={false}
            isAnimationActive
            animationDuration={700}
            animationEasing="ease-out"
            animationBegin={120}
          />
        )}
      </LineChart>
    );
  }

  if (chartType === "bar") {
    return (
      <BarChart data={rows} margin={{ top: 8, right: 12, left: 4, bottom: 0 }}>
        {grid}
        {xAxis}
        {yAxis}
        {tooltip}
        {legend}
        {showIncoming && (
          <Bar
            dataKey="incoming"
            fill={INCOMING_COLOR}
            radius={[3, 3, 0, 0]}
            isAnimationActive
            animationDuration={600}
            animationEasing="ease-out"
          />
        )}
        {showOutgoing && (
          <Bar
            dataKey="outgoing"
            fill={OUTGOING_COLOR}
            radius={[3, 3, 0, 0]}
            isAnimationActive
            animationDuration={600}
            animationEasing="ease-out"
            animationBegin={100}
          />
        )}
      </BarChart>
    );
  }

  const stacked = chartType === "stacked-area";
  return (
    <AreaChart data={rows} margin={{ top: 8, right: 12, left: 4, bottom: 0 }}>
      <defs>
        <linearGradient id="flow-incoming" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={INCOMING_COLOR} stopOpacity={0.35} />
          <stop offset="100%" stopColor={INCOMING_COLOR} stopOpacity={0.02} />
        </linearGradient>
        <linearGradient id="flow-outgoing" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={OUTGOING_FILL_COLOR} stopOpacity={0.6} />
          <stop offset="100%" stopColor={OUTGOING_FILL_COLOR} stopOpacity={0.08} />
        </linearGradient>
      </defs>
      {grid}
      {xAxis}
      {yAxis}
      {tooltip}
      {legend}
      {showIncoming && (
        <Area
          type="monotone"
          dataKey="incoming"
          stackId={stacked ? "flow" : undefined}
          stroke={INCOMING_COLOR}
          strokeWidth={2}
          fill="url(#flow-incoming)"
          isAnimationActive
          animationDuration={800}
          animationEasing="ease-out"
        />
      )}
      {showOutgoing && (
        <Area
          type="monotone"
          dataKey="outgoing"
          stackId={stacked ? "flow" : undefined}
          stroke={OUTGOING_COLOR}
          strokeWidth={2}
          fill="url(#flow-outgoing)"
          isAnimationActive
          animationDuration={800}
          animationEasing="ease-out"
          animationBegin={120}
        />
      )}
    </AreaChart>
  );
}
