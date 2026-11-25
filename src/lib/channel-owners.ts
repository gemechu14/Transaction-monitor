import type { ChannelOwner } from "@/types/channels";

/** Backend limits for the owner list. */
export const MAX_OWNERS = 10;
export const MAX_OWNER_NAME = 120;
export const MAX_OWNER_EMAIL = 254;

/** What to call an owner: the name, else the email. */
export function ownerLabel(owner: ChannelOwner): string {
  return owner.name?.trim() || owner.email?.trim() || "";
}

/** Owners with a name or an email; the backend drops the rest, so the UI ignores them too. */
export function namedOwners(
  owners: readonly ChannelOwner[] | null | undefined,
): ChannelOwner[] {
  return (owners ?? []).filter((o) => ownerLabel(o));
}

/** "Abebe Kebede, Hana T. +1"; "—" when there are none. */
export function formatOwnerSummary(
  owners: readonly ChannelOwner[] | null | undefined,
  shown = 2,
): string {
  const list = namedOwners(owners);
  if (!list.length) return "—";
  const names = list.slice(0, shown).map(ownerLabel).join(", ");
  return list.length > shown ? `${names} +${list.length - shown}` : names;
}
