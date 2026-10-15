import type { Kpi } from "@/types/api";

// Figures are always written in full ("2,232,593,350.43", "39,188"), never
// abbreviated to K, M or B, on screen and in every export.

const wholeNumberFormatter = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });

const amountFormatter = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** Counts and other whole numbers: "39,188". */
export function formatNumber(value: number): string {
  return wholeNumberFormatter.format(value);
}

/** Bare amount with two decimals: "2,232,593,350.43". */
export function formatAmountValue(value: number): string {
  return amountFormatter.format(value);
}

/** Amount with its currency: "ETB 2,232,593,350.43". */
export function formatCurrency(value: number, currency = "ETB"): string {
  return `${currency} ${amountFormatter.format(value)}`;
}

/** Same as `formatCurrency`; kept for existing callers. */
export function formatCurrencyFull(value: number, currency = "ETB"): string {
  return formatCurrency(value, currency);
}

export function formatPercent(fraction: number, fractionDigits = 2): string {
  return `${(fraction * 100).toFixed(fractionDigits)}%`;
}

export function formatSignedPercent(fraction: number, fractionDigits = 1): string {
  const sign = fraction > 0 ? "+" : "";
  return `${sign}${(fraction * 100).toFixed(fractionDigits)}%`;
}

export function formatKpiValue(kpi: Pick<Kpi, "value" | "format" | "unit">): string {
  switch (kpi.format) {
    case "currency":
      return formatCurrency(kpi.value, kpi.unit);
    case "percent":
      return formatPercent(kpi.value);
    case "number":
    default:
      return formatNumber(kpi.value);
  }
}
