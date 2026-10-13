"use client";

import { useState } from "react";
import { ChevronDown, FileDown, FileSpreadsheet, FileText, Loader2, Sheet } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useMe } from "@/hooks";
import { cn } from "@/lib/utils";

import type { ExportRequest, ReportAuthor } from "./report-builders";
import { REPORT_LOGO_PATH, accessLevel, reportAuthor } from "./report-spec";

type Format = "pdf" | "xlsx" | "csv";

function download(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Export dropdown (PDF, Excel, CSV) for a report page. `getReport` is called on
 * click with the signed-in author; the PDF renderer, Excel writer and report
 * layouts are imported then, so none of them ship with the page bundle.
 */
export function ExportMenu({
  getReport,
  disabled,
  size = "default",
}: {
  getReport: (author: ReportAuthor) => ExportRequest | undefined;
  disabled?: boolean;
  /** "sm" matches the h-9 controls inside cards. */
  size?: "default" | "sm";
}) {
  const [busy, setBusy] = useState<Format | null>(null);
  const [failed, setFailed] = useState(false);
  const user = useMe().data?.user;

  async function run(format: Format) {
    const report = getReport({
      preparedBy: reportAuthor(user),
      accessLevel: accessLevel(user?.role),
      generatedAt: new Date(),
    });
    if (!report) return;
    const { spec, fileBase } = report;
    // react-pdf fetches the logo itself, so it needs an absolute URL.
    const logoSrc = `${window.location.origin}${REPORT_LOGO_PATH}`;

    setBusy(format);
    setFailed(false);
    try {
      if (format === "pdf") {
        const [{ pdf }, { ReportPdf }] = await Promise.all([import("@react-pdf/renderer"), import("./report-pdf")]);
        const element = <ReportPdf spec={spec} logoSrc={logoSrc} />;
        // @react-pdf types `pdf()` against its own Document element; ours renders one.
        download(await pdf(element as Parameters<typeof pdf>[0]).toBlob(), `${fileBase}.pdf`);
      } else if (format === "xlsx") {
        const { buildReportXlsx } = await import("./report-xlsx");
        download(await buildReportXlsx(spec, logoSrc), `${fileBase}.xlsx`);
      } else {
        const { buildReportCsv } = await import("./report-spec");
        download(buildReportCsv(spec), `${fileBase}.csv`);
      }
    } catch (error) {
      console.error(`${format.toUpperCase()} export failed`, error);
      setFailed(true);
    } finally {
      setBusy(null);
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        disabled={disabled || busy !== null}
        title={failed ? "Export failed, try again" : undefined}
        className={cn(
          "inline-flex items-center gap-2 rounded-[10px] border border-border bg-card font-medium text-foreground transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-primary disabled:pointer-events-none disabled:opacity-60",
          size === "sm" ? "h-9 px-3 text-[13px]" : "h-10 px-3.5 text-sm",
          failed && "border-destructive text-destructive",
        )}
      >
        {busy ? (
          <Loader2 className="size-4 animate-spin text-primary-strong" />
        ) : (
          <FileDown className="size-4 text-primary-strong" />
        )}
        {busy ? "Preparing…" : failed ? "Retry export" : "Export"}
        <ChevronDown className="size-3.5 text-muted-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuItem onClick={() => run("pdf")}>
          <FileText className="size-4" />
          PDF report
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => run("xlsx")}>
          <FileSpreadsheet className="size-4" />
          Excel (.xlsx)
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => run("csv")}>
          <Sheet className="size-4" />
          CSV
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
