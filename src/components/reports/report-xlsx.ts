import type { ConditionalFormattingRule, Cell as XlsxCell, Workbook, Worksheet } from "exceljs";

import {
  REPORT_CLASSIFICATION,
  REPORT_COLORS as C,
  REPORT_INSTITUTION,
  REPORT_LOGO_ASPECT,
  REPORT_SYSTEM,
  STANDARD_NOTES,
  cellParts,
  reportReference,
  type CellKind,
  type ReportSpec,
  type ReportTable,
} from "./report-spec";

/**
 * Excel export, laid out like the PDF: a Summary sheet (key figures, takeaways,
 * notes) followed by one sheet per table, each with the same branded masthead.
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
  // Green rise, red fall.
  change: "[Color10]+0.0%;[Red]-0.0%;0.0%",
};

// ~215 characters: fills a full-HD Excel window at 100% zoom. Data sheets stretch to the same total.
const SUMMARY_WIDTHS = [42, 50, 86, 37];
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

  masthead(logoId: number | undefined, eyebrow: string, title: string, subtitle: string) {
    const lines: [string, Partial<XlsxCell["font"]>, number][] = [
      [REPORT_INSTITUTION.toUpperCase(), { bold: true, size: 12, color: color(C.ink) }, 24],
      [REPORT_SYSTEM, { size: 9, color: color(C.muted) }, 22],
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

    const subtitleCell = this.merged(this.row);
    subtitleCell.value = subtitle;
    subtitleCell.font = { size: 10, color: color(C.muted) };
    this.row += 1;
    this.skip();
  }

  /** Small muted paragraphs across the sheet, like the PDF's notes. */
  notes(lines: string[]) {
    for (const line of lines) {
      const cell = this.merged(this.row);
      cell.value = line;
      cell.font = { size: 9, color: color(C.muted) };
      cell.alignment = { vertical: "top", wrapText: true };
      this.sheet.getRow(this.row).height = wrappedHeight(line, this.widthChars * 1.05, 13) + 2;
      this.row += 1;
    }
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

function writeSummary(workbook: Workbook, logoId: number | undefined, spec: ReportSpec) {
  const sheet = workbook.addWorksheet("Summary", {
    views: [{ showGridLines: false }],
    properties: { tabColor: color(C.primary) },
  });
  sheet.columns = SUMMARY_WIDTHS.map((width) => ({ width }));
  const w = new SheetWriter(sheet, SUMMARY_WIDTHS.length);
  setupSheet(sheet, spec);

  w.masthead(logoId, spec.eyebrow, spec.title, spec.subtitle ?? spec.periodLabel);

  // An executive report opens with the verdict in its own box instead of a Headline row.
  if (spec.executive && spec.headline) {
    w.sectionTitle("Executive summary");
    const box: [string, Partial<XlsxCell["font"]>, number][] = [
      [spec.headline.value, { bold: true, size: 13, color: color(C.ink) }, 18],
      [spec.headline.detail, { size: 10, color: color(C.muted) }, 14],
    ];
    for (const [text, font, lineHeight] of box) {
      const cell = w.merged(w.row);
      cell.value = text;
      cell.font = font;
      cell.fill = fill(C.calloutFill);
      cell.border = { left: { style: "thick", color: color(C.primary) } };
      cell.alignment = { vertical: "middle", wrapText: true, indent: 1 };
      sheet.getRow(w.row).height = wrappedHeight(text, SUMMARY_TOTAL_WIDTH * 0.85, lineHeight) + 10;
      w.row += 1;
    }
    w.skip();
  }

  const figures = [
    ...(spec.headline && !spec.executive ? [{ label: "Headline", ...spec.headline }] : []),
    ...spec.keyFigures.map((f) => ({ label: f.label, value: f.value, detail: f.detail ?? "" })),
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
      const value = sheet.getCell(w.row, 2);
      value.value = f.value;
      value.font = { bold: true, size: 11, color: color(C.ink) };
      sheet.mergeCells(w.row, 3, w.row, 4);
      const detail = sheet.getCell(w.row, 3);
      detail.value = f.detail;
      detail.font = { size: 10, color: color(C.muted) };
      for (let col = 1; col <= 4; col++) {
        sheet.getCell(w.row, col).alignment = { vertical: "middle", wrapText: true, indent: 1 };
      }
      sheet.getRow(w.row).height = Math.max(21, wrappedHeight(f.detail, (SUMMARY_WIDTHS[2] + SUMMARY_WIDTHS[3]) * 0.9, 14) + 6);
      w.row += 1;
    });
    w.skip();
  }

  if (spec.takeaways.length) {
    w.sectionTitle(spec.executive ? "Key findings" : "Key takeaways");
    for (const t of spec.takeaways) {
      const cell = w.merged(w.row);
      cell.value = `•  ${t}`;
      cell.font = { size: 10, color: color(C.ink) };
      cell.alignment = { vertical: "top", wrapText: true };
      sheet.getRow(w.row).height = wrappedHeight(t, SUMMARY_TOTAL_WIDTH * 1.05, 14) + 4;
      w.row += 1;
    }
    w.skip();
  }

  w.notes(spec.executive ? [...spec.notes, STANDARD_NOTES.currency, STANDARD_NOTES.signature, STANDARD_NOTES.confidentiality] : spec.notes);
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

  w.masthead(logoId, spec.eyebrow, table.title, spec.periodLabel);
  if (table.note) {
    w.notes([table.note]);
    w.skip();
  }

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

  const firstBodyRow = w.row;
  const rows = [...table.rows, ...(table.totalRow ? [table.totalRow] : [])];
  rows.forEach((row, index) => {
    const isTotal = index === table.rows.length;
    const highlighted = isTotal || (table.highlightRows?.includes(index) ?? false);
    w.bodyRowStyle(index, highlighted && !isTotal);
    if (isTotal) {
      for (let col = 1; col <= w.lastCol; col++) {
        const cell = sheet.getCell(w.row, col);
        cell.fill = fill(C.headerFill);
        cell.border = { top: { style: "thin", color: color(C.ink) }, bottom: { style: "medium", color: color(C.ink) } };
      }
    }
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
    // The filter and data bars cover the body rows, not the total.
    const lastBodyRow = firstBodyRow + table.rows.length - 1;
    sheet.autoFilter = { from: { row: headerRow, column: 1 }, to: { row: lastBodyRow, column: lastTableCol } };
    table.columns.forEach((col, i) => {
      if (!col.bar) return;
      const letter = sheet.getColumn(i + 1).letter;
      sheet.addConditionalFormatting({
        ref: `${letter}${firstBodyRow}:${letter}${lastBodyRow}`,
        rules: [
          {
            type: "dataBar",
            priority: 1,
            gradient: false,
            cfvo: [{ type: "num", value: 0 }, { type: "max" }],
            color: color(C.primary),
          } as ConditionalFormattingRule,
        ],
      });
    });
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

  writeSummary(workbook, logoId, spec);
  spec.tables.forEach((table) => writeTableSheet(workbook, logoId, spec, table, sheetName(table.title)));

  const buffer = await workbook.xlsx.writeBuffer();
  return new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
}
