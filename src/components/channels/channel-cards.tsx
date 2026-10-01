"use client";

import { Skeleton } from "@/components/ui/skeleton";
import {
  SLOW_LATENCY_MS,
  formatEtb2,
  sortChannels,
  type ChannelRanks,
  type ChannelStat,
  type ChannelsView,
  type RankMetric,
} from "@/lib/channels";
import { formatCompactNumber } from "@/lib/format";
import { formatEtb } from "@/lib/overview";
import { cn } from "@/lib/utils";

const TOP_COUNT = 5;

/** Same shell as the Overview KPI cards; three subgrid rows keep titles, numbers and details aligned. */
const CARD_CLASS =
  "row-span-3 grid grid-rows-subgrid gap-y-1.5 rounded-2xl border border-border bg-card px-[22px] pt-5 pb-[22px] max-[620px]:p-[18px]";

/** How the caption above the top 5 describes each ranking. */
const RANK_CAPTION: Record<RankMetric, string> = {
  transactions: "most transactions",
  value: "highest value",
  success: "highest success rate",
  latency: "slowest response time",
};

const GRID_CLASS =
  "grid grid-cols-1 gap-3 min-[561px]:grid-cols-2 min-[901px]:grid-cols-3 min-[1181px]:grid-cols-4";

function Latency({ ms }: { ms: number }) {
  const slow = ms > SLOW_LATENCY_MS;
  return (
    <span className={cn(slow && "font-medium text-orange-strong")}>
      {Math.round(ms)} ms
      {slow && (
        <span className="sr-only"> (slow, over {SLOW_LATENCY_MS} ms)</span>
      )}
    </span>
  );
}

function StatCard({
  title,
  value,
  detail,
}: {
  title: string;
  value: React.ReactNode;
  detail: React.ReactNode;
}) {
  return (
    <div className={CARD_CLASS}>
      <p className="text-base font-semibold text-foreground">{title}</p>
      <p className="text-[32px] leading-tight font-bold whitespace-nowrap text-primary-display tabular-nums max-[1640px]:text-[28px] max-[620px]:text-2xl">
        {value}
      </p>
      <p className="text-[15px] text-muted-foreground tabular-nums max-[620px]:text-[13px]">
        {detail}
      </p>
    </div>
  );
}

export function ChannelCardsSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className={GRID_CLASS}>
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className={CARD_CLASS}>
          <Skeleton className="h-5 w-28" />
          <Skeleton className="h-9 w-36" />
          <Skeleton className="h-4 w-40" />
        </div>
      ))}
    </div>
  );
}

/** All-channels view: only the top 5 by the chosen metric; pick a platform to see any other. */
export function ChannelRankingGrid({
  stats,
  rankBy,
}: {
  stats: ChannelStat[];
  rankBy: RankMetric;
}) {
  const top = sortChannels(stats, rankBy).slice(0, TOP_COUNT);

  return (
    <section aria-labelledby="top-channels-caption" className="space-y-2.5">
      <p
        id="top-channels-caption"
        className="text-[13px] text-muted-foreground"
      >
        Top {top.length} of {stats.length} channels by{" "}
        <span className="font-semibold text-foreground">
          {RANK_CAPTION[rankBy]}
        </span>
      </p>
      <div className={GRID_CLASS}>
        {top.map((s) => (
          <StatCard
            key={s.channel}
            title={s.name}
            value={formatEtb2(s.value)}
            detail={
              <>
                {formatCompactNumber(s.count)} transactions
                {rankBy === "success" &&
                  `, ${(s.successRate * 100).toFixed(1)}% success`}
                {rankBy === "latency" && (
                  <>
                    , <Latency ms={s.avgLatencyMs} />
                  </>
                )}
              </>
            }
          />
        ))}
      </div>
    </section>
  );
}

/** Single-channel view: six cards about one channel. */
export function ChannelFocusGrid({
  selected,
  platform,
}: {
  selected: NonNullable<ChannelsView["selected"]>;
  platform: ChannelsView["platform"];
}) {
  return (
    <div className={GRID_CLASS}>
      <StatCard
        title="Total value"
        value={formatEtb2(selected.value)}
        detail={`Avg ${formatEtb(selected.avgTicket)} per transaction`}
      />
      <StatCard
        title="Transactions"
        value={formatCompactNumber(selected.count)}
        detail={`≈ ${formatCompactNumber(selected.perDay)} per day`}
      />
      <StatCard
        title="Success rate"
        value={`${(selected.successRate * 100).toFixed(1)}%`}
        detail={`Failure ${((1 - selected.successRate) * 100).toFixed(1)}%`}
      />
      <StatCard
        title="Share of total"
        value={`${(selected.share * 100).toFixed(1)}%`}
        detail="of all transactions"
      />
      <StatCard
        title="Avg ticket"
        value={formatEtb(selected.avgTicket)}
        detail={`Platform average ${formatEtb(platform.avgTicket)}`}
      />
      <StatCard
        title="Avg latency"
        value={<Latency ms={selected.avgLatencyMs} />}
        detail={`Platform average ${Math.round(platform.avgLatencyMs)} ms`}
      />
    </div>
  );
}

export function RankChips({
  ranks,
  total,
}: {
  ranks: ChannelRanks;
  total: number;
}) {
  const chips = [
    { rank: ranks.transactions, label: "by transactions" },
    { rank: ranks.value, label: "by value" },
    { rank: ranks.success, label: "by success rate" },
    { rank: ranks.fastest, label: "fastest" },
  ];
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="mr-1 text-[13px] font-medium text-muted-foreground">
        Among {total} channels
      </span>
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
