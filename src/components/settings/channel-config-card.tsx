"use client";

import { useRef, useState, type FormEvent } from "react";
import { Loader2, Pencil, Search } from "lucide-react";

import {
  CONTROL,
  DialogIcon,
  OUTLINE_BUTTON,
  PRIMARY_BUTTON,
} from "@/components/settings/user-management-card";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import {
  WSO2_CHANNEL_SOURCES,
  WSO2_SOURCE_DESCRIPTIONS,
  WSO2_SOURCE_INITIALS,
  WSO2_SOURCE_LABELS,
  isPlaceholderSource,
  type Wso2ChannelSource,
} from "@/config/wso2-sources";
import { useChannelInfo, useUpdateChannelInfo } from "@/hooks";
import { AuthApiError } from "@/lib/api/auth-client";
import { cn } from "@/lib/utils";
import type { ChannelInfo } from "@/types/channels";

/** Matches the backend's limits. */
const MAX_DESCRIPTION = 300;
const MAX_OWNER_NAME = 120;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const LABEL = "text-[13px] font-medium text-foreground-2";

function EditChannelDialog({
  source,
  info,
  open,
  onOpenChange,
}: {
  source: Wso2ChannelSource;
  info: ChannelInfo | undefined;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  // Starts from the saved values; the row remounts this dialog on every open (see `openCount`).
  const [description, setDescription] = useState(info?.description ?? "");
  const [ownerName, setOwnerName] = useState(info?.ownerName ?? "");
  const [ownerEmail, setOwnerEmail] = useState(info?.ownerEmail ?? "");
  const [error, setError] = useState<string | null>(null);
  const caretPlaced = useRef(false);
  const updateMutation = useUpdateChannelInfo();
  const label = WSO2_SOURCE_LABELS[source];

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const email = ownerEmail.trim();
    if (email && !EMAIL_PATTERN.test(email)) {
      setError("Enter a valid owner email, or leave it empty.");
      return;
    }
    setError(null);
    try {
      await updateMutation.mutateAsync({
        source,
        payload: { description: description.trim(), ownerName: ownerName.trim(), ownerEmail: email },
      });
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof AuthApiError ? err.message : "Something went wrong. Please try again.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[500px] rounded-2xl ring-border">
        <DialogHeader className="flex-row items-start gap-3 p-6 pb-0">
          <DialogIcon>
            <Pencil className="size-4" />
          </DialogIcon>
          <div className="space-y-1">
            <DialogTitle className="text-base font-semibold">Edit {label}</DialogTitle>
            <DialogDescription className="text-[13px]">
              The description shows when people hover over this channel on the dashboard.
            </DialogDescription>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5 px-6" noValidate>
          <div className="space-y-1.5">
            <div className="flex items-baseline justify-between gap-2">
              <label htmlFor={`channel-description-${source}`} className={LABEL}>
                Description
              </label>
              <span className="text-xs text-muted-foreground tabular-nums">
                {description.length}/{MAX_DESCRIPTION}
              </span>
            </div>
            <textarea
              id={`channel-description-${source}`}
              rows={3}
              maxLength={MAX_DESCRIPTION}
              placeholder={WSO2_SOURCE_DESCRIPTIONS[source]}
              className={cn(CONTROL, "h-auto w-full resize-none px-3 py-2.5 leading-5")}
              // The dialog focuses this on open: put the cursor after the text, ready to add to it.
              onFocus={(event) => {
                if (caretPlaced.current) return;
                caretPlaced.current = true;
                const end = event.currentTarget.value.length;
                event.currentTarget.setSelectionRange(end, end);
              }}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
            <p className="text-xs text-muted-foreground">Leave empty to use the default shown above.</p>
          </div>

          <div className="flex flex-col gap-5">
            <div className="space-y-1.5">
              <label htmlFor={`channel-owner-name-${source}`} className={LABEL}>
                Owner name
              </label>
              <input
                id={`channel-owner-name-${source}`}
                autoComplete="off"
                maxLength={MAX_OWNER_NAME}
                placeholder="Full name"
                className={cn(CONTROL, "w-full px-3")}
                value={ownerName}
                onChange={(event) => setOwnerName(event.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor={`channel-owner-email-${source}`} className={LABEL}>
                Owner email
              </label>
              <input
                id={`channel-owner-email-${source}`}
                type="email"
                autoComplete="off"
                placeholder="name@coopbankoromiasc.com"
                aria-invalid={!!error}
                className={cn(CONTROL, "w-full px-3", error && "border-bad hover:border-bad")}
                value={ownerEmail}
                onChange={(event) => setOwnerEmail(event.target.value)}
              />
            </div>
          </div>
          {error && (
            <p role="alert" className="-mt-2 text-[13px] font-medium text-bad">
              {error}
            </p>
          )}

          <DialogFooter className="-mx-6 mt-1 border-t border-line-soft px-6 pt-4 pb-5 flex-row justify-end max-[620px]:[&>*]:flex-1">
            <DialogClose render={<button type="button" className={OUTLINE_BUTTON} />}>Cancel</DialogClose>
            <button type="submit" className={PRIMARY_BUTTON} disabled={updateMutation.isPending}>
              {updateMutation.isPending && <Loader2 className="size-4 animate-spin" />}
              Save
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ChannelRow({ source, info }: { source: Wso2ChannelSource; info: ChannelInfo | undefined }) {
  const [editing, setEditing] = useState(false);
  // Bumped on each open so the dialog remounts with the latest saved values.
  const [openCount, setOpenCount] = useState(0);
  const label = WSO2_SOURCE_LABELS[source];
  const custom = info?.description;
  const owner = info?.ownerName || info?.ownerEmail;

  return (
    <tr className="h-16 transition-colors hover:bg-muted">
      <td className="py-2.5 pr-4 pl-6 max-[640px]:pl-[18px]">
        <div className="flex items-center gap-3 max-[640px]:items-start">
          <span
            className="flex size-[38px] shrink-0 items-center justify-center rounded-full bg-primary-soft text-[12px] font-bold text-primary-strong"
            aria-hidden
          >
            {WSO2_SOURCE_INITIALS[source]}
          </span>
          <div className="min-w-0">
            <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <span className="truncate">{label}</span>
              {isPlaceholderSource(source) && (
                <span className="shrink-0 rounded-full border border-border px-1.5 py-px text-[11px] font-medium text-muted-foreground">
                  Not reported yet
                </span>
              )}
            </p>
            {/* Description and owner, shown here when their columns are hidden. */}
            <p className="mt-0.5 hidden text-[13px] text-muted-foreground max-[640px]:line-clamp-2">
              {custom || WSO2_SOURCE_DESCRIPTIONS[source]}
            </p>
            {owner && <p className="hidden truncate text-xs text-foreground-2 max-[640px]:block">Owner: {owner}</p>}
          </div>
        </div>
      </td>
      <td className="px-4 max-[640px]:hidden">
        <p className={cn("line-clamp-2 text-[13px]", custom ? "text-foreground" : "text-muted-foreground")}>
          {custom || WSO2_SOURCE_DESCRIPTIONS[source]}
        </p>
        {!custom && <p className="text-[11px] text-muted-foreground/80">Default</p>}
      </td>
      <td className="px-4 max-[640px]:hidden">
        {owner ? (
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-foreground">{info?.ownerName || "—"}</p>
            {info?.ownerEmail && (
              <a
                href={`mailto:${info.ownerEmail}`}
                className="block truncate text-[13px] text-muted-foreground hover:text-primary-strong hover:underline"
              >
                {info.ownerEmail}
              </a>
            )}
          </div>
        ) : (
          <span className="text-[13px] text-muted-foreground">No owner</span>
        )}
      </td>
      <td className="pr-6 pl-4 text-right max-[640px]:pr-3 max-[640px]:pl-0">
        <button
          type="button"
          aria-label={`Edit ${label}`}
          title={`Edit ${label}`}
          onClick={() => {
            setOpenCount((count) => count + 1);
            setEditing(true);
          }}
          className="inline-flex size-9 items-center justify-center rounded-[10px] text-foreground-2 transition-colors hover:bg-card hover:text-primary-strong focus-visible:outline-2 focus-visible:outline-primary"
        >
          <Pencil className="size-4" />
        </button>
        <EditChannelDialog
          key={openCount}
          source={source}
          info={info}
          open={editing}
          onOpenChange={setEditing}
        />
      </td>
    </tr>
  );
}

export function ChannelConfigCard() {
  const [search, setSearch] = useState("");
  const infoQuery = useChannelInfo({ fresh: true });
  const info = infoQuery.data ?? {};

  const query = search.trim().toLowerCase();
  const channels = WSO2_CHANNEL_SOURCES.filter((source) => {
    if (!query) return true;
    const saved = info[source];
    return [WSO2_SOURCE_LABELS[source], saved?.description, saved?.ownerName, saved?.ownerEmail]
      .some((text) => text?.toLowerCase().includes(query));
  });

  return (
    <section className="rounded-2xl border border-border bg-card shadow-[0_1px_2px_rgba(15,23,43,0.04)] dark:shadow-none">
      <header className="px-6 pt-[22px] max-[620px]:px-[18px]">
        <h2 className="text-base font-semibold text-foreground">Channel configuration</h2>
        <p className="mt-0.5 text-[13px] text-muted-foreground">
          Describe each channel and record who owns it
        </p>
      </header>

      <div className="px-6 pt-5 pb-4 max-[620px]:px-[18px]">
        <div className="relative max-w-md">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            aria-label="Search channels"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by channel, description or owner"
            className={cn(CONTROL, "w-full pr-3 pl-9")}
          />
        </div>
      </div>

      {infoQuery.isError && (
        <p role="alert" className="mx-6 mb-4 rounded-[10px] bg-bad-soft px-3 py-2 text-[13px] text-bad max-[620px]:mx-[18px]">
          Couldn&apos;t load saved channel details; showing defaults.
        </p>
      )}

      <div className="relative overflow-x-auto">
        <table className="w-full border-collapse text-sm max-[640px]:table-fixed">
          <thead>
            <tr className="border-y border-line-soft text-left text-xs font-semibold text-muted-foreground">
              <th scope="col" className="w-[30%] py-2.5 pr-4 pl-6 font-semibold max-[640px]:w-auto max-[640px]:pl-[18px]">
                Channel
              </th>
              <th scope="col" className="px-4 py-2.5 font-semibold max-[640px]:hidden">Description</th>
              <th scope="col" className="w-[24%] px-4 py-2.5 font-semibold max-[640px]:hidden">Owner</th>
              <th scope="col" className="w-16 py-2.5 pr-6 pl-4 max-[640px]:w-14 max-[640px]:pr-3 max-[640px]:pl-0">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line-soft">
            {infoQuery.isLoading ? (
              Array.from({ length: 5 }).map((_, index) => (
                <tr key={index} className="h-16">
                  <td className="pr-4 pl-6 max-[640px]:pl-[18px]">
                    <div className="flex items-center gap-3">
                      <Skeleton className="size-[38px] shrink-0 rounded-full" />
                      <Skeleton className="h-3.5 w-32 max-w-full" />
                    </div>
                  </td>
                  <td className="px-4 max-[640px]:hidden">
                    <Skeleton className="h-3.5 w-64 max-w-full" />
                  </td>
                  <td className="px-4 max-[640px]:hidden">
                    <Skeleton className="h-3.5 w-28" />
                  </td>
                  <td />
                </tr>
              ))
            ) : channels.length === 0 ? (
              <tr>
                <td colSpan={4} className="h-28 text-center text-sm text-muted-foreground">
                  No channels match this search.
                </td>
              </tr>
            ) : (
              channels.map((source) => <ChannelRow key={source} source={source} info={info[source]} />)
            )}
          </tbody>
        </table>
      </div>

      <footer className="border-t border-line-soft px-6 py-3.5 text-[13px] text-muted-foreground max-[620px]:px-[18px]">
        {infoQuery.isLoading
          ? "Loading channels…"
          : `Showing ${channels.length} of ${WSO2_CHANNEL_SOURCES.length} channels`}
      </footer>
    </section>
  );
}
