"use client";

import { SIDE_DOT_CLASS } from "@/components/comparison/comparison-filter-bar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  avgPayment,
  formatAmount,
  formatAvgPayment,
  formatTransactions,
  gapBetween,
  type Gap,
  type SideFigures,
  type SideKey,
} from "@/lib/comparison";
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
      {isLoading ? (
        <Skeleton className="h-56 w-full" />
      ) : (
        <div className="grid gap-4 min-[901px]:grid-cols-[1fr_minmax(170px,0.55fr)_1fr]">
          <SidePanel side="a" figures={a} leads={amountGap.leader === "a"} />
          <div className="flex flex-col justify-center gap-5 rounded-[14px] px-2 py-1 max-[900px]:flex-row max-[900px]:justify-around max-[900px]:py-0">
            <GapRow label="Amount gap" gap={amountGap} format={formatAmount} />
            <GapRow label="Transactions gap" gap={transactionGap} format={formatTransactions} />
          </div>
          <SidePanel side="b" figures={b} leads={amountGap.leader === "b"} />
        </div>
      )}
    </section>
  );
}

function SidePanel({ side, figures, leads }: { side: SideKey; figures: SideFigures; leads: boolean }) {
  const avg = avgPayment(figures);
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-[14px] border border-line-soft bg-muted px-[22px] pt-6 pb-5 before:absolute before:inset-x-0 before:top-0 before:h-1",
        SIDE_STYLES[side].edge,
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-[17px] font-bold text-foreground">
            <span className={cn("size-2.5 shrink-0 rounded-full", SIDE_DOT_CLASS[side])} aria-hidden />
            <span className="truncate">{figures.name}</span>
            <span className="sr-only">(side {side.toUpperCase()})</span>
          </p>
          {figures.caption && <p className="mt-0.5 pl-[18px] text-xs text-muted-foreground">{figures.caption}</p>}
        </div>
        {leads && (
          <span className={cn("rounded-full px-2.5 py-1 text-xs font-semibold", SIDE_STYLES[side].tag)}>
            Leads on amount
          </span>
        )}
      </div>

      <p className="mt-4 text-xs text-muted-foreground">Amount</p>
      <p className="text-[32px] leading-tight font-bold whitespace-nowrap text-foreground tabular-nums max-[1640px]:text-[28px] max-[620px]:text-2xl">
        {figures.amount === null ? "No data" : formatAmount(figures.amount)}
      </p>

      <div className="mt-4 grid grid-cols-2 gap-4 border-t border-line-soft pt-4">
        <div>
          <p className="text-xs text-muted-foreground">Transactions</p>
          <p className="text-lg font-semibold text-foreground tabular-nums">
            {figures.transactions === null ? "—" : formatTransactions(figures.transactions)}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Avg payment</p>
          <p className="text-lg font-semibold text-foreground tabular-nums">
            {avg === null ? "—" : formatAvgPayment(avg)}
          </p>
        </div>
      </div>
    </div>
  );
}

function GapRow({ label, gap, format }: { label: string; gap: Gap; format: (value: number) => string }) {
  const ahead = gap.leader === "a" || gap.leader === "b" ? gap.leader : null;
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
