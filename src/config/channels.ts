import { CHART_PALETTE } from "@/config/colors";

export type ChannelId =
  | "telebirr"
  | "mbesa_p2p"
  | "souqpass"
  | "coopstream"
  | "deboo"
  | "chapa"
  | "banks";

export interface ChannelConfig {
  id: ChannelId;
  /** Full display name, e.g. in page headings and tooltips. */
  name: string;
  /** Compact label for chart legends and tight table cells. */
  shortName: string;
  /** One- or two-letter badge text for ranked lists and legends. */
  initials: string;
  /** Hex color used for this channel's series across charts and badges. */
  color: string;
}

export const CHANNELS: Record<ChannelId, ChannelConfig> = {
  telebirr: {
    id: "telebirr",
    name: "Telebirr",
    shortName: "Telebirr",
    initials: "T",
    color: CHART_PALETTE[0],
  },
  mbesa_p2p: {
    id: "mbesa_p2p",
    name: "M-Besa P2P",
    shortName: "M-Besa",
    initials: "MB",
    color: CHART_PALETTE[1],
  },
  souqpass: {
    id: "souqpass",
    name: "SouqPass",
    shortName: "SouqPass",
    initials: "SP",
    color: CHART_PALETTE[3],
  },
  coopstream: {
    id: "coopstream",
    name: "CoopStream",
    shortName: "CoopStream",
    initials: "CS",
    color: CHART_PALETTE[4],
  },
  deboo: {
    id: "deboo",
    name: "Deboo",
    shortName: "Deboo",
    initials: "D",
    color: CHART_PALETTE[6],
  },
  chapa: {
    id: "chapa",
    name: "Chapa",
    shortName: "Chapa",
    initials: "C",
    color: CHART_PALETTE[5],
  },
  banks: {
    id: "banks",
    name: "Partner Banks",
    shortName: "Banks",
    initials: "PB",
    color: CHART_PALETTE[2],
  },
};

export const CHANNEL_LIST: ChannelConfig[] = Object.values(CHANNELS);

export function getChannelConfig(id: string): ChannelConfig | undefined {
  return CHANNELS[id as ChannelId];
}
