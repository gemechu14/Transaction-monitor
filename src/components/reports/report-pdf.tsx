import { Document, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";

import {
  REPORT_CLASSIFICATION,
  REPORT_COLORS as C,
  REPORT_INSTITUTION,
  REPORT_LOGO_ASPECT,
  REPORT_SYSTEM,
  STANDARD_NOTES,
  cellParts,
  formatCell,
  formatChange,
  formatGeneratedOn,
  reportReference,
  type BarTone,
  type Cell,
  type KeyFigure,
  type ReportBarChart,
  type ReportColumn,
  type ReportSpec,
  type ReportTable,
} from "./report-spec";

/**
 * The PDF form of a report: masthead, title block, key figures, takeaways and
 * the tables flagged `pdf`. Only @react-pdf primitives, so it's loaded on demand.
 */

const LOGO_HEIGHT = 34;

const styles = StyleSheet.create({
  page: {
    paddingTop: 28,
    paddingBottom: 60,
    paddingHorizontal: 40,
    fontFamily: "Helvetica",
    fontSize: 8,
    color: C.ink,
    backgroundColor: "#FFFFFF",
  },
  masthead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  mastheadText: { alignItems: "flex-end" },
  logo: { height: LOGO_HEIGHT, width: LOGO_HEIGHT * REPORT_LOGO_ASPECT },
  institution: {
    fontSize: 10.5,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 1,
    color: C.ink,
    textAlign: "right",
  },
  system: { fontSize: 7.5, color: C.muted, textAlign: "right", marginTop: 3 },
  rule: { flexDirection: "row", marginTop: 10, height: 1.5 },
  ruleLead: { width: 54, backgroundColor: C.secondary },
  ruleRest: { flex: 1, backgroundColor: C.primary },
  eyebrow: {
    marginTop: 14,
    fontSize: 7.5,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 1.6,
    color: C.accentText,
    textTransform: "uppercase",
  },
  title: { marginTop: 4, fontSize: 21, fontFamily: "Helvetica-Bold", color: C.ink },
  subtitle: { marginTop: 5, fontSize: 8, color: C.muted },
  figures: { flexDirection: "row", marginTop: 20 },
  figure: { flex: 1, paddingRight: 14 },
  figureLabel: {
    fontSize: 6.5,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 0.4,
    color: C.muted,
    textTransform: "uppercase",
  },
  figureValue: { marginTop: 5, fontSize: 15, fontFamily: "Helvetica-Bold", color: C.ink },
  figureDetail: { marginTop: 3, fontSize: 6.5, color: C.muted },
  section: { marginTop: 24 },
  sectionHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 6 },
  sectionTitle: {
    fontSize: 7.5,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 1.6,
    color: C.accentText,
    textTransform: "uppercase",
  },
  sectionNote: { fontSize: 6.5, color: C.faint },
  bullet: { flexDirection: "row", marginBottom: 5 },
  bulletDot: { width: 10, fontSize: 8, color: C.primary },
  bulletText: { flex: 1, fontSize: 8, lineHeight: 1.45, color: C.ink },
  table: {},
  headRow: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: C.primary,
    backgroundColor: C.headerFill,
    borderBottomWidth: 0.75,
    borderBottomColor: C.primary,
  },
  headCell: { paddingVertical: 7, paddingHorizontal: 7, fontSize: 6.5, fontFamily: "Helvetica-Bold", color: C.ink },
  row: { flexDirection: "row", borderBottomWidth: 0.5, borderBottomColor: C.line },
  cell: { paddingVertical: 5.5, paddingHorizontal: 7, fontSize: 8, color: C.ink },
  totalRow: { flexDirection: "row", borderTopWidth: 0.75, borderTopColor: C.ink, borderBottomWidth: 0.75, borderBottomColor: C.ink, backgroundColor: C.headerFill },
  cellBox: { paddingVertical: 4.5, paddingHorizontal: 7 },
  cellBoxText: { fontSize: 8, color: C.ink, textAlign: "right" },
  cellBarTrack: { marginTop: 2.5, height: 2.5, backgroundColor: C.line, flexDirection: "row" },
  notes: { marginTop: 16 },
  note: { fontSize: 6.5, lineHeight: 1.45, color: C.faint, marginBottom: 2 },
  details: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 14,
    borderTopWidth: 0.75,
    borderTopColor: C.ink,
    borderBottomWidth: 0.5,
    borderBottomColor: C.line,
    paddingTop: 7,
    paddingBottom: 2,
  },
  detail: { width: "33.33%", paddingRight: 10, marginBottom: 6 },
  detailLabel: { fontSize: 5.8, fontFamily: "Helvetica-Bold", letterSpacing: 0.6, color: C.faint, textTransform: "uppercase" },
  detailValue: { marginTop: 2, fontSize: 7.5, color: C.ink },
  callout: {
    marginTop: 16,
    paddingVertical: 11,
    paddingHorizontal: 14,
    backgroundColor: C.calloutFill,
    borderLeftWidth: 3,
    borderLeftColor: C.primary,
  },
  calloutHeadline: { marginTop: 4, fontSize: 12.5, fontFamily: "Helvetica-Bold", color: C.ink, lineHeight: 1.3 },
  calloutDetail: { marginTop: 3, fontSize: 8, color: C.muted, lineHeight: 1.4 },
  chartsRow: { flexDirection: "row", marginTop: 24 },
  chartCol: { flex: 1 },
  legend: { flexDirection: "row", marginBottom: 8 },
  legendItem: { flexDirection: "row", alignItems: "center", marginRight: 12 },
  legendSwatch: { width: 7, height: 7, marginRight: 4 },
  legendText: { fontSize: 6.8, color: C.muted },
  chartGroup: { flexDirection: "row", alignItems: "center", paddingVertical: 4, borderBottomWidth: 0.5, borderBottomColor: C.line },
  chartLabel: { width: 78, fontSize: 7, color: C.ink, paddingRight: 6 },
  chartBarRow: { flexDirection: "row", alignItems: "center", marginVertical: 1.2 },
  chartTrack: { flex: 1, flexDirection: "row", height: 7 },
  chartValue: { width: 58, fontSize: 6.8, color: C.ink, textAlign: "right" },
  splitGroup: { marginBottom: 12 },
  splitLabel: { fontSize: 7, color: C.ink, marginBottom: 4 },
  splitBar: { flexDirection: "row", height: 16 },
  splitText: { fontSize: 7, fontFamily: "Helvetica-Bold", color: "#FFFFFF", paddingTop: 4, paddingHorizontal: 5 },
  splitCaption: { flexDirection: "row", justifyContent: "space-between", marginTop: 3 },
  splitCaptionText: { fontSize: 6.5, color: C.muted },
  endMark: { marginTop: 14, fontSize: 6.5, color: C.faint, textAlign: "center", letterSpacing: 1.2 },
  footer: {
    position: "absolute",
    left: 40,
    right: 40,
    bottom: 28,
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 0.5,
    borderTopColor: C.line,
    paddingTop: 8,
    fontSize: 6.5,
    color: C.faint,
  },
});

/** The built-in Helvetica only covers WinAnsi, so swap the few glyphs it can't draw. */
function pdfText(value: string): string {
  return value
    .replace(/≈\s*/g, "~ ")
    .replace(/−/g, "-")
    .replace(/[◀▶]/g, "")
    .replace(/[  ]/g, " ");
}

function KeyFigures({ figures }: { figures: KeyFigure[] }) {
  // Three to a row, as on the dashboard.
  const rows: KeyFigure[][] = [];
  for (let i = 0; i < figures.length; i += 3) rows.push(figures.slice(i, i + 3));
  return (
    <View>
      {rows.map((row, r) => (
        <View key={r} style={[styles.figures, r > 0 ? { marginTop: 14 } : {}]} wrap={false}>
          {[0, 1, 2].map((i) =>
            row[i] ? (
              <View key={i} style={styles.figure}>
                <Text style={styles.figureLabel}>{pdfText(row[i].label)}</Text>
                <Text style={styles.figureValue}>{pdfText(row[i].value)}</Text>
                {row[i].detail ? <Text style={styles.figureDetail}>{pdfText(row[i].detail!)}</Text> : null}
              </View>
            ) : (
              <View key={i} style={styles.figure} />
            ),
          )}
        </View>
      ))}
    </View>
  );
}

function SectionHead({ title, note }: { title: string; note?: string }) {
  return (
    <View style={styles.sectionHead}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {note ? <Text style={styles.sectionNote}>{pdfText(note)}</Text> : null}
    </View>
  );
}

const TONE_COLOR: Record<BarTone, string> = { a: C.sideA, b: C.sideB, neutral: C.primary };

/** Green for a rise, red for a fall, on "change" cells. */
function changeColor(cell: Cell, column: ReportColumn): string | undefined {
  const { value, kind } = cellParts(cell, column);
  if (kind !== "change" || typeof value !== "number" || formatChange(value) === "0.0%") return undefined;
  return value > 0 ? C.positive : C.negative;
}

function TableSection({ table }: { table: ReportTable }) {
  const widths = table.columns.map((c) => c.width ?? (c.kind === "text" ? 1.6 : 1));
  const align = (i: number) => (table.columns[i].kind === "text" ? "left" : "right");
  const highlights = new Set(table.highlightRows ?? []);
  // Bar columns scale to their largest value.
  const barMax = table.columns.map((col, i) =>
    col.bar ? Math.max(0, ...table.rows.map((row) => Number(cellParts(row[i], col).value) || 0)) : 0,
  );

  const renderRow = (row: Cell[], bold: boolean, isTotal = false) =>
    row.map((cell, i) => {
      const column = table.columns[i];
      const text = pdfText(formatCell(cell, column));
      const tint = changeColor(cell, column);
      const font = bold || tint ? { fontFamily: "Helvetica-Bold" } : {};
      const value = cellParts(cell, column).value;
      if (column.bar && !isTotal && typeof value === "number" && barMax[i] > 0) {
        const share = Math.min(1, Math.max(0, value / barMax[i]));
        return (
          <View key={i} style={[styles.cellBox, { flex: widths[i] }]}>
            <Text style={[styles.cellBoxText, font]}>{text}</Text>
            <View style={styles.cellBarTrack}>
              {share > 0 ? <View style={{ flex: share, backgroundColor: C.primary }} /> : null}
              <View style={{ flex: 1 - share }} />
            </View>
          </View>
        );
      }
      return (
        <Text key={i} style={[styles.cell, { flex: widths[i], textAlign: align(i) }, font, tint ? { color: tint } : {}]}>
          {text}
        </Text>
      );
    });

  return (
    <View style={styles.section} break={table.pageBreak}>
      <View wrap={false}>
        <SectionHead title={table.title} note={table.note} />
      </View>
      <View style={styles.table}>
        <View style={styles.headRow} fixed>
          {table.columns.map((col, i) => (
            <Text key={col.header} style={[styles.headCell, { flex: widths[i], textAlign: align(i) }]}>
              {pdfText(col.header)}
            </Text>
          ))}
        </View>
        {table.rows.map((row, r) => {
          const highlighted = highlights.has(r);
          return (
            <View
              key={r}
              wrap={false}
              style={[
                styles.row,
                r % 2 === 1 ? { backgroundColor: C.zebra } : {},
                highlighted ? { backgroundColor: C.highlight } : {},
              ]}
            >
              {renderRow(row, highlighted)}
            </View>
          );
        })}
        {table.totalRow ? (
          <View style={styles.totalRow} wrap={false}>
            {renderRow(table.totalRow, true, true)}
          </View>
        ) : null}
      </View>
    </View>
  );
}

function ReportDetails({ spec, reference }: { spec: ReportSpec; reference: string }) {
  const items: [string, string][] = [
    ["Reference", reference],
    ["Reporting period", spec.periodLabel],
    ["Scope", spec.scope],
    ["Prepared by", `${spec.preparedBy} (${spec.accessLevel})`],
    ["Generated on", formatGeneratedOn(spec.generatedAt)],
    ["Classification", REPORT_CLASSIFICATION],
  ];
  return (
    <View style={styles.details} wrap={false}>
      {items.map(([label, value]) => (
        <View key={label} style={styles.detail}>
          <Text style={styles.detailLabel}>{label}</Text>
          <Text style={styles.detailValue}>{pdfText(value)}</Text>
        </View>
      ))}
    </View>
  );
}

function Legend({ items }: { items: ReportBarChart["legend"] }) {
  return (
    <View style={styles.legend}>
      {items.map((item) => (
        <View key={item.label} style={styles.legendItem}>
          <View style={[styles.legendSwatch, { backgroundColor: TONE_COLOR[item.tone] }]} />
          <Text style={styles.legendText}>{pdfText(item.label)}</Text>
        </View>
      ))}
    </View>
  );
}

function BarChart({ chart }: { chart: ReportBarChart }) {
  const chartMax = Math.max(0, ...chart.groups.flatMap((g) => g.bars.map((b) => b.value ?? 0)));
  return (
    <View wrap={false}>
      <SectionHead title={chart.title} note={chart.note} />
      <Legend items={chart.legend} />
      {chart.kind === "split"
        ? chart.groups.map((group) => (
            <View key={group.label} style={styles.splitGroup}>
              <Text style={styles.splitLabel}>{pdfText(group.label)}</Text>
              <View style={[styles.splitBar, { backgroundColor: C.line }]}>
                {group.bars.map((bar, i) =>
                  bar.value ? (
                    <View key={i} style={{ flex: bar.value, backgroundColor: TONE_COLOR[bar.tone] }}>
                      {bar.value >= 0.14 ? <Text style={styles.splitText}>{pdfText(bar.display)}</Text> : null}
                    </View>
                  ) : null,
                )}
              </View>
              <View style={styles.splitCaption}>
                {group.bars.map((bar, i) => (
                  <Text key={i} style={styles.splitCaptionText}>
                    {pdfText(`${chart.legend[i]?.label ?? ""} ${bar.display}`)}
                  </Text>
                ))}
              </View>
            </View>
          ))
        : chart.groups.map((group) => {
            const max = chart.scale === "chart" ? chartMax : Math.max(0, ...group.bars.map((b) => b.value ?? 0));
            return (
              <View key={group.label} style={styles.chartGroup}>
                <Text style={styles.chartLabel}>{pdfText(group.label)}</Text>
                <View style={{ flex: 1 }}>
                  {group.bars.map((bar, i) => (
                    <View key={i} style={styles.chartBarRow}>
                      <View style={styles.chartTrack}>
                        {bar.value && max > 0 ? (
                          <View
                            style={{
                              width: `${Math.max(1, (bar.value / max) * 100)}%`,
                              backgroundColor: TONE_COLOR[bar.tone],
                            }}
                          />
                        ) : null}
                      </View>
                      <Text style={styles.chartValue}>{pdfText(bar.display)}</Text>
                    </View>
                  ))}
                </View>
              </View>
            );
          })}
    </View>
  );
}

function Charts({ charts }: { charts: ReportBarChart[] }) {
  // Two charts sit side by side; any other number stacks.
  if (charts.length === 2) {
    return (
      <View style={styles.chartsRow} wrap={false}>
        <View style={[styles.chartCol, { marginRight: 14 }]}>
          <BarChart chart={charts[0]} />
        </View>
        <View style={[styles.chartCol, { marginLeft: 14 }]}>
          <BarChart chart={charts[1]} />
        </View>
      </View>
    );
  }
  return (
    <View>
      {charts.map((chart) => (
        <View key={chart.title} style={styles.section}>
          <BarChart chart={chart} />
        </View>
      ))}
    </View>
  );
}

export function ReportPdf({ spec, logoSrc }: { spec: ReportSpec; logoSrc: string }) {
  const reference = reportReference(spec);
  return (
    <Document title={spec.title} author={spec.preparedBy} subject={spec.reportName} creator={REPORT_INSTITUTION}>
      <Page size="A4" orientation={spec.orientation} style={styles.page}>
        <View style={styles.masthead}>
          {/* eslint-disable-next-line jsx-a11y/alt-text -- react-pdf Image has no alt */}
          <Image src={logoSrc} style={styles.logo} />
          <View style={styles.mastheadText}>
            <Text style={styles.institution}>{REPORT_INSTITUTION.toUpperCase()}</Text>
            <Text style={styles.system}>{REPORT_SYSTEM}</Text>
          </View>
        </View>
        <View style={styles.rule}>
          <View style={styles.ruleLead} />
          <View style={styles.ruleRest} />
        </View>

        <Text style={styles.eyebrow}>{spec.eyebrow}</Text>
        <Text style={styles.title}>{pdfText(spec.title)}</Text>
        <Text style={styles.subtitle}>{pdfText(spec.subtitle ?? spec.periodLabel)}</Text>

        {spec.executive ? <ReportDetails spec={spec} reference={reference} /> : null}

        {spec.executive && spec.headline ? (
          <View style={styles.callout} wrap={false}>
            <Text style={styles.sectionTitle}>Executive summary</Text>
            <Text style={styles.calloutHeadline}>{pdfText(spec.headline.value)}</Text>
            <Text style={styles.calloutDetail}>{pdfText(spec.headline.detail)}</Text>
          </View>
        ) : null}

        {spec.keyFigures.length ? <KeyFigures figures={spec.keyFigures} /> : null}

        {spec.charts?.length ? <Charts charts={spec.charts} /> : null}

        {spec.takeaways.length ? (
          <View style={styles.section}>
            <SectionHead title={spec.executive ? "Key findings" : "Key takeaways"} />
            {spec.takeaways.map((t, i) => (
              <View key={i} style={styles.bullet} wrap={false}>
                <Text style={styles.bulletDot}>•</Text>
                <Text style={styles.bulletText}>{pdfText(t)}</Text>
              </View>
            ))}
          </View>
        ) : null}

        {spec.tables
          .filter((t) => t.pdf)
          .map((t) => (
            <TableSection key={t.title} table={t} />
          ))}

        {spec.executive ? (
          <View style={styles.section} wrap={false}>
            <SectionHead title="Notes and methodology" />
            {[
              ...spec.notes,
              STANDARD_NOTES.currency,
              STANDARD_NOTES.filters,
              STANDARD_NOTES.signature,
              STANDARD_NOTES.confidentiality,
            ].map((n) => (
              <View key={n} style={styles.bullet}>
                <Text style={[styles.bulletDot, { fontSize: 6.5 }]}>•</Text>
                <Text style={[styles.note, { flex: 1, marginBottom: 0 }]}>{pdfText(n)}</Text>
              </View>
            ))}
            <Text style={styles.endMark}>END OF REPORT</Text>
          </View>
        ) : spec.notes.length ? (
          <View style={styles.notes} wrap={false}>
            {spec.notes.map((n) => (
              <Text key={n} style={styles.note}>
                {pdfText(n)}
              </Text>
            ))}
          </View>
        ) : null}

        <View style={styles.footer} fixed>
          <Text>
            {REPORT_CLASSIFICATION}  |  Ref. {reference}
          </Text>
          <Text render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}
