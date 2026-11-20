/** Admin-edited details for one channel, from the TM backend's `/api/channels`. */
export interface ChannelInfo {
  /** The channel's source id, e.g. "ips". */
  source: string;
  description: string | null;
  ownerName: string | null;
  ownerEmail: string | null;
  /** When customers pay; missing or null means "normal" (real-time, no regular peak). */
  channelType?: ChannelType | null;
  /** Months 1–12 a seasonal channel is active in; only used when `channelType` is "seasonal". */
  activeMonths?: number[] | null;
  updatedAt: string;
  /** Email of the admin who last saved it. */
  updatedBy: string | null;
}

/** Fields an admin can change; `null` or "" clears one, a missing field is left as is. */
export interface UpdateChannelInfoPayload {
  description?: string | null;
  ownerName?: string | null;
  ownerEmail?: string | null;
  channelType?: ChannelType | null;
  activeMonths?: number[] | null;
}

/**
 * The channel's payment pattern. Every channel reports in real time; this says when customers pay:
 * any time ("normal"), settled in a nightly batch, peaking monthly (e.g. utility bills) or yearly, or only in some months (seasonal, e.g. Hajj).
 */
export type ChannelType =
  "normal" | "nightly" | "monthly" | "yearly" | "seasonal";
