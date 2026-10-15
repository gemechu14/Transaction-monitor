/** Payment sources as keyed in the WSO2 `allAdvanced` response (see ADVANCED_API.md). */
export type Wso2ChannelSource =
  | "tas"
  | "ips_incoming"
  | "ips_push"
  | "coopapp"
  | "jica"
  | "eeu"
  | "souflle"
  | "hajj"
  | "telebirrToBank"
  | "bankToTelebirr"
  | "coopremitOtherBank"
  | "terapayOtherBank";

export type Wso2Source = Wso2ChannelSource | "all";

export const WSO2_SOURCE_LABELS: Record<Wso2Source, string> = {
  all: "All sources",
  tas: "TAS",
  ips_incoming: "IPS Incoming",
  ips_push: "IPS Push",
  coopapp: "CoopApp",
  jica: "JICA",
  eeu: "EEU",
  souflle: "Souflle",
  hajj: "Hajj",
  telebirrToBank: "Telebirr to Bank",
  bankToTelebirr: "Bank to Telebirr",
  coopremitOtherBank: "CoopRemit Other Bank",
  terapayOtherBank: "Terapay Other Bank",
};

/**
 * Sources left out of the dashboard for now: not in any dropdown, table or
 * export, and not added into "All sources". Remove an id to bring it back.
 */
const HIDDEN_SOURCES: Wso2Source[] = ["tas"];

export const WSO2_SOURCES = (Object.keys(WSO2_SOURCE_LABELS) as Wso2Source[]).filter(
  (id) => !HIDDEN_SOURCES.includes(id),
);

export const WSO2_CHANNEL_SOURCES = WSO2_SOURCES.filter(
  (id): id is Wso2ChannelSource => id !== "all",
);

/** One- or two-letter badge text for ranked lists. */
export const WSO2_SOURCE_INITIALS: Record<Wso2ChannelSource, string> = {
  tas: "TA",
  ips_incoming: "II",
  ips_push: "IP",
  coopapp: "CA",
  jica: "JI",
  eeu: "EU",
  souflle: "SO",
  hajj: "HJ",
  telebirrToBank: "TB",
  bankToTelebirr: "BT",
  coopremitOtherBank: "CR",
  terapayOtherBank: "TP",
};
