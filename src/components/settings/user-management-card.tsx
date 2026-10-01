"use client";

import { useEffect, useState, type FormEvent } from "react";
import { EllipsisVertical, Loader2, Pencil, Power, Search, ShieldCheck, UserPlus } from "lucide-react";

import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useAdminUsers, useCreateUser, useMe, useUpdateUser } from "@/hooks";
import { AuthApiError } from "@/lib/api/auth-client";
import { cn } from "@/lib/utils";
import type { AdminUser, UserRole, UserStatus } from "@/types/auth";

const ROLE_FILTER_ITEMS: Record<string, string> = { all: "All roles", ADMIN: "Admin", USER: "User" };
const STATUS_FILTER_ITEMS: Record<string, string> = {
  all: "All statuses",
  ACTIVE: "Active",
  DISABLED: "Disabled",
};

const ROLE_CARDS: { value: UserRole; label: string; description: string }[] = [
  { value: "USER", label: "User", description: "Can view all dashboards" },
  { value: "ADMIN", label: "Admin", description: "Can also manage users" },
];

/* Shared control styles: 40px controls, 10px radius. */
const CONTROL =
  "h-10 rounded-[10px] border border-border bg-card text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground hover:border-foreground-2 focus-visible:border-primary focus-visible:ring-3 focus-visible:ring-primary/20";
const BUTTON_BASE =
  "inline-flex h-10 items-center justify-center gap-1.5 rounded-[10px] px-4 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:pointer-events-none disabled:opacity-50";
const PRIMARY_BUTTON = cn(BUTTON_BASE, "bg-primary font-bold text-primary-foreground hover:bg-primary/90");
const OUTLINE_BUTTON = cn(BUTTON_BASE, "border border-border bg-card text-foreground hover:bg-muted");
const DANGER_BUTTON = cn(BUTTON_BASE, "bg-bad text-white hover:bg-bad/90");

function initialsFor(user: AdminUser): string {
  const source = (user.displayName || user.email).trim();
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1 || !user.displayName) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

/** Display order only: you first, then active before disabled, then A–Z. */
function sortForDisplay(users: AdminUser[], currentUserId?: string): AdminUser[] {
  const name = (u: AdminUser) => (u.displayName ?? u.email).toLowerCase();
  return [...users].sort(
    (a, b) =>
      Number(b.id === currentUserId) - Number(a.id === currentUserId) ||
      Number(a.status !== "ACTIVE") - Number(b.status !== "ACTIVE") ||
      name(a).localeCompare(name(b)),
  );
}

function DialogIcon({ tone = "primary", children }: { tone?: "primary" | "bad"; children: React.ReactNode }) {
  return (
    <span
      className={cn(
        "flex size-10 shrink-0 items-center justify-center rounded-full",
        tone === "bad" ? "bg-bad-soft text-bad" : "bg-primary-soft text-primary-strong",
      )}
    >
      {children}
    </span>
  );
}

function RoleCards({
  name,
  value,
  onChange,
}: {
  name: string;
  value: UserRole;
  onChange: (role: UserRole) => void;
}) {
  return (
    <div role="radiogroup" aria-label="Role" className="grid grid-cols-2 gap-2">
      {ROLE_CARDS.map((card) => {
        const selected = value === card.value;
        return (
          <label
            key={card.value}
            className={cn(
              "flex cursor-pointer flex-col gap-0.5 rounded-[10px] border p-3 transition-colors has-focus-visible:ring-3 has-focus-visible:ring-primary/20",
              selected ? "border-primary bg-primary-soft" : "border-border hover:bg-muted",
            )}
          >
            <input
              type="radio"
              name={name}
              value={card.value}
              checked={selected}
              onChange={() => onChange(card.value)}
              className="sr-only"
            />
            <span
              className={cn(
                "flex items-center gap-1.5 text-sm font-semibold",
                selected ? "text-primary-strong" : "text-foreground",
              )}
            >
              {card.value === "ADMIN" && <ShieldCheck className="size-3.5" />}
              {card.label}
            </span>
            <span className="text-xs text-muted-foreground">{card.description}</span>
          </label>
        );
      })}
    </div>
  );
}

function AddUserDialog({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<UserRole>("USER");
  const [error, setError] = useState<string | null>(null);
  const createUserMutation = useCreateUser();

  function reset() {
    setEmail("");
    setRole("USER");
    setError(null);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!email.trim()) {
      setError("Enter the user's email address.");
      return;
    }
    setError(null);
    try {
      await createUserMutation.mutateAsync({ email: email.trim(), role });
      reset();
      setOpen(false);
      onCreated();
    } catch (err) {
      if (err instanceof AuthApiError && err.status === 409) {
        setError("This user has already been pre-approved.");
      } else if (err instanceof AuthApiError) {
        setError(err.message);
      } else {
        setError("Something went wrong. Please try again.");
      }
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <DialogTrigger render={<button type="button" className={PRIMARY_BUTTON} />}>
        <UserPlus className="size-4" />
        Add user
      </DialogTrigger>
      <DialogContent className="max-w-[460px] rounded-2xl ring-border">
        <DialogHeader className="flex-row items-start gap-3 p-6 pb-0">
          <DialogIcon>
            <UserPlus className="size-4" />
          </DialogIcon>
          <div className="space-y-1">
            <DialogTitle className="text-base font-semibold">Add user</DialogTitle>
            <DialogDescription className="text-[13px]">
              They can sign in with this email once added.
            </DialogDescription>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5 px-6" noValidate>
          <div className="space-y-1.5">
            <label htmlFor="new-user-email" className="text-[13px] font-medium text-foreground-2">
              Work email
            </label>
            <input
              id="new-user-email"
              type="email"
              autoComplete="off"
              placeholder="name@coopbankoromiasc.com"
              aria-invalid={!!error}
              aria-describedby={error ? "new-user-error" : undefined}
              className={cn(CONTROL, "w-full px-3", error && "border-bad hover:border-bad")}
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
            {error && (
              <p id="new-user-error" role="alert" className="text-[13px] font-medium text-bad">
                {error}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <p className="text-[13px] font-medium text-foreground-2">Role</p>
            <RoleCards name="new-user-role" value={role} onChange={setRole} />
          </div>

          <DialogFooter className="-mx-6 mt-1 border-t border-line-soft px-6 pt-4 pb-5">
            <DialogClose render={<button type="button" className={OUTLINE_BUTTON} />}>Cancel</DialogClose>
            <button type="submit" className={PRIMARY_BUTTON} disabled={createUserMutation.isPending}>
              {createUserMutation.isPending && <Loader2 className="size-4 animate-spin" />}
              Add user
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function EditUserDialog({
  user,
  open,
  onOpenChange,
}: {
  user: AdminUser;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [role, setRole] = useState<UserRole>(user.role);
  // const [status, setStatus] = useState<UserStatus>(user.status); // status now only changes via the confirmed Enable/Disable action
  const updateUserMutation = useUpdateUser();

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    await updateUserMutation.mutateAsync({ id: user.id, payload: { role } });
    onOpenChange(false);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (next) {
          setRole(user.role);
          // setStatus(user.status);
        }
      }}
    >
      <DialogContent className="max-w-[460px] rounded-2xl ring-border">
        <DialogHeader className="flex-row items-start gap-3 p-6 pb-0">
          <DialogIcon>
            <Pencil className="size-4" />
          </DialogIcon>
          <div className="space-y-1">
            <DialogTitle className="text-base font-semibold">Edit user</DialogTitle>
            <DialogDescription className="text-[13px]">
              Update {user.displayName ?? user.email}&apos;s role and access.
            </DialogDescription>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5 px-6" noValidate>
          <div className="space-y-1.5">
            <p className="text-[13px] font-medium text-foreground-2">Role</p>
            <RoleCards name={`edit-role-${user.id}`} value={role} onChange={setRole} />
          </div>

          {/*
          Status now changes only through the confirmed Enable/Disable action in the row menu.
          <div className="space-y-2">
            <label htmlFor={`edit-status-${user.id}`} className="text-sm font-medium text-foreground">
              Status
            </label>
            <Select
              items={{ ACTIVE: "Active", DISABLED: "Disabled" }}
              value={status}
              onValueChange={(value) => setStatus(value as UserStatus)}
            >
              <SelectTrigger id={`edit-status-${user.id}`} className="h-10! w-full text-base">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ACTIVE" className="text-base">
                  Active
                </SelectItem>
                <SelectItem value="DISABLED" className="text-base">
                  Disabled
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          */}

          <DialogFooter className="-mx-6 mt-1 border-t border-line-soft px-6 pt-4 pb-5">
            <DialogClose render={<button type="button" className={OUTLINE_BUTTON} />}>Cancel</DialogClose>
            <button type="submit" className={PRIMARY_BUTTON} disabled={updateUserMutation.isPending}>
              {updateUserMutation.isPending && <Loader2 className="size-4 animate-spin" />}
              Save
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ToggleStatusDialog({
  user,
  open,
  onOpenChange,
  onConfirm,
  isPending,
}: {
  user: AdminUser;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  isPending: boolean;
}) {
  const willDisable = user.status === "ACTIVE";
  const name = user.displayName ?? user.email;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[420px] rounded-2xl ring-border">
        <DialogHeader className="flex-row items-start gap-3 p-6 pb-0">
          <DialogIcon tone={willDisable ? "bad" : "primary"}>
            <Power className="size-4" />
          </DialogIcon>
          <div className="space-y-1">
            <DialogTitle className="text-base font-semibold">
              {willDisable ? `Disable ${name}?` : `Enable ${name}?`}
            </DialogTitle>
            <DialogDescription className="text-[13px]">
              {willDisable ? `${name} will no longer be able to sign in.` : `${name} will regain access to sign in.`}
            </DialogDescription>
          </div>
        </DialogHeader>

        <DialogFooter className="mt-1 border-t border-line-soft px-6 pt-4 pb-5">
          <DialogClose render={<button type="button" className={OUTLINE_BUTTON} />}>Cancel</DialogClose>
          <button
            type="button"
            className={willDisable ? DANGER_BUTTON : PRIMARY_BUTTON}
            disabled={isPending}
            onClick={onConfirm}
          >
            {isPending && <Loader2 className="size-4 animate-spin" />}
            {willDisable ? "Disable access" : "Enable access"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function UserRowActions({
  user,
  isPending,
  isSelf,
  onToggleStatus,
}: {
  user: AdminUser;
  isPending: boolean;
  isSelf: boolean;
  onToggleStatus: () => void;
}) {
  const [editOpen, setEditOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <button
              type="button"
              disabled={isPending}
              aria-label={`Actions for ${user.displayName ?? user.email}`}
              className="inline-flex size-9 items-center justify-center rounded-[10px] text-muted-foreground transition-colors hover:bg-card hover:text-foreground focus-visible:outline-2 focus-visible:outline-primary disabled:opacity-50 data-popup-open:bg-card data-popup-open:text-foreground"
            />
          }
        >
          {isPending ? <Loader2 className="size-4 animate-spin" /> : <EllipsisVertical className="size-4" />}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-[210px] rounded-xl p-1.5">
          <DropdownMenuItem className="gap-2 rounded-lg px-2.5 py-2" onClick={() => setEditOpen(true)}>
            <Pencil className="size-3.5" />
            Edit role
          </DropdownMenuItem>
          <DropdownMenuItem
            variant={user.status === "ACTIVE" ? "destructive" : "default"}
            disabled={isSelf}
            className="gap-2 rounded-lg px-2.5 py-2"
            onClick={() => setConfirmOpen(true)}
          >
            <Power className="size-3.5" />
            {user.status === "ACTIVE" ? "Disable access" : "Enable access"}
          </DropdownMenuItem>
          {isSelf && (
            <>
              <DropdownMenuSeparator />
              <p className="px-2.5 py-1.5 text-xs text-muted-foreground">You can&apos;t disable your own access.</p>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <EditUserDialog user={user} open={editOpen} onOpenChange={setEditOpen} />
      <ToggleStatusDialog
        user={user}
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        isPending={isPending}
        onConfirm={() => {
          onToggleStatus();
          setConfirmOpen(false);
        }}
      />
    </>
  );
}

function RolePill({ role }: { role: UserRole }) {
  return role === "ADMIN" ? (
    <span className="inline-flex items-center gap-1 rounded-full bg-primary-soft px-2.5 py-1 text-xs font-semibold text-primary-strong">
      <ShieldCheck className="size-3" />
      Admin
    </span>
  ) : (
    <span className="inline-flex items-center rounded-full border border-border px-2.5 py-1 text-xs font-semibold text-foreground-2">
      User
    </span>
  );
}

function StatusLabel({ user }: { user: AdminUser }) {
  if (user.status === "DISABLED") {
    return (
      <span className="inline-flex items-center gap-2 text-sm text-muted-foreground">
        <span className="size-2 shrink-0 rounded-full bg-reversed" aria-hidden />
        Disabled
      </span>
    );
  }
  return (
    <div>
      <span className="inline-flex items-center gap-2 text-sm font-medium text-foreground">
        <span className="size-2 shrink-0 rounded-full bg-good" aria-hidden />
        Active
      </span>
      {/* Display only: an active user who has never signed in is still waiting on their first sign-in. */}
      {!user.lastLoginAt && <p className="pl-4 text-xs text-muted-foreground">Waiting for first sign-in</p>}
    </div>
  );
}

export function UserManagementCard() {
  const meQuery = useMe();
  const isAdmin = meQuery.data?.user.role === "ADMIN";

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | UserRole>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | UserStatus>("all");

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const usersQuery = useAdminUsers(
    {
      search: debouncedSearch || undefined,
      role: roleFilter === "all" ? undefined : roleFilter,
      status: statusFilter === "all" ? undefined : statusFilter,
    },
    { enabled: isAdmin },
  );
  const updateUserMutation = useUpdateUser();

  if (!isAdmin) return null;

  const currentUserId = meQuery.data?.user.userId;
  const users = sortForDisplay(usersQuery.data?.users ?? [], currentUserId);

  function isPendingFor(id: string) {
    return updateUserMutation.isPending && updateUserMutation.variables?.id === id;
  }

  return (
    <section className="rounded-2xl border border-border bg-card shadow-[0_1px_2px_rgba(15,23,43,0.04)] dark:shadow-none">
      <header className="flex flex-wrap items-start justify-between gap-3 px-6 pt-[22px] max-[620px]:px-[18px]">
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-foreground">User management</h2>
          <p className="mt-0.5 text-[13px] text-muted-foreground">
            Pre-approve sign-ins and manage who has access to the workspace
          </p>
        </div>
        <AddUserDialog onCreated={() => usersQuery.refetch()} />
      </header>

      <div className="flex flex-wrap items-center gap-2 px-6 pt-5 pb-4 max-[620px]:px-[18px] max-[620px]:[&>*]:w-full">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            aria-label="Search users"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by email"
            className={cn(CONTROL, "w-full pr-3 pl-9")}
          />
        </div>

        <Select
          items={ROLE_FILTER_ITEMS}
          value={roleFilter}
          onValueChange={(value) => setRoleFilter(value as "all" | UserRole)}
        >
          <SelectTrigger aria-label="Filter by role" className={cn(CONTROL, "w-36 px-3 data-[size=default]:h-10")}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(ROLE_FILTER_ITEMS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          items={STATUS_FILTER_ITEMS}
          value={statusFilter}
          onValueChange={(value) => setStatusFilter(value as "all" | UserStatus)}
        >
          <SelectTrigger aria-label="Filter by status" className={cn(CONTROL, "w-40 px-3 data-[size=default]:h-10")}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(STATUS_FILTER_ITEMS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Scrolls sideways under 640px rather than squashing the columns. */}
      <div className="relative overflow-x-auto">
        <table className="w-full border-collapse text-sm max-[640px]:min-w-[600px]">
          <thead>
            <tr className="border-y border-line-soft text-left text-xs font-semibold text-muted-foreground">
              <th scope="col" className="py-2.5 pr-4 pl-6 font-semibold">User</th>
              <th scope="col" className="px-4 py-2.5 font-semibold">Role</th>
              <th scope="col" className="px-4 py-2.5 font-semibold">Status</th>
              <th scope="col" className="py-2.5 pr-6 pl-4 text-right font-semibold">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line-soft">
            {usersQuery.isLoading ? (
              Array.from({ length: 4 }).map((_, index) => (
                <tr key={index} className="h-16">
                  <td className="pr-4 pl-6">
                    <div className="flex items-center gap-3">
                      <Skeleton className="size-[38px] rounded-full" />
                      <div className="space-y-1.5">
                        <Skeleton className="h-3.5 w-32" />
                        <Skeleton className="h-3 w-44" />
                      </div>
                    </div>
                  </td>
                  <td className="px-4">
                    <Skeleton className="h-6 w-16 rounded-full" />
                  </td>
                  <td className="px-4">
                    <Skeleton className="h-4 w-20" />
                  </td>
                  <td className="pr-6 pl-4" />
                </tr>
              ))
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={4} className="h-28 text-center text-sm text-muted-foreground">
                  No users match these filters.
                </td>
              </tr>
            ) : (
              users.map((user) => {
                const isSelf = user.id === currentUserId;
                return (
                  <tr key={user.id} className="h-16 transition-colors hover:bg-muted">
                    <td className="py-2.5 pr-4 pl-6">
                      <div className="flex items-center gap-3">
                        <span
                          className={cn(
                            "flex size-[38px] shrink-0 items-center justify-center rounded-full text-[13px] font-bold",
                            isSelf ? "bg-orange text-[#3a2618]" : "bg-primary-soft text-primary-strong",
                          )}
                          aria-hidden
                        >
                          {initialsFor(user)}
                        </span>
                        <div className="min-w-0">
                          <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
                            <span className="truncate">{user.displayName ?? user.email}</span>
                            {isSelf && (
                              <span className="shrink-0 rounded-full bg-orange-soft px-1.5 py-px text-[11px] font-semibold text-orange-strong">
                                You
                              </span>
                            )}
                          </p>
                          <p className="truncate text-[13px] text-muted-foreground">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4">
                      <RolePill role={user.role} />
                    </td>
                    <td className="px-4">
                      <StatusLabel user={user} />
                    </td>
                    <td className="pr-6 pl-4 text-right">
                      <UserRowActions
                        user={user}
                        isPending={isPendingFor(user.id)}
                        isSelf={isSelf}
                        onToggleStatus={() =>
                          updateUserMutation.mutate({
                            id: user.id,
                            payload: { status: user.status === "ACTIVE" ? "DISABLED" : "ACTIVE" },
                          })
                        }
                      />
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <footer className="border-t border-line-soft px-6 py-3.5 text-[13px] text-muted-foreground max-[620px]:px-[18px]">
        {usersQuery.isLoading
          ? "Loading users…"
          : `Showing ${users.length} ${users.length === 1 ? "user" : "users"}`}
      </footer>
    </section>
  );
}
