import type { Borders, Cell as XlsxCell, Workbook, Worksheet } from "exceljs";

import {
  REPORT_CLASSIFICATION,
  REPORT_COLORS as C,
  REPORT_INSTITUTION,
  REPORT_LOGO_ASPECT,
  REPORT_SYSTEM,
  STANDARD_NOTES,
  cellParts,
  formatGeneratedOn,
  reportReference,
  type CellKind,
  type ReportSpec,
  type ReportTable,
} from "./report-spec";

/**
 * Excel export: a Summary sheet (report details, key figures, contents, notes)
 * followed by one sheet per table, each with the same branded masthead.
 */

const argb = (hex: string) => `FF${hex.replace("#", "").toUpperCase()}`;
const color = (hex: string) => ({ argb: argb(hex) });
const fill = (hex: string) => ({ type: "pattern" as const, pattern: "solid" as const, fgColor: color(hex) });
const hair = { style: "hair" as const, color: color(C.line) };

const NUM_FMT: Record<CellKind, string> = {
  text: "@",
  count: "#,##0",
  etb: "#,##0.00",
  etbRound: "#,##0.00",
  percent: "0.00%",
  ms: "#,##0",
};

const SUMMARY_WIDTHS = [30, 36, 60, 26];
const SUMMARY_TOTAL_WIDTH = SUMMARY_WIDTHS.reduce((a, b) => a + b, 0);
const LOGO_HEIGHT = 46;

/** Excel sheet names: at most 31 characters, none of []:*?/\ */
function sheetName(title: string): string {
  return title.replace(/[[\]:*?/\\]/g, " ").slice(0, 31);
}

/** Rough row height for wrapped text in a merged area of `chars` width. */
function wrappedHeight(text: string, chars: number, lineHeight = 15): number {
  return Math.max(1, Math.ceil(text.length / Math.max(10, chars))) * lineHeight;
}

class SheetWriter {
  row = 1;

  constructor(
    readonly sheet: Worksheet,
    readonly lastCol: number,
  ) {}

  get widthChars(): number {
    return this.sheet.columns.reduce((acc, c) => acc + (c.width ?? 10), 0);
  }

  merged(row: number, from = 1): XlsxCell {
    if (this.lastCol > from) this.sheet.mergeCells(row, from, row, this.lastCol);
    return this.sheet.getCell(row, from);
  }

  skip(height?: number) {
    if (height) this.sheet.getRow(this.row).height = height;
    this.row += 1;
  }

  masthead(logoId: number | undefined, spec: ReportSpec, eyebrow: string, title: string) {
    const lines: [string, Partial<XlsxCell["font"]>, number][] = [
      [REPORT_INSTITUTION.toUpperCase(), { bold: true, size: 12, color: color(C.ink) }, 20],
      [REPORT_SYSTEM, { size: 9, color: color(C.muted) }, 16],
      [`Ref. ${reportReference(spec)}`, { size: 8, color: color(C.faint) }, 16],
    ];
    for (const [text, font, height] of lines) {
      const cell = this.merged(this.row);
      cell.value = text;
      cell.font = font;
      cell.alignment = { horizontal: "right", vertical: "middle" };
      this.sheet.getRow(this.row).height = height;
      this.row += 1;
    }
    if (logoId !== undefined) {
      this.sheet.addImage(logoId, {
        tl: { col: 0.05, row: 0.1 },
        ext: { width: LOGO_HEIGHT * REPORT_LOGO_ASPECT, height: LOGO_HEIGHT },
        editAs: "absolute",
      });
    }

    // Brand rule: a short orange lead-in, then blue across the sheet.
    this.sheet.getRow(this.row).height = 3;
    for (let col = 1; col <= this.lastCol; col++) {
      this.sheet.getCell(this.row, col).fill = fill(col === 1 ? C.secondary : C.primary);
    }
    this.row += 1;
    this.skip(10);

    const eyebrowCell = this.merged(this.row);
    eyebrowCell.value = eyebrow.toUpperCase();
    eyebrowCell.font = { bold: true, size: 8, color: color(C.accentText) };
    this.row += 1;

    const titleCell = this.merged(this.row);
    titleCell.value = title;
    titleCell.font = { bold: true, size: 15, color: color(C.ink) };
    titleCell.alignment = { vertical: "middle" };
    this.sheet.getRow(this.row).height = 24;
    this.row += 1;
    this.skip();
  }

  details(rows: [string, string][]) {
    const valueChars = this.widthChars - (this.sheet.getColumn(1).width ?? 10);
    rows.forEach(([label, value], index) => {
      const border: Partial<Borders> = { bottom: hair };
      if (index === 0) border.top = { style: "thin", color: color(C.ink) };
      const labelCell = this.sheet.getCell(this.row, 1);
      labelCell.value = label;
      labelCell.font = { bold: true, size: 8, color: color(C.muted) };
      labelCell.alignment = { vertical: "middle" };
      const valueCell = this.merged(this.row, 2);
      valueCell.value = value;
      valueCell.font = { size: 10, color: color(C.ink) };
      valueCell.alignment = { vertical: "middle", wrapText: true };
      for (let col = 1; col <= this.lastCol; col++) this.sheet.getCell(this.row, col).border = border;
      this.sheet.getRow(this.row).height = Math.max(17, wrappedHeight(value, valueChars * 0.95));
      this.row += 1;
    });
    this.skip();
  }

  sectionTitle(text: string) {
    const cell = this.sheet.getCell(this.row, 1);
    cell.value = text;
    cell.font = { bold: true, size: 11, color: color(C.ink) };
    for (let col = 1; col <= this.lastCol; col++) {
      this.sheet.getCell(this.row, col).border = { bottom: { style: "thin", color: color(C.primary) } };
    }
    this.sheet.getRow(this.row).height = 20;
    this.row += 1;
  }

  headerRow(headers: { text: string; col: number; toCol?: number; align?: "left" | "right" }[], height: number, size: number) {
    for (let col = 1; col <= this.lastCol; col++) {
      const cell = this.sheet.getCell(this.row, col);
      cell.fill = fill(C.headerFill);
      cell.border = {
        top: { style: "thin", color: color(C.primary) },
        bottom: { style: "medium", color: color(C.primary) },
      };
    }
    for (const h of headers) {
      if (h.toCol && h.toCol > h.col) this.sheet.mergeCells(this.row, h.col, this.row, h.toCol);
      const cell = this.sheet.getCell(this.row, h.col);
      cell.value = h.text;
      cell.font = { bold: true, size, color: color(C.ink) };
      cell.alignment = { horizontal: h.align ?? "left", vertical: "middle", wrapText: true, indent: 1 };
    }
    this.sheet.getRow(this.row).height = height;
    this.row += 1;
  }

  bodyRowStyle(index: number, highlighted = false) {
    for (let col = 1; col <= this.lastCol; col++) {
      const cell = this.sheet.getCell(this.row, col);
      cell.border = { bottom: hair };
      if (highlighted) cell.fill = fill(C.highlight);
      else if (index % 2 === 1) cell.fill = fill(C.zebra);
    }
  }
}

async function fetchDataUrl(src: string): Promise<string | undefined> {
  try {
    const blob = await (await fetch(src)).blob();
    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch {
    return undefined;
  }
}

function setupSheet(sheet: Worksheet, spec: ReportSpec, printTitleRow?: number) {
  sheet.pageSetup = {
    paperSize: 9,
    orientation: spec.orientation,
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
    margins: { left: 0.5, right: 0.5, top: 0.75, bottom: 0.75, header: 0.3, footer: 0.3 },
    ...(printTitleRow ? { printTitlesRow: `${printTitleRow}:${printTitleRow}` } : {}),
  };
  sheet.headerFooter = {
    oddHeader: `&L&8${REPORT_INSTITUTION}&R&8${REPORT_CLASSIFICATION}`,
    oddFooter: `&L&8Ref. ${reportReference(spec)}&R&8Page &P of &N`,
  };
}

function columnWidths(table: ReportTable): number[] {
  return table.columns.map((col, i) => {
    const longest = Math.max(
      col.header.length,
      ...table.rows.map((row) => {
        const { value, kind } = cellParts(row[i], col);
        if (value === null) return 1;
        if (typeof value === "string") return value.length;
        return kind === "percent" ? 8 : Math.round(value).toLocaleString("en-US").length + (kind === "etb" || kind === "etbRound" ? 3 : 0);
      }),
    );
    return Math.min(70, Math.max(16, Math.ceil(longest * 1.15) + 6));
  });
}

function writeSummary(workbook: Workbook, logoId: number | undefined, spec: ReportSpec, tableSheets: { title: string; name: string; rows: number }[]) {
  const sheet = workbook.addWorksheet("Summary", {
    views: [{ showGridLines: false }],
    properties: { tabColor: color(C.primary) },
  });
  sheet.columns = SUMMARY_WIDTHS.map((width) => ({ width }));
  const w = new SheetWriter(sheet, SUMMARY_WIDTHS.length);
  setupSheet(sheet, spec);

  w.masthead(logoId, spec, spec.eyebrow, spec.title);
  w.details([
    ["Report", spec.reportName],
    ["Reference", reportReference(spec)],
    ["Reporting period", spec.periodLabel],
    ["Scope", spec.scope],
    ["Prepared by", spec.preparedBy],
    ["Access level", spec.accessLevel],
    ["Generated on", formatGeneratedOn(spec.generatedAt)],
    ["Classification", REPORT_CLASSIFICATION],
  ]);

  const figures: { label: string; value: string; detail: string; long?: boolean }[] = [
    ...(spec.headline ? [{ label: "Headline", ...spec.headline }] : []),
    ...spec.keyFigures.map((f) => ({ label: f.label, value: f.value, detail: f.detail ?? "" })),
    ...spec.takeaways.map((t, i) => ({ label: `Takeaway ${i + 1}`, value: t, detail: "", long: true })),
  ];
  if (figures.length) {
    w.sectionTitle("Key figures");
    w.headerRow(
      [
        { text: "Metric", col: 1 },
        { text: "Value", col: 2 },
        { text: "Detail", col: 3, toCol: 4 },
      ],
      20,
      9,
    );
    figures.forEach((f, index) => {
      w.bodyRowStyle(index);
      const label = sheet.getCell(w.row, 1);
      label.value = f.label;
      label.font = { size: 10, color: color(C.ink) };
      // A long takeaway spans Value and Detail so it can wrap across the width.
      const value = f.long ? w.merged(w.row, 2) : sheet.getCell(w.row, 2);
      value.value = f.value;
      value.font = { bold: !f.long, size: f.long ? 10 : 11, color: color(C.ink) };
      if (!f.long) {
        sheet.mergeCells(w.row, 3, w.row, 4);
        const detail = sheet.getCell(w.row, 3);
        detail.value = f.detail;
        detail.font = { size: 10, color: color(C.muted) };
      }
      for (let col = 1; col <= 4; col++) {
        sheet.getCell(w.row, col).alignment = { vertical: "middle", wrapText: true, indent: 1 };
      }
      const chars = f.long ? SUMMARY_WIDTHS[1] + SUMMARY_WIDTHS[2] + SUMMARY_WIDTHS[3] : SUMMARY_WIDTHS[2] + SUMMARY_WIDTHS[3];
      const text = f.long ? f.value : f.detail;
      sheet.getRow(w.row).height = Math.max(21, wrappedHeight(text, chars * 0.9, 14) + 6);
      w.row += 1;
    });
    w.skip();
  }

  w.sectionTitle("Contents");
  for (const t of tableSheets) {
    const link = sheet.getCell(w.row, 1);
    link.value = { text: t.title, hyperlink: `#'${t.name}'!A1` };
    link.font = { underline: true, size: 10, color: color(C.accentText) };
    const count = sheet.getCell(w.row, 2);
    count.value = `${t.rows} ${t.rows === 1 ? "row" : "rows"}`;
    count.font = { size: 10, color: color(C.muted) };
    w.row += 1;
  }
  w.skip();

  w.sectionTitle("Notes");
  const notes = [
    STANDARD_NOTES.currency,
    STANDARD_NOTES.filters,
    ...spec.notes,
    STANDARD_NOTES.signature,
    STANDARD_NOTES.confidentiality,
  ];
  const noteChars = SUMMARY_WIDTHS.reduce((a, b) => a + b, 0) * 1.05;
  for (const note of notes) {
    const cell = w.merged(w.row);
    cell.value = `•  ${note}`;
    cell.font = { size: 9, color: color(C.muted) };
    cell.alignment = { vertical: "top", wrapText: true };
    sheet.getRow(w.row).height = wrappedHeight(note, noteChars, 13) + 2;
    w.row += 1;
  }
  w.skip();

  const end = w.merged(w.row);
  end.value = "END OF REPORT";
  end.font = { size: 8, color: color(C.faint) };
  end.alignment = { horizontal: "center" };
}

function writeTableSheet(workbook: Workbook, logoId: number | undefined, spec: ReportSpec, table: ReportTable, name: string) {
  let widths = columnWidths(table);
  // Keep at least four columns so the masthead has room beside the logo.
  while (widths.length < 4) widths.push(16);
  // Stretch to the Summary sheet's width so every sheet reads as one document.
  const total = widths.reduce((a, b) => a + b, 0);
  if (total < SUMMARY_TOTAL_WIDTH) widths = widths.map((w) => Math.round((w * SUMMARY_TOTAL_WIDTH) / total));
  const sheet = workbook.addWorksheet(name, { views: [{ showGridLines: false }] });
  sheet.columns = widths.map((width) => ({ width }));
  const w = new SheetWriter(sheet, widths.length);

  w.masthead(logoId, spec, spec.eyebrow, table.title);
  w.details([
    ["Report", spec.reportName],
    ["Reporting period", spec.periodLabel],
    ["Scope", spec.scope],
    ...(table.note ? ([["Note", table.note]] as [string, string][]) : []),
  ]);

  const headerRow = w.row;
  const lastTableCol = table.columns.length;
  w.headerRow(
    table.columns.map((col, i) => ({
      text: col.header,
      col: i + 1,
      align: col.kind === "text" ? ("left" as const) : ("right" as const),
    })),
    24,
    10,
  );

  table.rows.forEach((row, index) => {
    const highlighted = index === table.highlightRow;
    w.bodyRowStyle(index, highlighted);
    row.forEach((raw, i) => {
      const column = table.columns[i];
      const { value, kind } = cellParts(raw, column);
      const cell = sheet.getCell(w.row, i + 1);
      cell.value = value ?? "—";
      cell.numFmt = typeof value === "number" ? NUM_FMT[kind] : "@";
      cell.font = { bold: highlighted, size: 10, color: color(C.ink) };
      cell.alignment = {
        horizontal: column.kind === "text" ? "left" : "right",
        vertical: "middle",
        wrapText: typeof value === "string" && value.length > 40,
        indent: 1,
      };
    });
    const longest = Math.max(0, ...row.map((raw, i) => {
      const v = cellParts(raw, table.columns[i]).value;
      return typeof v === "string" ? Math.ceil(v.length / Math.max(10, widths[i] * 0.9)) : 1;
    }));
    sheet.getRow(w.row).height = Math.max(18, longest * 14 + 4);
    w.row += 1;
  });

  if (table.rows.length) {
    sheet.autoFilter = { from: { row: headerRow, column: 1 }, to: { row: w.row - 1, column: lastTableCol } };
  }
  sheet.views = [{ state: "frozen", ySplit: headerRow, topLeftCell: `A${headerRow + 1}`, showGridLines: false }];
  setupSheet(sheet, spec, headerRow);
}

export async function buildReportXlsx(spec: ReportSpec, logoSrc: string): Promise<Blob> {
  const { default: ExcelJS } = await import("exceljs");
  const workbook = new ExcelJS.Workbook();
  workbook.creator = spec.preparedBy;
  workbook.company = REPORT_INSTITUTION;
  workbook.title = spec.reportName;
  workbook.created = spec.generatedAt;

  const logo = await fetchDataUrl(logoSrc);
  const logoId = logo ? workbook.addImage({ base64: logo, extension: "png" }) : undefined;

  const tableSheets = spec.tables.map((t) => ({ title: t.title, name: sheetName(t.title), rows: t.rows.length }));
  writeSummary(workbook, logoId, spec, tableSheets);
  spec.tables.forEach((table, i) => writeTableSheet(workbook, logoId, spec, table, tableSheets[i].name));

  const buffer = await workbook.xlsx.writeBuffer();
  return new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
}
