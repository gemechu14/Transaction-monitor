"use client";

import { Skeleton } from "@/components/ui/skeleton";
import type { BottomLine, SideKey } from "@/lib/comparison";
import { cn } from "@/lib/utils";

const NAME_CLASS: Record<SideKey, string> = { a: "text-orange-strong", b: "text-primary-strong" };

/** The one-sentence answer on amount. Announced to screen readers when it changes. */
export function BottomLinePanel({ line, isLoading }: { line: BottomLine | null; isLoading?: boolean }) {
  return (
    <section className="rounded-2xl bg-primary-soft px-7 py-6 max-[620px]:px-5 max-[620px]:py-5" aria-live="polite">
      <p className="text-[13px] font-semibold text-primary-strong">Bottom line</p>
      {isLoading ? (
        <Skeleton className="mt-2 h-9 w-2/3" />
      ) : !line ? (
        <p className="mt-1 text-[28px] leading-tight font-bold text-foreground max-[620px]:text-[22px]">
          Not enough data to compare amounts
        </p>
      ) : (
        <>
          <p className="mt-1 text-[28px] leading-tight font-bold text-foreground max-[620px]:text-[22px]">
            {line.parts.map((part, index) => (
              <span key={index} className={cn(part.side && NAME_CLASS[part.side])}>
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
