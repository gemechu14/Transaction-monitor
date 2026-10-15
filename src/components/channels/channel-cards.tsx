"use client";

import {
  sortSources,
  type LiveRankMetric,
  type SourceRanks,
  type SourceStat,
} from "@/lib/channels";
import { formatAmountValue, formatNumber } from "@/lib/format";
import { formatEtb } from "@/lib/overview";
import { cn } from "@/lib/utils";

const TOP_COUNT = 5;

/** Same shell as the Overview KPI cards; three subgrid rows keep titles, numbers and details aligned. */
const CARD_CLASS =
  "@container min-w-0 row-span-3 grid grid-rows-subgrid gap-y-1.5 rounded-2xl border border-border bg-card px-[22px] pt-5 pb-[22px] max-[620px]:p-[18px]";

const TITLE_CLASS = "text-base font-semibold text-foreground";
// Full numbers are long ("ETB 2,232,593,350.43"), so the size follows the card width (up to 32px) and always fits.
const VALUE_CLASS =
  "text-[length:min(32px,8cqi)] leading-tight font-bold whitespace-nowrap text-primary-display tabular-nums";
const DETAIL_CLASS = "text-[15px] text-muted-foreground tabular-nums max-[620px]:text-[13px]";

/** How the caption above the top 5 describes each ranking. */
const RANK_CAPTION: Record<LiveRankMetric, string> = {
  value: "highest value",
  transactions: "most transactions",
  avgTicket: "highest average ticket",
  // success: "highest success rate",
  // latency: "slowest response time",
};

const GRID_CLASS =
  "grid grid-cols-1 gap-3 min-[561px]:grid-cols-2 min-[901px]:grid-cols-3 min-[1181px]:grid-cols-4";

/** Cards in the single-source view. */
export const FOCUS_CARD_COUNT = 4;

// Latency styling, for when the API returns response times:
// function Latency({ ms }: { ms: number }) {
//   const slow = ms > SLOW_LATENCY_MS;
//   return (
//     <span className={cn(slow && "font-medium text-orange-strong")}>
//       {Math.round(ms)} ms
//       {slow && <span className="sr-only"> (slow, over {SLOW_LATENCY_MS} ms)</span>}
//     </span>
//   );
// }

function StatCard({
  title,
  unit,
  value,
  detail,
}: {
  title: string;
  /** Currency of the value, shown after the title, e.g. "ETB". */
  unit?: string;
  value: React.ReactNode;
  detail: React.ReactNode;
}) {
  return (
    <div className={CARD_CLASS}>
      <p className={TITLE_CLASS}>
        {title}
        {unit && <span className="font-normal text-muted-foreground"> ({unit})</span>}
      </p>
      <p className={`kpi-reveal ${VALUE_CLASS}`}>{value}</p>
      <p className={`kpi-reveal ${DETAIL_CLASS}`} style={{ animationDelay: "60ms" }}>
        {detail}
      </p>
    </div>
  );
}

/** A shimmer bar inside an invisible line of the real type, so heights match exactly. */
function ShimmerLine({ className, barClassName, delay }: { className: string; barClassName: string; delay: string }) {
  return (
    <p className={cn("relative", className)}>
      <span className="invisible">0</span>
      <span
        className={cn("skeleton-shimmer absolute top-1/2 left-0 -translate-y-1/2", barClassName)}
        style={{ animationDelay: delay }}
      />
    </p>
  );
}

/**
 * Mirrors either view: `ranking` has the caption above the top 5, otherwise it's
 * the single-source cards with the rank chips below.
 */
export function ChannelCardsSkeleton({ ranking }: { ranking: boolean }) {
  const count = ranking ? TOP_COUNT : FOCUS_CARD_COUNT;
  return (
    <div className={ranking ? "space-y-2.5" : "flex flex-col-reverse gap-4"} aria-busy="true">
      {ranking ? (
        <ShimmerLine className="text-[13px]" barClassName="h-[0.85em] w-56 rounded-full" delay="0ms" />
      ) : (
        <div className="flex h-[30px] items-center gap-2">
          {[112, 120, 136, 128].map((width, index) => (
            <span key={index} className="skeleton-shimmer h-[30px] rounded-full" style={{ width }} />
          ))}
        </div>
      )}
      <div className={GRID_CLASS}>
        {Array.from({ length: count }).map((_, index) => {
          const delay = `${index * 140}ms`;
          return (
            <div key={index} className={CARD_CLASS}>
              <ShimmerLine className={TITLE_CLASS} barClassName="h-[0.85em] w-28 rounded-full" delay={delay} />
              <ShimmerLine className={VALUE_CLASS} barClassName="h-[0.8em] w-[58%] max-w-44 rounded-lg" delay={delay} />
              <ShimmerLine className={DETAIL_CLASS} barClassName="h-[0.8em] w-[72%] max-w-56 rounded-full" delay={delay} />
            </div>
          );
        })}
      </div>
      <span className="sr-only">Loading channel figures</span>
    </div>
  );
}

/** All-sources view: only the top 5 by the chosen metric; pick a source to see any other. */
export function ChannelRankingGrid({ stats, rankBy }: { stats: SourceStat[]; rankBy: LiveRankMetric }) {
  const top = sortSources(stats, rankBy).slice(0, TOP_COUNT);

  return (
    <section aria-labelledby="top-channels-caption" className="space-y-2.5">
      <p id="top-channels-caption" className="text-[13px] text-muted-foreground">
        Top {top.length} of {stats.length} channels by{" "}
        <span className="font-semibold text-foreground">{RANK_CAPTION[rankBy]}</span>
      </p>
      <div className={GRID_CLASS}>
        {top.map((s) => (
          <StatCard
            key={s.source}
            title={s.name}
            unit="ETB"
            value={formatAmountValue(rankBy === "avgTicket" ? s.avgTicket : s.value)}
            detail={
              rankBy === "avgTicket"
                ? `per transaction, ${formatNumber(s.count)} transactions`
                : `${formatNumber(s.count)} transactions`
            }
          />
        ))}
      </div>
    </section>
  );
}

/** Single-source view: cards about one source. */
export function ChannelFocusGrid({
  selected,
  platform,
  periodDays,
}: {
  selected: SourceStat;
  platform: { avgTicket: number };
  periodDays: number;
}) {
  return (
    <div className={GRID_CLASS}>
      <StatCard
        title="Total value (ETB)"
        value={formatAmountValue(selected.value)}
        detail={`${(selected.valueShare * 100).toFixed(1)}% of all value`}
      />
      <StatCard
        title="Transactions"
        value={formatNumber(selected.count)}
        detail={`≈ ${formatNumber(periodDays ? selected.count / periodDays : 0)} per day`}
      />
      {/* Success rate and latency need figures the API doesn't return yet.
      <StatCard
        title="Success rate"
        value={`${(selected.successRate * 100).toFixed(1)}%`}
        detail={`Failure ${((1 - selected.successRate) * 100).toFixed(1)}%`}
      /> */}
      <StatCard
        title="Share of total"
        value={`${(selected.share * 100).toFixed(1)}%`}
        detail="of all transactions"
      />
      <StatCard
        title="Avg ticket (ETB)"
        value={formatAmountValue(selected.avgTicket)}
        detail={`All sources average ${formatEtb(platform.avgTicket)}`}
      />
      {/* <StatCard
        title="Avg latency"
        value={<Latency ms={selected.avgLatencyMs} />}
        detail={`Platform average ${Math.round(platform.avgLatencyMs)} ms`}
      /> */}
    </div>
  );
}

export function RankChips({ ranks, total }: { ranks: SourceRanks; total: number }) {
  const chips = [
    { rank: ranks.value, label: "by value" },
    { rank: ranks.transactions, label: "by transactions" },
    { rank: ranks.avgTicket, label: "by avg ticket" },
    // { rank: ranks.success, label: "by success rate" },
    // { rank: ranks.fastest, label: "fastest" },
  ];
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="mr-1 text-[13px] font-medium text-muted-foreground">Among {total} channels</span>
      {chips.map((chip) => (
        <span
          key={chip.label}
          className={cn(
            "inline-flex h-[30px] items-center rounded-full border px-3 text-[13px] font-medium tabular-nums",
            chip.rank === 1
              ? "border-transparent bg-primary-soft text-primary-strong"
              : "border-line-soft bg-muted text-foreground",
          )}
        >
          #{chip.rank} {chip.label}
        </span>
      ))}
    </div>
  );
}
