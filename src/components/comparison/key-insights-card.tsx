"use client";

import { Coins, MoveRight, PieChart, Target, TrendingUp } from "lucide-react";

import { SectionCard } from "@/components/overview/section-card";
import { Skeleton } from "@/components/ui/skeleton";
import type { Insight } from "@/lib/comparison";

const ICONS: Record<Insight["id"], typeof Coins> = {
  "avg-payment": Coins,
  share: PieChart,
  movement: TrendingUp,
  gap: Target,
};

export function KeyInsightsCard({ insights, isLoading }: { insights: Insight[]; isLoading?: boolean }) {
  return (
    <SectionCard title="Key insights" description="What the numbers say, in plain language">
      {isLoading ? (
        <Skeleton className="h-48 w-full" />
      ) : (
        <ul className="divide-y divide-line-soft">
          {insights.map((insight) => {
            const Icon = ICONS[insight.id] ?? MoveRight;
            return (
              <li key={insight.id} className="flex gap-3.5 py-3.5 first:pt-0 last:pb-0">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-primary-soft text-primary-strong">
                  <Icon className="size-4" />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground">{insight.title}</p>
                  <p className="mt-0.5 text-sm text-foreground-2">{insight.text}</p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </SectionCard>
  );
}
