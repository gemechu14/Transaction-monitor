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
import { formatPercent } from "@/lib/format";
import { cn } from "@/lib/utils";

export interface MovementRow {
  channel: ChannelId;
  /** Fraction 0-1. */
  baseline: number;
  /** Fraction 0-1. */
  observed: number;
  movementPts: number;
  status: "investigate" | "normal";
}

export function ChannelMovementsTableCard({
  rows,
  isLoading,
}: {
  rows: MovementRow[];
  isLoading?: boolean;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Observed channel movements</CardTitle>
        <CardDescription>Current failure rate compared with baseline</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-56 w-full" />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Channel</TableHead>
                <TableHead className="text-right">Baseline</TableHead>
                <TableHead className="text-right">Observed</TableHead>
                <TableHead className="text-right">Movement</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => {
                const config = CHANNELS[row.channel];
                return (
                  <TableRow key={row.channel}>
                    <TableCell className="font-medium text-foreground">
                      {config?.name ?? row.channel}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {formatPercent(row.baseline, 2)}
                    </TableCell>
                    <TableCell className="text-right text-foreground">
                      {formatPercent(row.observed, 2)}
                    </TableCell>
                    <TableCell
                      className={cn(
                        "text-right font-medium",
                        row.movementPts >= 0 ? "text-status-failed" : "text-status-success",
                      )}
                    >
                      {row.movementPts >= 0 ? "+" : ""}
                      {row.movementPts.toFixed(2)} pts
                    </TableCell>
                    <TableCell>
                      <span
                        className={cn(
                          "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium",
                          row.status === "investigate"
                            ? "bg-status-failed/10 text-status-failed"
                            : "border border-border text-muted-foreground",
                        )}
                      >
                        {row.status === "investigate" ? "Investigate" : "Normal"}
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
