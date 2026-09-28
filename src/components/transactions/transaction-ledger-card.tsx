"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Download, FileText, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CHANNEL_LIST, CHANNELS, type ChannelId } from "@/config/channels";
import { STATUS_CONFIG, STATUS_LIST, type TransactionStatus } from "@/config/status";
import { getTransactions } from "@/lib/api/endpoints";
import { formatDateTimeUTC, type DateRange } from "@/lib/date";
import { formatCurrencyFull } from "@/lib/format";
import { useTransactions } from "@/hooks";
import { cn } from "@/lib/utils";
import type { Transaction } from "@/types/api";

const PAGE_SIZE = 12;
const EXPORT_PAGE_SIZE = 2000;

type DirectionFilter = "both" | "in" | "out";

const DIRECTION_LABEL: Record<Transaction["direction"], string> = {
  in: "Incoming",
  out: "Outgoing",
};

const CHANNEL_ITEMS: Record<string, string> = {
  all: "All channels",
  ...Object.fromEntries(CHANNEL_LIST.map((c) => [c.id, c.name])),
};

const STATUS_ITEMS: Record<string, string> = {
  all: "All statuses",
  ...Object.fromEntries(STATUS_LIST.map((s) => [s.id, s.label])),
};

const DIRECTION_ITEMS: Record<DirectionFilter, string> = {
  both: "In & out",
  in: "In",
  out: "Out",
};

const EXPORT_COLUMNS = [
  "Transaction ID",
  "Reference",
  "Timestamp (UTC)",
  "Channel",
  "Direction",
  "Amount",
  "Currency",
  "Status",
  "Counterparty",
  "Latency (ms)",
] as const;

function transactionToRow(t: Transaction): (string | number)[] {
  return [
    t.id,
    t.reference,
    formatDateTimeUTC(t.createdAt),
    CHANNELS[t.channel]?.name ?? t.channel,
    DIRECTION_LABEL[t.direction],
    t.amount.toFixed(2),
    t.currency,
    STATUS_CONFIG[t.status].label,
    t.counterparty,
    t.latencyMs,
  ];
}

function downloadTransactionsCsv(rows: Transaction[]) {
  const lines = rows.map((t) =>
    transactionToRow(t)
      .map((cell) => `"${String(cell).replace(/"/g, '""')}"`)
      .join(","),
  );
  const csv = [EXPORT_COLUMNS.join(","), ...lines].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "transaction-ledger.csv";
  link.click();
  URL.revokeObjectURL(url);
}

function openTransactionsPrintView(rows: Transaction[], range: DateRange, total: number) {
  const win = window.open("", "_blank");
  if (!win) return;

  const bodyRows = rows
    .map((t) => {
      const cells = transactionToRow(t);
      return `<tr>${cells
        .map(
          (cell, index) =>
            `<td${index === 5 || index === 9 ? ' style="text-align:right"' : ""}>${cell}</td>`,
        )
        .join("")}</tr>`;
    })
    .join("");

  win.document.write(`<!doctype html>
<html>
<head>
<title>Transaction ledger</title>
<style>
  body { font-family: Arial, Helvetica, sans-serif; padding: 24px; color: #1D2939; }
  h1 { font-size: 18px; margin: 0 0 4px; }
  p { color: #667085; font-size: 12px; margin: 0 0 16px; }
  table { width: 100%; border-collapse: collapse; font-size: 11px; }
  th, td { border-bottom: 1px solid #E4E7EC; padding: 6px 8px; text-align: left; white-space: nowrap; }
  th { background: #F9FAFB; font-weight: 600; }
</style>
</head>
<body>
  <h1>Transaction Ledger</h1>
  <p>${total.toLocaleString()} records &middot; ${range.from} to ${range.to}</p>
  <table>
    <thead><tr>${EXPORT_COLUMNS.map((c) => `<th>${c}</th>`).join("")}</tr></thead>
    <tbody>${bodyRows}</tbody>
  </table>
</body>
</html>`);
  win.document.close();
  win.focus();
  win.print();
}

export function TransactionLedgerCard({ range }: { range: DateRange }) {
  const [search, setSearch] = useState("");
  const [channel, setChannel] = useState<ChannelId | "all">("all");
  const [status, setStatus] = useState<TransactionStatus | "all">("all");
  const [direction, setDirection] = useState<DirectionFilter>("both");
  const [minAmount, setMinAmount] = useState("");
  const [maxAmount, setMaxAmount] = useState("");
  const [page, setPage] = useState(1);
  const [isExporting, setIsExporting] = useState<"csv" | "pdf" | null>(null);

  const filtersKey = `${range.from}|${range.to}|${channel}|${status}|${direction}|${search}|${minAmount}|${maxAmount}`;
  const [appliedFiltersKey, setAppliedFiltersKey] = useState(filtersKey);
  if (filtersKey !== appliedFiltersKey) {
    setAppliedFiltersKey(filtersKey);
    setPage(1);
  }

  const baseParams = useMemo(
    () => ({
      ...range,
      channel: channel === "all" ? undefined : channel,
      status: status === "all" ? undefined : status,
      direction: direction === "both" ? undefined : direction,
      search: search.trim() || undefined,
      minAmount: minAmount ? Number(minAmount) : undefined,
      maxAmount: maxAmount ? Number(maxAmount) : undefined,
    }),
    [range, channel, status, direction, search, minAmount, maxAmount],
  );

  const transactionsQuery = useTransactions({ ...baseParams, page, pageSize: PAGE_SIZE });
  const rows = transactionsQuery.data?.data ?? [];
  const total = transactionsQuery.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  async function handleExport(kind: "csv" | "pdf") {
    setIsExporting(kind);
    try {
      const result = await getTransactions({ ...baseParams, page: 1, pageSize: EXPORT_PAGE_SIZE });
      if (kind === "csv") {
        downloadTransactionsCsv(result.data);
      } else {
        openTransactionsPrintView(result.data, range, result.total);
      }
    } finally {
      setIsExporting(null);
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col items-start gap-3 @lg/card-header:flex-row @lg/card-header:items-center @lg/card-header:justify-between">
          <div>
            <CardTitle>Transaction ledger</CardTitle>
            <CardDescription>
              {transactionsQuery.isLoading
                ? "Loading records…"
                : `${total.toLocaleString()} records match the current filters`}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-xs"
              disabled={isExporting !== null}
              onClick={() => handleExport("csv")}
            >
              <Download className="size-3.5" />
              CSV
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-xs"
              disabled={isExporting !== null}
              onClick={() => handleExport("pdf")}
            >
              <FileText className="size-3.5" />
              PDF
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[200px] flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search ID, reference, counterparty"
              className="pl-8"
            />
          </div>

          <Select
            items={CHANNEL_ITEMS}
            value={channel}
            onValueChange={(value) => setChannel(value as ChannelId | "all")}
          >
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(CHANNEL_ITEMS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            items={STATUS_ITEMS}
            value={status}
            onValueChange={(value) => setStatus(value as TransactionStatus | "all")}
          >
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(STATUS_ITEMS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            items={DIRECTION_ITEMS}
            value={direction}
            onValueChange={(value) => setDirection(value as DirectionFilter)}
          >
            <SelectTrigger className="w-28">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(DIRECTION_ITEMS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Input
            value={minAmount}
            onChange={(e) => setMinAmount(e.target.value)}
            placeholder="Min"
            type="number"
            inputMode="decimal"
            className="w-24"
          />
          <Input
            value={maxAmount}
            onChange={(e) => setMaxAmount(e.target.value)}
            placeholder="Max"
            type="number"
            inputMode="decimal"
            className="w-24"
          />
        </div>

        <div className="overflow-hidden rounded-lg border border-border">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Transaction ID</TableHead>
                <TableHead>Timestamp (UTC)</TableHead>
                <TableHead>Channel</TableHead>
                <TableHead>Direction</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Counterparty</TableHead>
                <TableHead className="text-right">Latency</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody
              className={cn(
                "transition-opacity",
                transactionsQuery.isFetching && !transactionsQuery.isLoading && "opacity-60",
              )}
            >
              {transactionsQuery.isLoading ? (
                Array.from({ length: PAGE_SIZE }).map((_, index) => (
                  <TableRow key={index}>
                    {Array.from({ length: 8 }).map((__, cellIndex) => (
                      <TableCell key={cellIndex}>
                        <Skeleton className="h-4 w-full max-w-24" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                    No transactions match the current filters.
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="font-medium text-foreground">{t.id}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDateTimeUTC(t.createdAt)}
                    </TableCell>
                    <TableCell>{CHANNELS[t.channel]?.name ?? t.channel}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {DIRECTION_LABEL[t.direction]}
                    </TableCell>
                    <TableCell className="text-right font-medium text-foreground">
                      {formatCurrencyFull(t.amount, t.currency)}
                    </TableCell>
                    <TableCell>
                      <span
                        className={cn(
                          "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                          STATUS_CONFIG[t.status].badgeClassName,
                        )}
                      >
                        {STATUS_CONFIG[t.status].label}
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{t.counterparty}</TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {t.latencyMs} ms
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <div className="flex items-center justify-between gap-2 pt-1">
          <p className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-1 text-xs"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              <ChevronLeft className="size-3.5" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-1 text-xs"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              Next
              <ChevronRight className="size-3.5" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
