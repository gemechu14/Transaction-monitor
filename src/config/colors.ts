/**
 * Raw color values for contexts that can't consume CSS custom properties
 * (Recharts/ECharts canvas & SVG props). Keep these in sync with the
 * `:root` / `.dark` tokens in `src/app/globals.css`.
 */

export const BRAND_COLOR = "#00ADEF";
export const BRAND_TINT = "#E5F7FD";
export const NEUTRAL_TEXT = "#667085";
export const NEUTRAL_BORDER = "#E4E7EC";

export const CHART_PALETTE = [
  "#00ADEF", // brand blue
  "#0B3C5D", // navy
  "#15B79E", // teal
  "#12B76A", // green
  "#DC6803", // gold
  "#F04438", // red
  "#98A2B3", // gray-blue
] as const;

export const STATUS_COLORS = {
  success: { fg: "#00ADEF", bg: "#E5F7FD" },
  failed: { fg: "#B42318", bg: "#FEF3F2" },
  pending: { fg: "#F79009", bg: "#FFFAEB" },
  reversed: { fg: "#98A2B3", bg: "#F2F4F7" },
} as const;
