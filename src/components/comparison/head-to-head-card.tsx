"use client";

import { SIDE_DOT_CLASS } from "@/components/comparison/comparison-filter-bar";
import { ShimmerLine } from "@/components/ui/shimmer-line";
import {
  avgPayment,
  formatTransactions,
  gapBetween,
  type Gap,
  type SideFigures,
  type SideKey,
} from "@/lib/comparison";
import { formatAmountValue } from "@/lib/format";
import { cn } from "@/lib/utils";

const SIDE_STYLES: Record<SideKey, { edge: string; tag: string }> = {
  a: { edge: "before:bg-orange", tag: "bg-orange-soft text-orange-strong" },
  b: { edge: "before:bg-primary", tag: "bg-primary-soft text-primary-strong" },
};

const GAP_TEXT: Record<SideKey, string> = { a: "text-orange-strong", b: "text-primary-strong" };

/** Side A panel · the gaps · Side B panel. Stacks with the gaps as a row between the panels at ≤900px. */
export function HeadToHeadCard({
  a,
  b,
  isLoading,
}: {
  a: SideFigures;
  b: SideFigures;
  isLoading?: boolean;
}) {
  const amountGap = gapBetween(a.amount, b.amount);
  const transactionGap = gapBetween(a.transactions, b.transactions);

  return (
    <section className="rounded-2xl border border-border bg-card px-6 py-[22px] max-[620px]:p-[18px]">
      <h2 className="mb-4 text-base font-semibold text-foreground">Head-to-head</h2>
      {/* Loading keeps the real layout and swaps figures for shimmer lines, so nothing shifts. */}
      <div className="grid gap-4 min-[901px]:grid-cols-[1fr_minmax(170px,0.55fr)_1fr]" aria-busy={isLoading || undefined}>
        <SidePanel side="a" figures={a} leads={amountGap.leader === "a"} loading={isLoading} />
        <div className="flex flex-col justify-center gap-5 rounded-[14px] px-2 py-1 max-[900px]:flex-row max-[900px]:justify-around max-[900px]:py-0">
          <GapRow label="Amount gap (ETB)" gap={amountGap} format={formatAmountValue} loading={isLoading} />
          <GapRow label="Transactions gap" gap={transactionGap} format={formatTransactions} loading={isLoading} />
        </div>
        <SidePanel side="b" figures={b} leads={amountGap.leader === "b"} loading={isLoading} />
      </div>
    </section>
  );
}

const NAME_CLASS = "flex items-center gap-2 text-[17px] font-bold text-foreground";
// Full numbers are long ("ETB 2,232,593,350.43"), so the size follows the card width (up to 32px) and always fits.
const AMOUNT_CLASS =
  "text-[length:min(32px,8cqi)] leading-tight font-bold whitespace-nowrap text-foreground tabular-nums";
const STAT_CLASS = "text-lg font-semibold text-foreground tabular-nums";

function SidePanel({
  side,
  figures,
  leads,
  loading,
}: {
  side: SideKey;
  figures: SideFigures;
  leads: boolean;
  loading?: boolean;
}) {
  const avg = avgPayment(figures);
  if (loading) {
    return (
      <div
        className={cn(
          "@container relative min-w-0 overflow-hidden rounded-[14px] border border-line-soft bg-muted px-[22px] pt-6 pb-5 before:absolute before:inset-x-0 before:top-0 before:h-1",
          SIDE_STYLES[side].edge,
        )}
      >
        <ShimmerLine className={NAME_CLASS} barClassName="w-36" />
        <p className="mt-4 text-xs text-muted-foreground">Amount (ETB)</p>
        <ShimmerLine className={AMOUNT_CLASS} barClassName="w-[60%] max-w-52 rounded-lg" delay={80} />
        <div className="mt-4 grid grid-cols-2 gap-4 border-t border-line-soft pt-4">
          <div>
            <p className="text-xs text-muted-foreground">Transactions</p>
            <ShimmerLine className={STAT_CLASS} barClassName="w-20" delay={160} />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Avg payment (ETB)</p>
            <ShimmerLine className={STAT_CLASS} barClassName="w-20" delay={160} />
          </div>
        </div>
      </div>
    );
  }
  return (
    <div
      className={cn(
        "@container relative min-w-0 overflow-hidden rounded-[14px] border border-line-soft bg-muted px-[22px] pt-6 pb-5 before:absolute before:inset-x-0 before:top-0 before:h-1",
        SIDE_STYLES[side].edge,
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <p className={NAME_CLASS}>
            <span className={cn("size-2.5 shrink-0 rounded-full", SIDE_DOT_CLASS[side])} aria-hidden />
            <span className="truncate">{figures.name}</span>
            {/* Inline so Period over period panels keep the same layout as Channel vs channel. */}
            {figures.caption && (
              <span className="truncate text-xs font-normal text-muted-foreground">· {figures.caption}</span>
            )}
            <span className="sr-only">(side {side.toUpperCase()})</span>
          </p>
        </div>
        {leads && (
          <span className={cn("rounded-full px-2.5 py-1 text-xs font-semibold", SIDE_STYLES[side].tag)}>
            Leads on amount
          </span>
        )}
      </div>

      <p className="mt-4 text-xs text-muted-foreground">Amount (ETB)</p>
      <p className={AMOUNT_CLASS}>
        {figures.amount === null ? "No data" : formatAmountValue(figures.amount)}
      </p>

      <div className="mt-4 grid grid-cols-2 gap-4 border-t border-line-soft pt-4">
        <div>
          <p className="text-xs text-muted-foreground">Transactions</p>
          <p className={STAT_CLASS}>
            {figures.transactions === null ? "—" : formatTransactions(figures.transactions)}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Avg payment (ETB)</p>
          <p className={STAT_CLASS}>
            {avg === null ? "—" : formatAmountValue(avg)}
          </p>
        </div>
      </div>
    </div>
  );
}

function GapRow({
  label,
  gap,
  format,
  loading,
}: {
  label: string;
  gap: Gap;
  format: (value: number) => string;
  loading?: boolean;
}) {
  const ahead = gap.leader === "a" || gap.leader === "b" ? gap.leader : null;
  if (loading) {
    return (
      <div className="text-center">
        <p className="text-xs text-muted-foreground">{label}</p>
        <ShimmerLine className="flex justify-center text-xl font-bold" barClassName="left-1/2 w-28 -translate-x-1/2" delay={120} />
        <ShimmerLine className="flex justify-center text-xs" barClassName="left-1/2 w-16 -translate-x-1/2" delay={120} />
      </div>
    );
  }
  return (
    <div className="text-center">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p
        className={cn(
          "text-xl font-bold whitespace-nowrap tabular-nums",
          ahead ? GAP_TEXT[ahead] : "text-foreground",
        )}
      >
        {ahead === "a" && <span aria-hidden>◀ </span>}
        {gap.leader === null ? "—" : gap.leader === "even" ? "Even" : format(gap.difference)}
        {ahead === "b" && <span aria-hidden> ▶</span>}
        {ahead && <span className="sr-only">, side {ahead.toUpperCase()} ahead</span>}
      </p>
      <p className="text-xs text-muted-foreground">{gap.caption}</p>
    </div>
  );
}
