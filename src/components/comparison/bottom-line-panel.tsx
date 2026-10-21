"use client";

import { sideTone, type SideLeader, type SideTone } from "@/components/comparison/comparison-filter-bar";
import { ShimmerLine } from "@/components/ui/shimmer-line";
import type { BottomLine } from "@/lib/comparison";
import { cn } from "@/lib/utils";

/** The sentence names the leader first ("X processed 2.2× the amount of Y"). */
function leaderOf(line: BottomLine): SideLeader {
  return line.parts.find((part) => part.side)?.side ?? null;
}

// The larger amount is always blue, the other orange (see `sideTone`).
const TONE_NAME_CLASS: Record<SideTone, string> = { lead: "text-primary-strong", other: "text-orange-strong" };

/** The one-sentence answer on amount. Announced to screen readers when it changes. */
export function BottomLinePanel({ line, isLoading }: { line: BottomLine | null; isLoading?: boolean }) {
  return (
    <section className="rounded-2xl bg-primary-soft px-7 py-6 max-[620px]:px-5 max-[620px]:py-5" aria-live="polite">
      <p className="text-[13px] font-semibold text-primary-strong">Bottom line</p>
      {isLoading ? (
        <div aria-busy="true">
          <ShimmerLine className="mt-1 text-xl leading-snug font-bold max-[620px]:text-lg" barClassName="w-2/3 rounded-lg" />
          <ShimmerLine className="mt-2 text-sm" barClassName="w-1/2" delay={100} />
        </div>
      ) : !line ? (
        <p className="mt-1 text-xl leading-snug font-bold text-foreground max-[620px]:text-lg">
          Not enough data to compare amounts
        </p>
      ) : (
        <>
          <p className="mt-1 text-xl leading-snug font-bold text-foreground max-[620px]:text-lg">
            {line.parts.map((part, index) => (
              <span key={index} className={cn(part.side && TONE_NAME_CLASS[sideTone(part.side, leaderOf(line))])}>
                {part.text}
              </span>
            ))}
          </p>
          <p className="mt-2 text-sm text-foreground-2 tabular-nums">{line.detail}</p>
        </>
      )}
    </section>
  );
}
