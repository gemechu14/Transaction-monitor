/**
 * Payment sources as keyed in the WSO2 `allAdvanced` response (see ADVANCED_API.md),
 * except `ips`, which the dashboard builds from `IPS_PARTS`.
 */
export type Wso2ChannelSource =
  | "tas"
  | "ips"
  | "coopapp"
  | "jica"
  | "eeu"
  | "souflle"
  | "hajj"
  | "telebirrToBank"
  | "bankToTelebirr"
  | "coopremitOtherBank"
  | "terapayOtherBank"
  | PlaceholderSource;

/** WSO2 reports IPS as two sources; the dashboard adds them up into one `ips` channel. */
export const IPS_PARTS = ["ips_incoming", "ips_push"] as const;

/**
 * Channels shown on the dashboard before WSO2 reports them: always zero, and
 * never sent to the backend. Move an id up into `Wso2ChannelSource` once the
 * API returns it.
 */
export const PLACEHOLDER_SOURCES = [
  "saccoLink",
  "saccopay",
  "walletBirrToBank",
  "michuMizan",
  "supplyChain",
  "redRose",
  "redCross",
  "birrLink",
  "smartBranch",
  "vitaBirr",
  "masterCard",
  "airline",
  "awach",
  "fayda",
  "chapa",
  "kacha",
  "lakiPay",
  "esl",
  "coopStream",
  "raysMicroFinance",
  "timelessPay",
  "zoraPay",
  "starpay",
  "mpesa",
  "ebirrCrmDeposit",
  "ebirrCrmWithdrawal",
  "faydaVerse",
] as const;

export type PlaceholderSource = (typeof PLACEHOLDER_SOURCES)[number];

export function isPlaceholderSource(id: string): id is PlaceholderSource {
  return (PLACEHOLDER_SOURCES as readonly string[]).includes(id);
}

export type Wso2Source = Wso2ChannelSource | "all";

export const WSO2_SOURCE_LABELS: Record<Wso2Source, string> = {
  all: "All sources",
  tas: "TAS",
  ips: "IPS",
  coopapp: "CoopApp",
  jica: "JICA",
  eeu: "EEU",
  souflle: "Souflle",
  hajj: "Hajj",
  telebirrToBank: "Telebirr to Bank",
  bankToTelebirr: "Bank to Telebirr",
  coopremitOtherBank: "CoopRemit Other Bank",
  terapayOtherBank: "Terapay Other Bank",
  saccoLink: "SaccoLink",
  saccopay: "Saccopay",
  walletBirrToBank: "WalletBirr to Bank",
  michuMizan: "MichuMizan",
  supplyChain: "Supply Chain",
  redRose: "RedRose",
  redCross: "RedCross",
  birrLink: "BirrLink",
  smartBranch: "SmartBranch",
  vitaBirr: "VitaBirr",
  masterCard: "MasterCard",
  airline: "Airline",
  awach: "Awach",
  fayda: "Fayda",
  chapa: "Chapa",
  kacha: "Kacha",
  lakiPay: "LakiPay",
  esl: "ESL",
  coopStream: "CoopStream",
  raysMicroFinance: "Rays MicroFinance",
  timelessPay: "TimelessPay",
  zoraPay: "ZoraPay",
  starpay: "Starpay",
  mpesa: "M-Pesa",
  ebirrCrmDeposit: "Ebirr CRM Deposit",
  ebirrCrmWithdrawal: "Ebirr CRM Withdrawal",
  faydaVerse: "FaydaVerse",
};

/**
 * One-line explanation of each source, shown under its name in the source
 * dropdowns and in the hover tooltip on channel rows. Keep each under ~50
 * characters so the dropdown stays narrow.
 */
export const WSO2_SOURCE_DESCRIPTIONS: Record<Wso2Source, string> = {
  all: "Every source combined",
  tas: "TAS transactions",
  ips: "Instant payments to and from other banks",
  coopapp: "Payments made in the CoopApp mobile app",
  jica: "JICA programme payments",
  eeu: "Ethiopian Electric Utility bill payments",
  souflle: "Souflle payments",
  hajj: "Hajj pilgrimage payments",
  telebirrToBank: "Transfers from telebirr wallets into Coopbank",
  bankToTelebirr: "Transfers from Coopbank to telebirr wallets",
  coopremitOtherBank: "CoopRemit remittances paid to other banks",
  terapayOtherBank: "Terrapay remittances paid to other banks",
  saccoLink: "SaccoLink payments (not reported yet)",
  saccopay: "Saccopay payments (not reported yet)",
  walletBirrToBank: "WalletBirr transfers (not reported yet)",
  michuMizan: "MichuMizan payments (not reported yet)",
  supplyChain: "Supply chain payments (not reported yet)",
  redRose: "RedRose payments (not reported yet)",
  redCross: "RedCross payments (not reported yet)",
  birrLink: "BirrLink payments (not reported yet)",
  smartBranch: "SmartBranch payments (not reported yet)",
  vitaBirr: "VitaBirr payments (not reported yet)",
  masterCard: "MasterCard payments (not reported yet)",
  airline: "Airline payments (not reported yet)",
  awach: "Awach payments (not reported yet)",
  fayda: "Fayda payments (not reported yet)",
  chapa: "Chapa payments (not reported yet)",
  kacha: "Kacha payments (not reported yet)",
  lakiPay: "LakiPay payments (not reported yet)",
  esl: "ESL payments (not reported yet)",
  coopStream: "CoopStream payments (not reported yet)",
  raysMicroFinance: "Rays MicroFinance payments (not reported yet)",
  timelessPay: "TimelessPay payments (not reported yet)",
  zoraPay: "ZoraPay payments (not reported yet)",
  starpay: "Starpay payments (not reported yet)",
  mpesa: "M-Pesa payments (not reported yet)",
  ebirrCrmDeposit: "Ebirr CRM deposits (not reported yet)",
  ebirrCrmWithdrawal: "Ebirr CRM withdrawals (not reported yet)",
  faydaVerse: "FaydaVerse payments (not reported yet)",
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
  ips: "IP",
  coopapp: "CA",
  jica: "JI",
  eeu: "EU",
  souflle: "SO",
  hajj: "HJ",
  telebirrToBank: "TB",
  bankToTelebirr: "BT",
  coopremitOtherBank: "CR",
  terapayOtherBank: "TP",
  saccoLink: "SL",
  saccopay: "SP",
  walletBirrToBank: "WB",
  michuMizan: "MM",
  supplyChain: "SC",
  redRose: "RR",
  redCross: "RC",
  birrLink: "BL",
  smartBranch: "SB",
  vitaBirr: "VB",
  masterCard: "MC",
  airline: "AL",
  awach: "AW",
  fayda: "FY",
  chapa: "CH",
  kacha: "KA",
  lakiPay: "LP",
  esl: "ES",
  coopStream: "CS",
  raysMicroFinance: "RM",
  timelessPay: "TL",
  zoraPay: "ZP",
  starpay: "ST",
  mpesa: "MP",
  ebirrCrmDeposit: "ED",
  ebirrCrmWithdrawal: "EW",
  faydaVerse: "FV",
};
