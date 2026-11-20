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
import {
  AlertTriangle,
  Banknote,
  CalendarClock,
  ChartLine,
  CircleCheck,
  Flame,
  Info,
  type LucideIcon,
  Receipt,
  TrendingDown,
  TrendingUp,
} from "lucide-react";

import { SectionCard } from "@/components/overview/section-card";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useMediaQuery } from "@/hooks/use-media-query";
import {
  buildDailyInsights,
  type InsightSection,
  type InsightTone,
} from "@/lib/daily-insights";
import { formatAxisTick, formatNumber } from "@/lib/format";
import {
  formatEtb,
  formatLongDate,
  formatShortDate,
  niceAxisMax,
  type DailyPoint,
} from "@/lib/overview";
import { cn } from "@/lib/utils";

type Metric = "count" | "value";

const METRIC_ITEMS: Record<Metric, string> = {
  value: "Amount",
  count: "Transactions",
};

interface Row {
  date: string;
  label: string;
  value: number;
  /** Above the high-volume threshold. */
  high: boolean;
}

export function DailyTransactionsCard({
  series,
  subtitle,
  emptyMessage = "No data in this period.",
  isLoading,
}: {
  series: DailyPoint[];
  subtitle: string;
  /** Shown instead of the chart when there are no points, e.g. the API's error details. */
  emptyMessage?: string;
  isLoading?: boolean;
}) {
  const [metric, setMetric] = useState<Metric>("value");
  // Draw the line in once, on first load only.
  const [animate, setAnimate] = useState(true);
  const reducedMotion = useMediaQuery("(prefers-reduced-motion: reduce)");
  const isPhone = useMediaQuery("(max-width: 620px)");

  const format = (value: number) =>
    metric === "count" ? formatNumber(value) : formatEtb(value);

  const analysis = useMemo(
    () =>
      buildDailyInsights(
        series.map((d) => ({
          date: d.date,
          value: metric === "count" ? d.count : d.value,
        })),
        metric === "count" ? formatNumber : formatEtb,
        formatShortDate,
        metric === "count" ? "transactions" : "amount",
      ),
    [series, metric],
  );

  const rows = useMemo<Row[]>(
    () =>
      series.map((d) => ({
        date: d.date,
        label: formatShortDate(d.date),
        value: metric === "count" ? d.count : d.value,
        high: analysis.highDates.has(d.date),
      })),
    [series, metric, analysis],
  );

  const total = rows.reduce((acc, r) => acc + r.value, 0);
  const average = rows.length ? total / rows.length : 0;
  const busiest = rows.reduce<Row | undefined>(
    (best, r) => (!best || r.value > best.value ? r : best),
    undefined,
  );
  const quietest = rows.reduce<Row | undefined>(
    (low, r) => (!low || r.value < low.value ? r : low),
    undefined,
  );

  const yMax = niceAxisMax((busiest?.value ?? 0) * 1.08);
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((f) => f * yMax);
  const xLabelCount = isPhone ? 5 : 8;
  const xInterval =
    rows.length <= xLabelCount ? 0 : Math.ceil(rows.length / xLabelCount) - 1;

  return (
    <SectionCard
      title="Daily transactions"
      description={subtitle}
      actions={
        <>
          {!isLoading && analysis.sections.length > 0 && (
            <InsightsPopover
              sections={analysis.sections}
              metricLabel={METRIC_ITEMS[metric]}
              subtitle={subtitle}
            />
          )}
          <Select
            items={METRIC_ITEMS}
            value={metric}
            onValueChange={(value) => setMetric(value as Metric)}
          >
            <SelectTrigger
              aria-label="Chart metric"
              className="h-9 w-40 rounded-[10px] bg-card px-3 text-[13px] font-medium"
            >
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
        </>
      }
    >
      {isLoading ? (
        <Skeleton className="h-[260px] w-full" />
      ) : rows.length === 0 ? (
        <div className="flex h-[260px] items-center justify-center rounded-xl bg-muted px-6 text-center text-sm text-muted-foreground">
          {emptyMessage}
        </div>
      ) : (
        <>
          {/* The unit sits once above the axis, so the tick labels stay short and never wrap. */}
          <p className="mb-1 text-[11px] font-medium text-muted-foreground">
            {metric === "count" ? "Transactions" : "ETB"}
          </p>
          {/* No focus box around the chart after a click. */}
          <div className="h-[260px] w-full [&_.recharts-surface]:outline-none [&_.recharts-wrapper]:outline-none">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={rows}
                margin={{ top: 8, right: 24, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="daily-area" x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="0%"
                      stopColor="var(--primary)"
                      stopOpacity={0.22}
                    />
                    <stop
                      offset="100%"
                      stopColor="var(--primary)"
                      stopOpacity={0}
                    />
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
                  // Compact ticks ("200M") so they fit at any width; the unit is shown above the
                  // chart, and the tooltip and the line below give full figures.
                  tickFormatter={(value: number) => formatAxisTick(value)}
                  tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                  axisLine={false}
                  tickLine={false}
                  width={44}
                />
                <Tooltip
                  cursor={{
                    stroke: "var(--muted-foreground)",
                    strokeDasharray: "4 4",
                  }}
                  content={(props) => (
                    <DailyTooltip
                      {...props}
                      metric={metric}
                      average={average}
                    />
                  )}
                />
                <ReferenceLine
                  y={average}
                  // Neutral grey: the average is a reference, not a warning.
                  stroke="var(--muted-foreground)"
                  strokeWidth={1.5}
                  strokeDasharray="5 4"
                  label={(props: {
                    viewBox?: { x: number; y: number; width: number };
                  }) => (
                    <AverageLabel
                      viewBox={props.viewBox}
                      text={`Avg ${format(average)}`}
                    />
                  )}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="var(--primary)"
                  strokeWidth={2.6}
                  // Line only: the shaded area under it is off. Use fill="url(#daily-area)" to bring it back.
                  fill="none"
                  dot={
                    rows.length === 1
                      ? { r: 5, fill: "var(--primary)", strokeWidth: 0 }
                      : false
                  }
                  activeDot={{
                    r: 5,
                    fill: "#ffffff",
                    stroke: "var(--primary)",
                    strokeWidth: 2.5,
                  }}
                  isAnimationActive={animate && !reducedMotion}
                  animationDuration={1100}
                  animationEasing="ease-out"
                  onAnimationEnd={() => setAnimate(false)}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <p className="mt-4 text-[13px] text-muted-foreground tabular-nums">
            Total{" "}
            <span className="font-semibold text-foreground">
              {format(total)}
            </span>
            {" · "}Daily average{" "}
            <span className="font-semibold text-foreground">
              {format(average)}
            </span>
            {busiest && rows.length > 1 && (
              <>
                {" · "}Busiest day{" "}
                <span className="font-semibold text-foreground">
                  {busiest.label}
                </span>
                {" · "}Quietest day{" "}
                <span className="font-semibold text-foreground">
                  {quietest?.label}
                </span>
              </>
            )}
          </p>
        </>
      )}
    </SectionCard>
  );
}

const TONES: Record<InsightTone, { icon: LucideIcon; className: string }> = {
  summary: {
    icon: ChartLine,
    className: "bg-primary-soft text-primary-strong",
  },
  high: { icon: Flame, className: "bg-orange-soft text-orange-strong" },
  up: { icon: TrendingUp, className: "bg-primary-soft text-primary-strong" },
  down: { icon: TrendingDown, className: "bg-muted text-foreground" },
  neutral: { icon: CalendarClock, className: "bg-muted text-muted-foreground" },
  warning: {
    icon: AlertTriangle,
    className: "bg-destructive/10 text-destructive",
  },
  ok: { icon: CircleCheck, className: "bg-muted text-muted-foreground" },
};

/** Info icon in the card header; hover or click opens the full written analysis of the chart. */
function InsightsPopover({
  sections,
  metricLabel,
  subtitle,
}: {
  sections: InsightSection[];
  metricLabel: string;
  subtitle: string;
}) {
  return (
    <Popover>
      <PopoverTrigger
        openOnHover
        delay={150}
        closeDelay={200}
        aria-label="What this chart shows"
        className="flex size-9 shrink-0 items-center justify-center rounded-[10px] border border-input bg-card text-muted-foreground transition-colors hover:text-primary-strong focus-visible:outline-2 focus-visible:outline-primary data-popup-open:text-primary-strong"
      >
        <Info className="size-4" />
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-[460px] max-w-[calc(100vw-32px)] p-0"
      >
        <div className="border-b border-line-soft px-4 py-3">
          <p className="text-sm font-semibold text-foreground">
            Chart insights · {metricLabel}
          </p>
          <p className="text-xs text-muted-foreground">
            {subtitle}. Today is excluded until the day is over.
          </p>
        </div>
        <div className="max-h-[min(70vh,560px)] space-y-4 overflow-y-auto px-4 py-3">
          {sections.map((section) => (
            <InsightBlock key={section.id} section={section} />
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function InsightBlock({ section }: { section: InsightSection }) {
  const tone = TONES[section.tone];
  const Icon = tone.icon;
  const max = Math.max(...(section.bars ?? []).map((b) => b.value), 1);
  return (
    <section className="flex gap-3">
      <span
        className={cn(
          "mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg",
          tone.className,
        )}
      >
        <Icon className="size-3.5" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <h3 className="text-[13px] font-semibold text-foreground">
          {section.title}
        </h3>
        <p className="text-xs font-medium text-foreground/80">
          {section.summary}
        </p>
        <ul className="mt-1.5 list-disc space-y-1 pl-4 text-xs leading-relaxed text-muted-foreground tabular-nums marker:text-line-soft">
          {section.points.map((point) => (
            <li key={point}>{point}</li>
          ))}
        </ul>
        {section.bars && (
          <div className="mt-2 space-y-1">
            {section.barsCaption && (
              <p className="text-[11px] font-medium text-muted-foreground">
                {section.barsCaption}
              </p>
            )}
            {section.bars.map((bar, i) => (
              // Index in the key: a 12-month period can show the same month name twice.
              <div
                key={`${bar.label}-${i}`}
                className="grid grid-cols-[72px_1fr_auto] items-center gap-2 text-[11px] tabular-nums"
              >
                <span className="truncate text-muted-foreground">
                  {bar.label}
                </span>
                <span className="h-1.5 overflow-hidden rounded-full bg-muted">
                  <span
                    className={cn(
                      "block h-full rounded-full",
                      bar.highlight ? "bg-orange" : "bg-primary",
                    )}
                    style={{
                      width: `${Math.max(2, (bar.value / max) * 100)}%`,
                    }}
                  />
                </span>
                <span className="text-right font-medium text-foreground">
                  {bar.display}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
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
        fill="var(--muted)"
        stroke="var(--border)"
      />
      <text
        x={x + width / 2}
        y={viewBox.y + 4}
        textAnchor="middle"
        fontSize={11}
        fontWeight={600}
        fill="var(--foreground-2, var(--foreground))"
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
  average,
}: {
  active?: boolean;
  payload?: ReadonlyArray<{ payload?: unknown }>;
  metric: Metric;
  average: number;
}) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload as Row;
  const ratio = average > 0 ? row.value / average : 0;
  return (
    <div className="rounded-lg bg-[#14212b] px-3 py-2 text-xs text-white shadow-lg tabular-nums">
      <p className="text-white/70">{formatLongDate(row.date)}</p>
      <p className="font-semibold">
        {metric === "count"
          ? `${Math.round(row.value).toLocaleString("en-US")} transactions`
          : formatEtb(row.value)}
      </p>
      {row.high && (
        <p className="mt-0.5 text-white/70">
          High volume · {ratio.toFixed(1)}× the average
        </p>
      )}
    </div>
  );
}
