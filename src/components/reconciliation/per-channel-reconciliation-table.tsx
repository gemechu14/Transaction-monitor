"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CHANNELS } from "@/config/channels";
import { formatCurrencyCompact, formatPercent } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { ReconciliationSummary } from "@/types/api";

const STATE_STYLES: Record<ReconciliationSummary["state"], string> = {
  reconciled: "bg-status-success/10 text-status-success",
  review: "bg-status-pending/10 text-status-pending",
};

const STATE_LABELS: Record<ReconciliationSummary["state"], string> = {
  reconciled: "Reconciled",
  review: "Review",
};

export function PerChannelReconciliationTable({
  data,
  isLoading,
}: {
  data: ReconciliationSummary[];
  isLoading?: boolean;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Per-channel reconciliation</CardTitle>
        <CardDescription>
          Exception exposure is the value of pending and reversed items awaiting settlement
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-80 w-full" />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Channel</TableHead>
                <TableHead className="text-right">Inflow</TableHead>
                <TableHead className="text-right">Outflow</TableHead>
                <TableHead className="text-right">Net position</TableHead>
                <TableHead className="text-right">Pending</TableHead>
                <TableHead className="text-right">Reversed</TableHead>
                <TableHead className="text-right">Match rate</TableHead>
                <TableHead>State</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((row) => {
                const config = CHANNELS[row.channel];
                return (
                  <TableRow key={row.channel}>
                    <TableCell className="font-medium text-foreground">
                      {config?.name ?? row.channel}
                    </TableCell>
                    <TableCell className="text-right text-primary">
                      {formatCurrencyCompact(row.inflow, "ETB", 2)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrencyCompact(row.outflow, "ETB", 2)}
                    </TableCell>
                    <TableCell
                      className={cn(
                        "text-right font-medium",
                        row.netPosition < 0 ? "text-status-failed" : "text-foreground",
                      )}
                    >
                      {row.netPosition < 0 ? "-" : ""}
                      {formatCurrencyCompact(Math.abs(row.netPosition), "ETB", 2)}
                    </TableCell>
                    <TableCell className="text-right">
                      {row.pendingCount.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right">
                      {row.reversedCount.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right">{formatPercent(row.matchRate, 2)}</TableCell>
                    <TableCell>
                      <span
                        className={cn(
                          "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium",
                          STATE_STYLES[row.state],
                        )}
                      >
                        {STATE_LABELS[row.state]}
                      </span>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
