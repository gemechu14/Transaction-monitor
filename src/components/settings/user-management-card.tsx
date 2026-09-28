"use client";

import { useEffect, useState, type FormEvent } from "react";
import { EllipsisVertical, Loader2, Pencil, Power, Search, UserPlus } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAdminUsers, useCreateUser, useMe, useUpdateUser } from "@/hooks";
import { AuthApiError } from "@/lib/api/auth-client";
import type { AdminUser, UserRole, UserStatus } from "@/types/auth";

const ROLE_FILTER_ITEMS: Record<string, string> = { all: "All roles", ADMIN: "Admin", USER: "User" };
const STATUS_FILTER_ITEMS: Record<string, string> = {
  all: "All statuses",
  ACTIVE: "Active",
  DISABLED: "Disabled",
};
const ROLE_ITEMS: Record<UserRole, string> = { ADMIN: "Admin", USER: "User" };

function initialsFor(user: AdminUser): string {
  const source = (user.displayName || user.email).trim();
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1 || !user.displayName) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
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
      <DialogTrigger
        render={<Button className="gap-1.5 bg-[#00ADEF] text-sm text-white hover:bg-[#00ADEF]/90" />}
      >
        <UserPlus className="size-4" />
        Add user
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader className="flex-row items-start gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10">
            <UserPlus className="size-4 text-primary" />
          </span>
          <div className="space-y-1">
            <DialogTitle>Pre-approve a user</DialogTitle>
            <DialogDescription>
              They&apos;ll be able to sign in with their Active Directory credentials once added here.
            </DialogDescription>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5 px-5" noValidate>
          <div className="space-y-2">
            <label htmlFor="new-user-email" className="text-sm font-medium text-foreground">
              Email
            </label>
            <Input
              id="new-user-email"
              type="email"
              autoComplete="off"
              placeholder="jane.doe@coopbankoromiasc.com"
              className="h-10 text-base"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="new-user-role" className="text-sm font-medium text-foreground">
              Role
            </label>
            <Select items={ROLE_ITEMS} value={role} onValueChange={(value) => setRole(value as UserRole)}>
              <SelectTrigger id="new-user-role" className="h-10! w-full text-base">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="USER" className="text-base">
                  User
                </SelectItem>
                <SelectItem value="ADMIN" className="text-base">
                  Admin
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {error && (
            <p role="alert" className="text-sm font-medium text-status-failed">
              {error}
            </p>
          )}

          <DialogFooter className="px-0 pt-0 pb-5">
            <DialogClose render={<Button type="button" variant="outline" className="h-10 text-base" />}>
              Cancel
            </DialogClose>
            <Button
              type="submit"
              className="h-10 gap-1.5 bg-[#00ADEF] text-base text-white hover:bg-[#00ADEF]/90"
              disabled={createUserMutation.isPending}
            >
              {createUserMutation.isPending && <Loader2 className="size-4 animate-spin" />}
              Add user
            </Button>
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
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit user</DialogTitle>
          <DialogDescription>Update {user.displayName ?? user.email}&apos;s role and access.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5 px-5" noValidate>
          <div className="space-y-2">
            <label htmlFor={`edit-role-${user.id}`} className="text-sm font-medium text-foreground">
              Role
            </label>
            <Select items={ROLE_ITEMS} value={role} onValueChange={(value) => setRole(value as UserRole)}>
              <SelectTrigger id={`edit-role-${user.id}`} className="h-10! w-full text-base">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="USER" className="text-base">
                  User
                </SelectItem>
                <SelectItem value="ADMIN" className="text-base">
                  Admin
                </SelectItem>
              </SelectContent>
            </Select>
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

          <DialogFooter className="px-0 pt-0 pb-5">
            <DialogClose render={<Button type="button" variant="outline" className="h-10 text-base" />}>
              Cancel
            </DialogClose>
            <Button
              type="submit"
              className="h-10 gap-1.5 bg-[#00ADEF] text-base text-white hover:bg-[#00ADEF]/90"
              disabled={updateUserMutation.isPending}
            >
              {updateUserMutation.isPending && <Loader2 className="size-4 animate-spin" />}
              Save
            </Button>
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{willDisable ? "Disable user" : "Enable user"}</DialogTitle>
          <DialogDescription>
            {willDisable
              ? `${user.displayName ?? user.email} will no longer be able to sign in.`
              : `${user.displayName ?? user.email} will regain access to sign in.`}
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="px-5 pb-5">
          <DialogClose render={<Button type="button" variant="outline" />}>Cancel</DialogClose>
          <Button
            type="button"
            variant={willDisable ? "destructive" : "default"}
            className={willDisable ? undefined : "bg-[#00ADEF] text-white hover:bg-[#00ADEF]/90"}
            disabled={isPending}
            onClick={onConfirm}
          >
            {isPending && <Loader2 className="size-4 animate-spin" />}
            {willDisable ? "Disable" : "Enable"}
          </Button>
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
            <Button variant="ghost" size="icon" className="size-8" disabled={isPending} aria-label="User actions" />
          }
        >
          {isPending ? <Loader2 className="size-3.5 animate-spin" /> : <EllipsisVertical className="size-4" />}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setEditOpen(true)}>
            <Pencil className="size-3.5" />
            Edit
          </DropdownMenuItem>
          <DropdownMenuItem
            variant={user.status === "ACTIVE" ? "destructive" : "default"}
            disabled={isSelf}
            onClick={() => setConfirmOpen(true)}
          >
            <Power className="size-3.5" />
            {user.status === "ACTIVE" ? "Disable" : "Enable"}
          </DropdownMenuItem>
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

  const users = usersQuery.data?.users ?? [];
  const currentUserId = meQuery.data?.user.userId;

  function isPendingFor(id: string) {
    return updateUserMutation.isPending && updateUserMutation.variables?.id === id;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col items-start gap-3 @lg/card-header:flex-row @lg/card-header:items-center @lg/card-header:justify-between">
          <CardTitle>User management</CardTitle>
          <AddUserDialog onCreated={() => usersQuery.refetch()} />
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[200px] flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by email"
              className="pl-8"
            />
          </div>

          <Select
            items={ROLE_FILTER_ITEMS}
            value={roleFilter}
            onValueChange={(value) => setRoleFilter(value as "all" | UserRole)}
          >
            <SelectTrigger className="w-32">
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
            <SelectTrigger className="w-36">
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

        <div className="overflow-hidden rounded-lg border border-border">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>User</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {usersQuery.isLoading ? (
                Array.from({ length: 4 }).map((_, index) => (
                  <TableRow key={index}>
                    {Array.from({ length: 4 }).map((__, cellIndex) => (
                      <TableCell key={cellIndex}>
                        <Skeleton className="h-4 w-full max-w-32" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                    No users match the current filters.
                  </TableCell>
                </TableRow>
              ) : (
                users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        <Avatar size="sm" className="shrink-0">
                          <AvatarFallback className="bg-primary/10 text-primary">
                            {initialsFor(user)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-foreground">
                            {user.displayName ?? user.email}
                            {user.id === currentUserId && (
                              <span className="ml-1.5 text-xs font-normal text-muted-foreground">(you)</span>
                            )}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{ROLE_ITEMS[user.role]}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={user.status === "ACTIVE" ? "secondary" : "outline"}>
                        {user.status === "ACTIVE" ? "Active" : "Disabled"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <UserRowActions
                        user={user}
                        isPending={isPendingFor(user.id)}
                        isSelf={user.id === currentUserId}
                        onToggleStatus={() =>
                          updateUserMutation.mutate({
                            id: user.id,
                            payload: { status: user.status === "ACTIVE" ? "DISABLED" : "ACTIVE" },
                          })
                        }
                      />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
