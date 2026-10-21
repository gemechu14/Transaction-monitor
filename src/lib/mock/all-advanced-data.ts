import type { Wso2ChannelSource, Wso2Source } from "@/config/wso2-sources";
import { eachDay, toISODate } from "@/lib/date";
import { seededRandom } from "@/lib/mock/rng";
import { pickSourceTotals, type DailyPoint } from "@/lib/overview";
import type { AllAdvancedParams, AllAdvancedTotals } from "@/types/api";

/**
 * Dummy `allAdvanced` totals, used while the live WSO2 call is switched off
 * (see `getAllAdvanced`). Each source has a typical day; every day gets its own
 * seeded wobble and a quieter weekend, so the same range always returns the
 * same figures and longer ranges add up from the same days.
 */

const DAILY_PROFILE: Record<Wso2ChannelSource, { amount: number; transactions: number }> = {
  ips_incoming: { amount: 88_000_000, transactions: 8_900 },
  telebirrToBank: { amount: 68_000_000, transactions: 5_600 },
  bankToTelebirr: { amount: 43_000_000, transactions: 730 },
  tas: { amount: 12_000_000, transactions: 300 },
  ips_push: { amount: 8_400_000, transactions: 313 },
  coopremitOtherBank: { amount: 6_200_000, transactions: 92 },
  coopapp: { amount: 5_100_000, transactions: 1_500 },
  eeu: { amount: 1_200_000, transactions: 610 },
  terapayOtherBank: { amount: 820_000, transactions: 31 },
  hajj: { amount: 540_000, transactions: 9 },
  jica: { amount: 310_000, transactions: 5 },
  souflle: { amount: 120_000, transactions: 22 },
};

/** Saturday and Sunday run lighter than weekdays. */
function weekdayFactor(iso: string): number {
  const day = new Date(`${iso}T00:00:00Z`).getUTCDay();
  return day === 0 ? 0.62 : day === 6 ? 0.74 : 1;
}

/** Nothing has happened yet after today. */
function daysUpToToday(params: AllAdvancedParams): string[] {
  const today = toISODate(new Date());
  return eachDay(params.startDate, params.endDate).filter((iso) => iso <= today);
}

/** One source's figures for one day. */
function sourceDay(source: Wso2ChannelSource, iso: string): { totalTransactions: number; totalAmount: number } {
  const profile = DAILY_PROFILE[source];
  const random = seededRandom("all-advanced", source, iso);
  const factor = weekdayFactor(iso) * (0.85 + random() * 0.3);
  return {
    totalTransactions: Math.round(profile.transactions * factor * (0.9 + random() * 0.2)),
    // Two decimals, like real amounts.
    totalAmount: Math.round(profile.amount * factor * 100) / 100,
  };
}

const SOURCES = Object.keys(DAILY_PROFILE) as Wso2ChannelSource[];

export function generateMockAllAdvanced(params: AllAdvancedParams): AllAdvancedTotals {
  const days = daysUpToToday(params);
  const totals: AllAdvancedTotals = {};
  for (const source of SOURCES) {
    let amount = 0;
    let transactions = 0;
    for (const iso of days) {
      const day = sourceDay(source, iso);
      transactions += day.totalTransactions;
      amount += day.totalAmount;
    }
    totals[source] = { totalTransactions: transactions, totalAmount: Math.round(amount * 100) / 100 };
  }
  return totals;
}

/**
 * Day-by-day figures for the Overview chart, built from the same days as
 * `generateMockAllAdvanced`, so the chart adds up to the cards.
 */
export function generateMockDailySeries(params: AllAdvancedParams, source: Wso2Source): DailyPoint[] {
  return daysUpToToday(params).map((iso) => {
    const day: AllAdvancedTotals = Object.fromEntries(SOURCES.map((s) => [s, sourceDay(s, iso)]));
    const picked = pickSourceTotals(day, source);
    return { date: iso, count: picked?.totalTransactions ?? 0, value: picked?.totalAmount ?? 0 };
  });
}
