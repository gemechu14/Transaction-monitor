import { authFetch } from "@/lib/api/auth-client";
import type { ChannelInfo, UpdateChannelInfoPayload } from "@/types/channels";

/** Every channel that has saved details. Channels never edited are left out. */
export function listChannelInfo(): Promise<{ channels: ChannelInfo[] }> {
  return authFetch("/api/channels");
}

/** Admin only. Creates the channel's details on first save. */
export function updateChannelInfo(
  source: string,
  payload: UpdateChannelInfoPayload,
): Promise<{ channel: ChannelInfo }> {
  return authFetch(`/api/admin/channels/${encodeURIComponent(source)}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}
