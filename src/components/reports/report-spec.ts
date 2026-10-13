import { formatCompactNumber } from "@/lib/format";

/**
 * A page-independent description of an exported report. Each page builds one
 * (see `report-builders.ts`) and the PDF, Excel and CSV writers render it, so
 * all three formats carry the same figures in the same order.
 */

export const REPORT_INSTITUTION = "Cooperative Bank of Oromia";
export const REPORT_SYSTEM = "Transaction Monitoring System";
export const REPORT_CLASSIFICATION = "Confidential – Internal use only";
export const REPORT_LOGO_PATH = "/coop-bank-logo.png";
/** Width / height of the cropped logo, so it can be placed without distortion. */
export const REPORT_LOGO_ASPECT = 724 / 308;

export const REPORT_COLORS = {
  primary: "#00ADEF",
  secondary: "#FF8A29",
  accentText: "#0076A3",
  ink: "#1A2733",
  muted: "#5B6B77",
  faint: "#8C9AA5",
  line: "#D9E1E7",
  headerFill: "#EAF7FD",
  zebra: "#F8FAFB",
  highlight: "#E5F7FD",
};

/**
 * How a numeric cell is shown. PDF uses the short form ("427.05M", "17,841"),
 * Excel keeps the full number with a number format, CSV writes plain numbers.
 */
export type CellKind = "text" | "count" | "etb" | "etbRound" | "percent" | "ms";

export type Cell = string | number | null | { value: number | null; kind: CellKind };

export interface ReportColumn {
  header: string;
  kind: CellKind;
  /** Relative width in the PDF table. */
  width?: number;
}

export interface ReportTable {
  /** Sheet name and section title, e.g. "Channel performance". */
  title: string;
  /** Small grey line on the right of the PDF section title, and the "Note" row in Excel. */
  note?: string;
  /** Whether the table appears in the PDF; every table goes to Excel and CSV. */
  pdf: boolean;
  columns: ReportColumn[];
  rows: Cell[][];
  /** Row index to emphasise, e.g. the platform picked in the filter. */
  highlightRow?: number;
}

export interface KeyFigure {
  label: string;
  value: string;
  detail?: string;
}

export interface ReportSpec {
  /** Goes into the reference number, e.g. "OVERVIEW" → CBO-TMS-OVERVIEW-20261008-120821. */
  code: "OVERVIEW" | "CHANNELS" | "COMPARISON";
  /** Small caps line above the title, e.g. "Overview report". */
  eyebrow: string;
  title: string;
  /** "Report" row in Excel; usually the title of the whole report. */
  reportName: string;
  periodLabel: string;
  /** Filters in force, e.g. "All platforms · 1 – 30 Sep 2026". */
  scope: string;
  /** Line under the PDF title; defaults to the period. */
  subtitle?: string;
  orientation: "portrait" | "landscape";
  keyFigures: KeyFigure[];
  /** Excel only: one-line verdict shown first under Key figures. */
  headline?: { value: string; detail: string };
  takeaways: string[];
  tables: ReportTable[];
  /** Report-specific notes, shown under the PDF tables and in the Excel notes. */
  notes: string[];
  preparedBy: string;
  accessLevel: string;
  generatedAt: Date;
}

/* ---------- labels ---------- */

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

export function reportReference(spec: Pick<ReportSpec, "code" | "generatedAt">): string {
  const d = spec.generatedAt;
  const date = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
  const time = `${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
  return `CBO-TMS-${spec.code}-${date}-${time}`;
}

/** "8 Oct 2026, 12:08 GMT+3" */
export function formatGeneratedOn(date: Date): string {
  const day = date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  const offset = -date.getTimezoneOffset();
  const hours = Math.trunc(Math.abs(offset) / 60);
  const minutes = Math.abs(offset) % 60;
  const zone = `GMT${offset < 0 ? "-" : "+"}${hours}${minutes ? `:${pad(minutes)}` : ""}`;
  return `${day}, ${pad(date.getHours())}:${pad(date.getMinutes())} ${zone}`;
}

export function accessLevel(role: string | undefined): string {
  return role === "ADMIN" ? "Administrator" : "Analyst";
}

export function reportAuthor(
  user: { displayName: string | null; username: string | null; email: string } | undefined,
): string {
  return user?.displayName || user?.username || user?.email || "Transaction Ops user";
}

/** File-name part for a channel id or "all", e.g. "mbesa_p2p" → "mbesa-p2p". */
export function fileSlug(id: string): string {
  return id.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export const STANDARD_NOTES = {
  currency: "All monetary amounts are stated in Ethiopian Birr (ETB) unless otherwise indicated.",
  filters: "Figures reflect the filters listed under Report details at the time of generation.",
  signature: "This report is system-generated and is valid without a signature.",
  confidentiality: `This document contains confidential information of ${REPORT_INSTITUTION}. Unauthorised disclosure, copying or distribution is prohibited.`,
};

/* ---------- cells ---------- */

export function cellParts(cell: Cell, column: ReportColumn): { value: string | number | null; kind: CellKind } {
  if (cell !== null && typeof cell === "object") return cell;
  return { value: cell, kind: typeof cell === "number" ? column.kind : "text" };
}

/** Short display form, used by the PDF. */
export function formatCell(cell: Cell, column: ReportColumn): string {
  const { value, kind } = cellParts(cell, column);
  if (value === null || value === "") return "—";
  if (typeof value === "string") return value;
  switch (kind) {
    case "etb":
      return formatCompactNumber(value, 2);
    case "percent":
      return `${(value * 100).toFixed(2)}%`;
    case "count":
    case "etbRound":
    case "ms":
    case "text":
    default:
      return Math.round(value).toLocaleString("en-US");
  }
}

/* ---------- CSV ---------- */

function csvValue(cell: Cell, column: ReportColumn): string {
  const { value, kind } = cellParts(cell, column);
  if (value === null) return "";
  if (typeof value === "string") return value;
  if (kind === "percent") return `${(value * 100).toFixed(2)}%`;
  if (kind === "etb" || kind === "etbRound") return value.toFixed(2);
  return String(Math.round(value));
}

function csvEscape(text: string): string {
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function csvRow(values: string[]): string {
  return values.map(csvEscape).join(",");
}

export function buildReportCsv(spec: ReportSpec): Blob {
  const lines: string[] = [
    csvRow([REPORT_INSTITUTION]),
    csvRow([spec.title]),
    csvRow(["Reference", reportReference(spec)]),
    csvRow(["Period", spec.periodLabel]),
    csvRow(["Filters", spec.scope]),
    csvRow(["Generated", `${formatGeneratedOn(spec.generatedAt)} by ${spec.preparedBy}`]),
  ];

  const summary: string[][] = [
    ...(spec.headline ? [["Headline", spec.headline.value, spec.headline.detail]] : []),
    ...spec.keyFigures.map((f) => [f.label, f.value, f.detail ?? ""]),
    ...spec.takeaways.map((t, i) => [`Takeaway ${i + 1}`, t, ""]),
  ];
  if (summary.length) {
    lines.push("", csvRow(["Summary"]), csvRow(["Metric", "Value", "Detail"]), ...summary.map(csvRow));
  }

  for (const table of spec.tables) {
    lines.push("", csvRow([table.title]), csvRow(table.columns.map((c) => c.header)));
    for (const row of table.rows) lines.push(csvRow(row.map((cell, i) => csvValue(cell, table.columns[i]))));
  }

  // BOM so Excel opens the file as UTF-8.
  return new Blob(["﻿" + lines.join("\r\n")], { type: "text/csv;charset=utf-8" });
}
