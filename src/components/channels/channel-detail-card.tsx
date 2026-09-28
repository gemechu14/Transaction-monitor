import { ArrowDownLeft, ArrowUpRight } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { CHANNELS } from "@/config/channels";
import { formatCompactNumber, formatCurrencyCompact, formatSignedPercent } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { ChannelSummary } from "@/types/api";

export function ChannelDetailCard({
  summary,
  previous,
}: {
  summary: ChannelSummary;
  previous?: ChannelSummary;
}) {
  const config = CHANNELS[summary.channel];
  const netPosition = summary.incomingValue - summary.outgoingValue;

  const change =
    previous && previous.totalValue
      ? (summary.totalValue - previous.totalValue) / previous.totalValue
      : undefined;
  const hasChange = typeof change === "number" && Number.isFinite(change) && change !== 0;
  const isIncrease = (change ?? 0) > 0;

  return (
    <Card size="sm">
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <p className="truncate text-sm font-semibold text-foreground">
              {config?.name ?? summary.channel}
            </p>
          </div>
          {hasChange && (
            <span
              className={cn(
                "inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-xs font-semibold",
                isIncrease
                  ? "bg-primary/10 text-primary"
                  : "bg-status-failed/10 text-status-failed",
              )}
            >
              {formatSignedPercent(change ?? 0)}
            </span>
          )}
        </div>

        <div>
          <p className="text-2xl font-bold text-foreground">
            {formatCurrencyCompact(summary.totalValue, "ETB", 2)}
          </p>
          <p className="truncate text-sm text-muted-foreground">
            {formatCompactNumber(summary.transactionCount)} transactions
          </p>
        </div>

        <dl className="space-y-2 text-xs">
          <div className="flex items-center justify-between gap-2">
            <dt className="flex items-center gap-1.5 text-foreground">
              <ArrowDownLeft className="size-3.5 text-primary" />
              Incoming
            </dt>
            <dd className="text-foreground">
              {formatCurrencyCompact(summary.incomingValue, "ETB", 2)}
            </dd>
          </div>
          <div className="flex items-center justify-between gap-2">
            <dt className="flex items-center gap-1.5 text-foreground">
              <ArrowUpRight className="size-3.5 text-status-pending" />
              Outgoing
            </dt>
            <dd className="text-foreground">
              {formatCurrencyCompact(summary.outgoingValue, "ETB", 2)}
            </dd>
          </div>
          <div className="flex items-center justify-between gap-2">
            <dt className="text-foreground">Net position</dt>
            <dd className="text-foreground">
              {netPosition < 0 ? "-" : "+"}
              {formatCurrencyCompact(Math.abs(netPosition), "ETB", 2)}
            </dd>
          </div>
        </dl>
      </CardContent>
    </Card>
  );
}
