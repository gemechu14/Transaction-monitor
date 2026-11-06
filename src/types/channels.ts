/** Admin-edited details for one channel, from the TM backend's `/api/channels`. */
export interface ChannelInfo {
  /** The channel's source id, e.g. "ips". */
  source: string;
  description: string | null;
  ownerName: string | null;
  ownerEmail: string | null;
  updatedAt: string;
  /** Email of the admin who last saved it. */
  updatedBy: string | null;
}

/** Fields an admin can change; `null` or "" clears one, a missing field is left as is. */
export interface UpdateChannelInfoPayload {
  description?: string | null;
  ownerName?: string | null;
  ownerEmail?: string | null;
}
