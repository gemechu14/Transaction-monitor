"use client";

import { useState } from "react";

import { FiltersBar } from "@/components/overview/filters-bar";
import type { FlowDirection } from "@/components/overview/flow-chart-card";
import { KpiCard } from "@/components/overview/kpi-card";
import { TransactionLedgerCard } from "@/components/transactions/transaction-ledger-card";
import { CHANNEL_LIST, type ChannelId } from "@/config/channels";
import { getLastNDays, type DateRange } from "@/lib/date";
import { useKpis } from "@/hooks";

const KPI_SKELETON_COUNT = 6;

const DIRECTION_LABELS: Record<FlowDirection, string> = {
  both: "incoming & outgoing",
  in: "incoming only",
  out: "outgoing only",
};

export default function TransactionsPage() {
  const [range, setRange] = useState<DateRange>(() => getLastNDays(30));
  const [channel, setChannel] = useState<ChannelId | "all">("all");
  const [direction, setDirection] = useState<FlowDirection>("both");

  const resolvedChannel = channel === "all" ? undefined : channel;
  const kpisQuery = useKpis({ ...range, channel: resolvedChannel });
  const kpis = kpisQuery.data ?? [];

  const channelLabel =
    channel === "all" ? "All platforms" : CHANNEL_LIST.find((c) => c.id === channel)?.name;

  return (
    <div className="space-y-4">
      <div className="sticky -top-4 z-20 -mx-4 -mt-2 flex flex-col gap-3 border-b border-border bg-background px-4 py-3 sm:-top-6 sm:-mx-6 sm:px-6 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-base font-bold text-foreground sm:text-lg">Transaction Ledger</h1>
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

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        {kpisQuery.isLoading
          ? Array.from({ length: KPI_SKELETON_COUNT }).map((_, index) => (
              <KpiCard key={index} isLoading />
            ))
          : kpis.map((kpi) => <KpiCard key={kpi.id} kpi={kpi} />)}
      </div>

      <TransactionLedgerCard range={range} />
    </div>
  );
}
