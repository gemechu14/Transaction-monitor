import type { Kpi } from "@/types/api";

export function formatCompactNumber(value: number, fractionDigits = 1): string {
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: fractionDigits,
  }).format(value);
}

export function formatCurrencyCompact(value: number, currency = "ETB", fractionDigits = 1): string {
  return `${currency} ${formatCompactNumber(value, fractionDigits)}`;
}

const fullNumberFormatter = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatCurrencyFull(value: number, currency = "ETB"): string {
  return `${currency} ${fullNumberFormatter.format(value)}`;
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
      return formatCurrencyCompact(kpi.value, kpi.unit);
    case "percent":
      return formatPercent(kpi.value);
    case "number":
    default:
      return formatCompactNumber(kpi.value);
  }
}
