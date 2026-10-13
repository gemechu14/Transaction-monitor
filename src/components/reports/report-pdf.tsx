import { Document, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";

import {
  REPORT_CLASSIFICATION,
  REPORT_COLORS as C,
  REPORT_INSTITUTION,
  REPORT_LOGO_ASPECT,
  REPORT_SYSTEM,
  formatCell,
  reportReference,
  type KeyFigure,
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
  notes: { marginTop: 16 },
  note: { fontSize: 6.5, lineHeight: 1.45, color: C.faint, marginBottom: 2 },
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

function TableSection({ table }: { table: ReportTable }) {
  const widths = table.columns.map((c) => c.width ?? (c.kind === "text" ? 1.6 : 1));
  const align = (i: number) => (table.columns[i].kind === "text" ? "left" : "right");
  return (
    <View style={styles.section}>
      <View wrap={false}>
        <SectionHead title={table.title} note={table.note} />
      </View>
      <View style={styles.table}>
        <View style={styles.headRow} fixed>
          {table.columns.map((col, i) => (
            <Text key={col.header} style={[styles.headCell, { flex: widths[i], textAlign: align(i) }]}>
              {col.header}
            </Text>
          ))}
        </View>
        {table.rows.map((row, r) => {
          const highlighted = r === table.highlightRow;
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
              {row.map((cell, i) => (
                <Text
                  key={i}
                  style={[
                    styles.cell,
                    { flex: widths[i], textAlign: align(i) },
                    highlighted ? { fontFamily: "Helvetica-Bold" } : {},
                  ]}
                >
                  {pdfText(formatCell(cell, table.columns[i]))}
                </Text>
              ))}
            </View>
          );
        })}
      </View>
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

        {spec.keyFigures.length ? <KeyFigures figures={spec.keyFigures} /> : null}

        {spec.takeaways.length ? (
          <View style={styles.section}>
            <SectionHead title="Key takeaways" />
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

        {spec.notes.length ? (
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
