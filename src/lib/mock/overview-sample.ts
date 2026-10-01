import type { OverviewDataset } from "@/types/api";

/** September 2026 sample figures for the Overview page, until it is wired to live WSO2 data. */

/** Daily all-platform totals in thousands, approximating the old incoming + outgoing curve. */
const SEPTEMBER_DAILY_K = [
  25.6, 25.4, 26.0, 27.3, 24.5, 18.9, 18.6, 22.3, 24.8, 26.3, 26.4, 25.5, 19.7, 19.2, 25.2, 24.6,
  24.9, 25.0, 25.3, 20.2, 17.5, 26.1, 26.6, 26.7, 27.1, 23.8, 18.7, 25.0, 26.4, 25.4,
];

/**
 * Daily all-platform success rates in percent. 1 – 8 Sep come from the original
 * screenshot; 9 – 30 Sep are sample values in the same range.
 */
const SEPTEMBER_SUCCESS_PCT = [
  95.4, 95.7, 95.6, 95.1, 95.1, 95.3, 95.6, 95.3, 95.6, 95.5, 95.4, 95.2, 95.8, 95.7, 95.5, 95.3,
  95.4, 95.6, 95.5, 95.0, 95.7, 95.5, 95.6, 95.4, 95.3, 95.7, 95.6, 95.5, 95.4, 95.6,
];

const MONTH_TOTAL = 716_200;
const DAILY_K_TOTAL = SEPTEMBER_DAILY_K.reduce((acc, k) => acc + k, 0);

export const OVERVIEW_SAMPLE: OverviewDataset = {
  from: "2026-09-01",
  to: "2026-09-30",
  channels: [
    { channel: "telebirr", transactionCount: 191_200, totalValue: 280_120_000, successRate: 0.962, avgLatencyMs: 224, valueChangeVsPreviousMonth: 0.042 },
    { channel: "mbesa_p2p", transactionCount: 143_700, totalValue: 138_450_000, successRate: 0.95, avgLatencyMs: 196, valueChangeVsPreviousMonth: 0.028 },
    { channel: "banks", transactionCount: 112_100, totalValue: 2_000_000_000, successRate: 0.969, avgLatencyMs: 565, valueChangeVsPreviousMonth: null },
    { channel: "souqpass", transactionCount: 82_500, totalValue: 271_960_000, successRate: 0.946, avgLatencyMs: 308, valueChangeVsPreviousMonth: 0.035 },
    { channel: "coopstream", transactionCount: 76_000, totalValue: 427_050_000, successRate: 0.969, avgLatencyMs: 289, valueChangeVsPreviousMonth: 0.019 },
    { channel: "chapa", transactionCount: 61_000, totalValue: 104_400_000, successRate: 0.938, avgLatencyMs: 261, valueChangeVsPreviousMonth: -0.014 },
    { channel: "deboo", transactionCount: 49_700, totalValue: 104_200_000, successRate: 0.921, avgLatencyMs: 438, valueChangeVsPreviousMonth: null },
  ],
  // Normalised so the month adds up to exactly MONTH_TOTAL.
  daily: SEPTEMBER_DAILY_K.map((k, i) => ({
    date: `2026-09-${String(i + 1).padStart(2, "0")}`,
    transactionCount: (k / DAILY_K_TOTAL) * MONTH_TOTAL,
    successRate: SEPTEMBER_SUCCESS_PCT[i] / 100,
  })),
  status: { success: 683_755, failed: 19_040, reversed: 8_257, pending: 5_148 },
  failing: [
    { channel: "deboo", failedCount: 3_010, reversedCount: 593, failureRate: 0.0726 },
    { channel: "chapa", failedCount: 2_630, reversedCount: 691, failureRate: 0.0545 },
    { channel: "souqpass", failedCount: 2_866, reversedCount: 976, failureRate: 0.0466 },
  ],
  // August figures are back-calculated from these "vs August" changes. The per-channel
  // values on `channels` are placeholders; replace both with real August data when connected.
  previousMonthChange: { value: 0.03, transactions: 0.029 },
  anomalies: [
    { channel: "mbesa_p2p", failureRate: 0.0426, baselineRate: 0.0443 },
    { channel: "chapa", failureRate: 0.0545, baselineRate: 0.0529 },
    { channel: "coopstream", failureRate: 0.0245, baselineRate: 0.0257 },
    { channel: "telebirr", failureRate: 0.0306, baselineRate: 0.0317 },
  ],
};
