"use client";

import { useState } from "react";

import { FiltersBar } from "@/components/overview/filters-bar";
import type { FlowDirection } from "@/components/overview/flow-chart-card";
import { PerChannelReconciliationTable } from "@/components/reconciliation/per-channel-reconciliation-table";
import { SettlementSummaryCards } from "@/components/reconciliation/settlement-summary-cards";
import { CHANNEL_LIST, type ChannelId } from "@/config/channels";
import { getLastNDays, type DateRange } from "@/lib/date";
import { useReconciliationSummary } from "@/hooks";

const DIRECTION_LABELS: Record<FlowDirection, string> = {
  both: "incoming & outgoing",
  in: "incoming only",
  out: "outgoing only",
};

export default function ReconciliationPage() {
  const [range, setRange] = useState<DateRange>(() => getLastNDays(30));
  const [channel, setChannel] = useState<ChannelId | "all">("all");
  const [direction, setDirection] = useState<FlowDirection>("both");

  const resolvedChannel = channel === "all" ? undefined : channel;
  const reconciliationQuery = useReconciliationSummary({ ...range, channel: resolvedChannel });
  const reconciliation = reconciliationQuery.data ?? [];

  const channelLabel =
    channel === "all" ? "All platforms" : CHANNEL_LIST.find((c) => c.id === channel)?.name;

  return (
    <div className="space-y-4">
      <div className="sticky -top-4 z-20 -mx-4 flex flex-col gap-3 border-b border-border bg-background px-4 py-3 sm:-top-6 sm:-mx-6 sm:px-6 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-base font-bold text-foreground sm:text-lg">
              Settlement Reconciliation
            </h1>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
              <span className="size-1.5 shrink-0 rounded-full bg-primary" />
              {channelLabel} &middot; {DIRECTION_LABELS[direction]}
            </span>
          </div>
        </div>

        <FiltersBar
          channel={channel}
          onChannelChange={setChannel}
          direction={direction}
          onDirectionChange={setDirection}
          range={range}
          onRangeChange={setRange}
        />
      </div>

      <SettlementSummaryCards data={reconciliation} isLoading={reconciliationQuery.isLoading} />

      <PerChannelReconciliationTable
        data={reconciliation}
        isLoading={reconciliationQuery.isLoading}
      />
    </div>
  );
}
