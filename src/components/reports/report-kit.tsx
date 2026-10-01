import { Document, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";

/**
 * Shared building blocks for the downloadable PDF reports. Everything here is
 * @react-pdf/renderer primitives, so this module is only ever loaded on demand
 * when the user exports (see `export-pdf-button.tsx`).
 */

export const PDF_COLORS = {
  brand: "#00ADEF",
  brandStrong: "#0073A6",
  brandSoft: "#E5F7FD",
  navy: "#0B3C5D",
  ink: "#14212B",
  muted: "#5A6B76",
  faint: "#8A99A3",
  line: "#DDE5EA",
  zebra: "#F6F9FB",
  orange: "#F8953F",
  danger: "#B42318",
};

const styles = StyleSheet.create({
  page: {
    // Leaves room for the fixed header, which repeats on every page.
    paddingTop: 98,
    paddingBottom: 56,
    paddingHorizontal: 0,
    fontFamily: "Helvetica",
    fontSize: 9,
    color: PDF_COLORS.ink,
    backgroundColor: "#FFFFFF",
  },
  masthead: { position: "absolute", top: 0, left: 0, right: 0 },
  accent: { height: 5, backgroundColor: PDF_COLORS.brand },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 36,
    paddingTop: 18,
    paddingBottom: 16,
    backgroundColor: PDF_COLORS.navy,
  },
  brandRow: { flexDirection: "row", alignItems: "center" },
  logoWrap: {
    width: 38,
    height: 38,
    borderRadius: 8,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  logo: { width: 28, height: 28 },
  brandName: { fontSize: 13, fontFamily: "Helvetica-Bold", color: "#FFFFFF" },
  brandTag: { fontSize: 8, color: "#B9D3E3", marginTop: 2 },
  headerMeta: { alignItems: "flex-end" },
  headerMetaLabel: { fontSize: 7, color: "#B9D3E3", textTransform: "uppercase", letterSpacing: 0.8 },
  headerMetaValue: { fontSize: 9, color: "#FFFFFF", marginTop: 2, marginBottom: 5 },
  body: { paddingHorizontal: 36 },
  titleBlock: { marginBottom: 16 },
  eyebrow: {
    fontSize: 8,
    color: PDF_COLORS.brandStrong,
    fontFamily: "Helvetica-Bold",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  title: { fontSize: 20, fontFamily: "Helvetica-Bold", marginTop: 4, letterSpacing: -0.3 },
  chips: { flexDirection: "row", flexWrap: "wrap", marginTop: 8 },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: PDF_COLORS.brandSoft,
    color: PDF_COLORS.brandStrong,
    borderRadius: 10,
    paddingVertical: 3,
    paddingHorizontal: 8,
    marginRight: 6,
    marginBottom: 4,
    fontSize: 8,
  },
  chipDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: PDF_COLORS.brand, marginRight: 4 },
  section: { marginTop: 14 },
  sectionHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    borderBottomWidth: 1,
    borderBottomColor: PDF_COLORS.line,
    paddingBottom: 5,
    marginBottom: 8,
  },
  sectionTitle: { fontSize: 11, fontFamily: "Helvetica-Bold" },
  sectionNote: { fontSize: 7.5, color: PDF_COLORS.muted },
  tiles: { flexDirection: "row", flexWrap: "wrap", marginHorizontal: -4 },
  tile: { width: "33.333%", paddingHorizontal: 4, marginBottom: 8 },
  tileInner: {
    borderWidth: 1,
    borderColor: PDF_COLORS.line,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderTopWidth: 3,
    borderTopColor: PDF_COLORS.brand,
  },
  tileLabel: { fontSize: 8, color: PDF_COLORS.muted, fontFamily: "Helvetica-Bold" },
  tileValue: { fontSize: 17, fontFamily: "Helvetica-Bold", color: "#0099D6", marginTop: 4 },
  tileDetail: { fontSize: 7.5, color: PDF_COLORS.muted, marginTop: 3 },
  table: { borderWidth: 1, borderColor: PDF_COLORS.line, borderRadius: 6 },
  tr: { flexDirection: "row", borderTopWidth: 1, borderTopColor: PDF_COLORS.line, alignItems: "center" },
  th: {
    flexDirection: "row",
    backgroundColor: PDF_COLORS.navy,
    color: "#FFFFFF",
    borderTopLeftRadius: 5,
    borderTopRightRadius: 5,
  },
  thCell: { fontSize: 7.5, fontFamily: "Helvetica-Bold", paddingVertical: 6, paddingHorizontal: 8 },
  td: { fontSize: 8.5, paddingVertical: 5.5, paddingHorizontal: 8 },
  dot: { width: 6, height: 6, borderRadius: 3, marginRight: 5 },
  footer: {
    position: "absolute",
    left: 36,
    right: 36,
    bottom: 22,
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: PDF_COLORS.line,
    paddingTop: 7,
    fontSize: 7,
    color: PDF_COLORS.faint,
  },
});

export interface ReportMeta {
  /** Small caps line above the title, e.g. "Overview report". */
  eyebrow: string;
  title: string;
  /** Filter chips under the title, e.g. platform and period. */
  chips: string[];
  periodLabel: string;
  generatedBy: string;
  generatedAt: Date;
  logoSrc: string;
}

export function formatGeneratedAt(date: Date): string {
  return date.toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** The built-in Helvetica only covers WinAnsi, so swap the few UI glyphs it can't draw. */
export function pdfText(value: string): string {
  return value.replace(/≈/g, "~").replace(/ /g, " ");
}

export function ReportDocument({ meta, children }: { meta: ReportMeta; children: React.ReactNode }) {
  return (
    <Document title={meta.title} author={meta.generatedBy} creator="WSO2 Transaction Ops">
      <Page size="A4" style={styles.page}>
        <View style={styles.masthead} fixed>
          <View style={styles.accent} />
          <View style={styles.header}>
            <View style={styles.brandRow}>
              <View style={styles.logoWrap}>
                {/* eslint-disable-next-line jsx-a11y/alt-text -- react-pdf Image has no alt */}
                <Image src={meta.logoSrc} style={styles.logo} />
              </View>
              <View>
                <Text style={styles.brandName}>WSO2 Transaction Ops</Text>
                <Text style={styles.brandTag}>Transaction monitoring</Text>
              </View>
            </View>
            <View style={styles.headerMeta}>
              <Text style={styles.headerMetaLabel}>Reporting period</Text>
              <Text style={styles.headerMetaValue}>{meta.periodLabel}</Text>
              <Text style={styles.headerMetaLabel}>Generated</Text>
              <Text style={[styles.headerMetaValue, { marginBottom: 0 }]}>
                {formatGeneratedAt(meta.generatedAt)}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.body}>
          <View style={styles.titleBlock}>
            <Text style={styles.eyebrow}>{meta.eyebrow}</Text>
            <Text style={styles.title}>{meta.title}</Text>
            <View style={styles.chips}>
              {meta.chips.map((chip) => (
                <View key={chip} style={styles.chip}>
                  <View style={styles.chipDot} />
                  <Text>{chip}</Text>
                </View>
              ))}
            </View>
          </View>
          {children}
        </View>

        <View style={styles.footer} fixed>
          <Text>Confidential · Internal use only · Prepared for {meta.generatedBy}</Text>
          <Text render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}

export function Section({
  title,
  note,
  children,
  breakBefore,
}: {
  title: string;
  note?: string;
  children: React.ReactNode;
  breakBefore?: boolean;
}) {
  return (
    <View style={styles.section} break={breakBefore} wrap={false}>
      <View style={styles.sectionHead}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {note ? <Text style={styles.sectionNote}>{note}</Text> : null}
      </View>
      {children}
    </View>
  );
}

export interface Tile {
  label: string;
  value: string;
  detail?: string;
}

export function KpiTiles({ tiles }: { tiles: Tile[] }) {
  return (
    <View style={styles.tiles}>
      {tiles.map((tile) => (
        <View key={tile.label} style={styles.tile}>
          <View style={styles.tileInner}>
            <Text style={styles.tileLabel}>{tile.label}</Text>
            <Text style={styles.tileValue}>{pdfText(tile.value)}</Text>
            {tile.detail ? <Text style={styles.tileDetail}>{pdfText(tile.detail)}</Text> : null}
          </View>
        </View>
      ))}
    </View>
  );
}

export interface Column<Row> {
  header: string;
  /** Flex weight of the column. */
  width: number;
  align?: "left" | "right";
  cell: (row: Row) => string;
  /** Optional colored dot before the cell text (first column only, usually). */
  dot?: (row: Row) => string;
}

export function Table<Row>({
  columns,
  rows,
  highlight,
}: {
  columns: Column<Row>[];
  rows: Row[];
  highlight?: (row: Row) => boolean;
}) {
  return (
    <View style={styles.table}>
      <View style={styles.th}>
        {columns.map((col) => (
          <Text
            key={col.header}
            style={[styles.thCell, { flex: col.width, textAlign: col.align ?? "left" }]}
          >
            {col.header}
          </Text>
        ))}
      </View>
      {rows.map((row, index) => {
        const highlighted = highlight?.(row);
        return (
          <View
            key={index}
            style={[
              styles.tr,
              index % 2 === 1 ? { backgroundColor: PDF_COLORS.zebra } : {},
              highlighted ? { backgroundColor: PDF_COLORS.brandSoft } : {},
            ]}
          >
            {columns.map((col) => (
              <View
                key={col.header}
                style={{
                  flex: col.width,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: col.align === "right" ? "flex-end" : "flex-start",
                  paddingLeft: col.dot ? 8 : 0,
                }}
              >
                {col.dot ? <View style={[styles.dot, { backgroundColor: col.dot(row) }]} /> : null}
                <Text
                  style={[
                    styles.td,
                    { textAlign: col.align ?? "left", paddingLeft: col.dot ? 0 : 8 },
                    highlighted ? { fontFamily: "Helvetica-Bold" } : {},
                  ]}
                >
                  {pdfText(col.cell(row))}
                </Text>
              </View>
            ))}
          </View>
        );
      })}
    </View>
  );
}

/** Simple vertical bar chart drawn with Views, so it stays crisp vector output. */
export function BarChart({
  points,
  formatMax,
  height = 120,
}: {
  points: { label: string; value: number }[];
  formatMax: (value: number) => string;
  height?: number;
}) {
  const max = Math.max(...points.map((p) => p.value), 0) || 1;
  const labelEvery = Math.max(1, Math.ceil(points.length / 8));
  return (
    <View>
      <View style={{ flexDirection: "row" }}>
        <View style={{ width: 44, height, justifyContent: "space-between", paddingRight: 6 }}>
          <Text style={{ fontSize: 6.5, color: PDF_COLORS.faint, textAlign: "right" }}>{formatMax(max)}</Text>
          <Text style={{ fontSize: 6.5, color: PDF_COLORS.faint, textAlign: "right" }}>{formatMax(max / 2)}</Text>
          <Text style={{ fontSize: 6.5, color: PDF_COLORS.faint, textAlign: "right" }}>0</Text>
        </View>
        <View
          style={{
            flex: 1,
            height,
            flexDirection: "row",
            alignItems: "flex-end",
            borderBottomWidth: 1,
            borderBottomColor: PDF_COLORS.line,
            borderTopWidth: 0.5,
            borderTopColor: PDF_COLORS.line,
          }}
        >
          {points.map((point, index) => (
            <View key={index} style={{ flex: 1, paddingHorizontal: points.length > 20 ? 1 : 3 }}>
              <View
                style={{
                  height: Math.max(1, (point.value / max) * (height - 2)),
                  backgroundColor: PDF_COLORS.brand,
                  borderTopLeftRadius: 1.5,
                  borderTopRightRadius: 1.5,
                }}
              />
            </View>
          ))}
        </View>
      </View>
      <View style={{ flexDirection: "row", marginLeft: 44, marginTop: 3 }}>
        {points.map((point, index) => (
          <Text
            key={index}
            style={{ flex: 1, fontSize: 6, color: PDF_COLORS.faint, textAlign: "center" }}
          >
            {index % labelEvery === 0 ? point.label : ""}
          </Text>
        ))}
      </View>
    </View>
  );
}

/** One horizontal bar split into colored segments, with a legend underneath. */
export function StackedBar({
  segments,
}: {
  segments: { label: string; value: number; color: string; display: string }[];
}) {
  const total = segments.reduce((acc, s) => acc + s.value, 0) || 1;
  return (
    <View>
      <View style={{ flexDirection: "row", height: 14, borderRadius: 4, overflow: "hidden" }}>
        {segments.map((s) => (
          <View key={s.label} style={{ width: `${(s.value / total) * 100}%`, backgroundColor: s.color }} />
        ))}
      </View>
      <View style={{ flexDirection: "row", flexWrap: "wrap", marginTop: 8 }}>
        {segments.map((s) => (
          <View key={s.label} style={{ width: "25%", flexDirection: "row", alignItems: "flex-start" }}>
            <View style={[styles.dot, { backgroundColor: s.color, marginTop: 2 }]} />
            <View>
              <Text style={{ fontSize: 8, fontFamily: "Helvetica-Bold" }}>{s.label}</Text>
              <Text style={{ fontSize: 7.5, color: PDF_COLORS.muted, marginTop: 1 }}>
                {s.display} · {((s.value / total) * 100).toFixed(1)}%
              </Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

export function TwoColumns({ left, right }: { left: React.ReactNode; right: React.ReactNode }) {
  return (
    <View style={{ flexDirection: "row", marginHorizontal: -7 }}>
      <View style={{ flex: 1, paddingHorizontal: 7 }}>{left}</View>
      <View style={{ flex: 1, paddingHorizontal: 7 }}>{right}</View>
    </View>
  );
}
