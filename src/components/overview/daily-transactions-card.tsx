"use client";

import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Banknote, Receipt } from "lucide-react";

import { SectionCard } from "@/components/overview/section-card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useMediaQuery } from "@/hooks/use-media-query";
import { formatCompactNumber } from "@/lib/format";
import { formatEtb, formatLongDate, formatShortDate, niceAxisMax, type DailyPoint } from "@/lib/overview";

type Metric = "count" | "value";

const METRIC_ITEMS: Record<Metric, string> = { value: "Amount", count: "Transactions" };

interface Row {
  date: string;
  label: string;
  value: number;
}

export function DailyTransactionsCard({
  series,
  subtitle,
  isLoading,
}: {
  series: DailyPoint[];
  subtitle: string;
  isLoading?: boolean;
}) {
  const [metric, setMetric] = useState<Metric>("value");
  // Draw the line in once, on first load only.
  const [animate, setAnimate] = useState(true);
  const reducedMotion = useMediaQuery("(prefers-reduced-motion: reduce)");
  const isPhone = useMediaQuery("(max-width: 620px)");

  const rows = useMemo<Row[]>(
    () =>
      series.map((d) => ({
        date: d.date,
        label: formatShortDate(d.date),
        value: metric === "count" ? d.count : d.value,
      })),
    [series, metric],
  );

  const format = (value: number) =>
    metric === "count" ? formatCompactNumber(value) : formatEtb(value);

  const total = rows.reduce((acc, r) => acc + r.value, 0);
  const average = rows.length ? total / rows.length : 0;
  const busiest = rows.reduce<Row | undefined>((best, r) => (!best || r.value > best.value ? r : best), undefined);
  const quietest = rows.reduce<Row | undefined>((low, r) => (!low || r.value < low.value ? r : low), undefined);

  const yMax = niceAxisMax((busiest?.value ?? 0) * 1.08);
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((f) => f * yMax);
  const xLabelCount = isPhone ? 5 : 8;
  const xInterval = rows.length <= xLabelCount ? 0 : Math.ceil(rows.length / xLabelCount) - 1;

  return (
    <SectionCard
      title="Daily transactions"
      description={subtitle}
      actions={
        <Select items={METRIC_ITEMS} value={metric} onValueChange={(value) => setMetric(value as Metric)}>
          <SelectTrigger aria-label="Chart metric" className="h-9 w-40 rounded-[10px] bg-card px-3 text-[13px] font-medium">
            {metric === "value" ? (
              <Banknote className="size-4 text-primary-strong" />
            ) : (
              <Receipt className="size-4 text-primary-strong" />
            )}
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(METRIC_ITEMS) as Metric[]).map((m) => (
              <SelectItem key={m} value={m}>
                {METRIC_ITEMS[m]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      }
    >
      {isLoading ? (
        <Skeleton className="h-[260px] w-full" />
      ) : rows.length === 0 ? (
        <div className="flex h-[260px] items-center justify-center rounded-xl bg-muted text-sm text-muted-foreground">
          No data in this period. Data is available from 1 Sep 2026.
        </div>
      ) : (
        <>
          <div className="h-[260px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={rows} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="daily-area" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.22} />
                    <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
                  </linearGradient>
                </defs>
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
                  tickFormatter={format}
                  tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                  axisLine={false}
                  tickLine={false}
                  width={metric === "count" ? 44 : 70}
                />
                <Tooltip
                  cursor={{ stroke: "var(--muted-foreground)", strokeDasharray: "4 4" }}
                  content={(props) => <DailyTooltip {...props} metric={metric} />}
                />
                <ReferenceLine
                  y={average}
                  stroke="var(--orange)"
                  strokeWidth={1.5}
                  strokeDasharray="5 4"
                  label={(props: { viewBox?: { x: number; y: number; width: number } }) => (
                    <AverageLabel viewBox={props.viewBox} text={`Avg ${format(average)}`} />
                  )}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="var(--primary)"
                  strokeWidth={2.6}
                  fill="url(#daily-area)"
                  dot={rows.length === 1 ? { r: 5, fill: "var(--primary)", strokeWidth: 0 } : false}
                  activeDot={{ r: 5, fill: "#ffffff", stroke: "var(--primary)", strokeWidth: 2.5 }}
                  isAnimationActive={animate && !reducedMotion}
                  animationDuration={1100}
                  animationEasing="ease-out"
                  onAnimationEnd={() => setAnimate(false)}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <p className="mt-4 text-[13px] text-muted-foreground tabular-nums">
            Total <span className="font-semibold text-foreground">{format(total)}</span>
            {" · "}Daily average <span className="font-semibold text-foreground">{format(average)}</span>
            {busiest && rows.length > 1 && (
              <>
                {" · "}Busiest day <span className="font-semibold text-foreground">{busiest.label}</span>
                {" · "}Quietest day <span className="font-semibold text-foreground">{quietest?.label}</span>
              </>
            )}
          </p>
        </>
      )}
    </SectionCard>
  );
}

function AverageLabel({
  viewBox,
  text,
}: {
  viewBox?: { x: number; y: number; width: number };
  text: string;
}) {
  if (!viewBox) return null;
  const width = text.length * 6.4 + 16;
  const x = viewBox.x + viewBox.width - width;
  return (
    <g>
      <rect
        x={x}
        y={viewBox.y - 11}
        width={width}
        height={22}
        rx={11}
        fill="var(--orange-soft)"
        stroke="var(--orange)"
      />
      <text
        x={x + width / 2}
        y={viewBox.y + 4}
        textAnchor="middle"
        fontSize={11}
        fontWeight={600}
        fill="var(--orange-strong)"
      >
        {text}
      </text>
    </g>
  );
}

function DailyTooltip({
  active,
  payload,
  metric,
}: {
  active?: boolean;
  payload?: ReadonlyArray<{ payload?: unknown }>;
  metric: Metric;
}) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload as Row;
  return (
    <div className="rounded-lg bg-[#14212b] px-3 py-2 text-xs text-white shadow-lg tabular-nums">
      <p className="text-white/70">{formatLongDate(row.date)}</p>
      <p className="font-semibold">
        {metric === "count"
          ? `${Math.round(row.value).toLocaleString("en-US")} transactions`
          : formatEtb(row.value)}
      </p>
    </div>
  );
}
