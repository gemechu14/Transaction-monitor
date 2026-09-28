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
import { CHANNELS, type ChannelId } from "@/config/channels";
import {
  formatCompactNumber,
  formatCurrencyCompact,
  formatPercent,
  formatSignedPercent,
} from "@/lib/format";
import { cn } from "@/lib/utils";

export interface PlatformRow {
  channel: ChannelId;
  transactionCount: number;
  totalValue: number;
  /** Fraction period-over-period change in transaction count. */
  change: number;
  /** Fraction 0-1. */
  successRate: number;
}

export function ByPlatformTableCard({
  rows,
  isLoading,
}: {
  rows: PlatformRow[];
  isLoading?: boolean;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>By platform</CardTitle>
        <CardDescription>Traffic, value, period movement and reliability</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-72 w-full" />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Platform</TableHead>
                <TableHead className="text-right">Transactions</TableHead>
                <TableHead className="text-right">Value</TableHead>
                <TableHead className="text-right">Change</TableHead>
                <TableHead className="text-right">Success</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => {
                const config = CHANNELS[row.channel];
                return (
                  <TableRow key={row.channel}>
                    <TableCell>
                      <span className="font-semibold text-foreground">
                        {config?.name ?? row.channel}
                      </span>
                    </TableCell>
                    <TableCell className="text-right text-foreground">
                      {formatCompactNumber(row.transactionCount)}
                    </TableCell>
                    <TableCell className="text-right text-foreground">
                      {formatCurrencyCompact(row.totalValue, "ETB", 2)}
                    </TableCell>
                    <TableCell
                      className={cn(
                        "text-right font-medium",
                        row.change >= 0 ? "text-status-success" : "text-status-failed",
                      )}
                    >
                      {formatSignedPercent(row.change)}
                    </TableCell>
                    <TableCell className="text-right text-foreground">
                      {formatPercent(row.successRate, 2)}
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
