"use client";

import { ChevronsUpDown } from "lucide-react";

import { AccountMenu } from "@/components/layout/account-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useMe } from "@/hooks";
import { cn } from "@/lib/utils";

function initialsFor(name: string | null | undefined, fallback: string) {
  const source = name?.trim() || fallback;
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export function SidebarProfile({ collapsed = false }: { collapsed?: boolean }) {
  const meQuery = useMe();
  const user = meQuery.data?.user;
  const name = user?.displayName ?? user?.username ?? "Signed in";
  const initials = initialsFor(user?.displayName, user?.username ?? user?.email ?? "");

  return (
    <AccountMenu
      align="start"
      trigger={
        <button
          type="button"
          className={cn(
            "flex w-full items-center gap-2.5 rounded-md p-2 text-left transition-colors hover:bg-sidebar-accent",
            collapsed && "justify-center px-0",
          )}
        >
          <Avatar className="size-8 shrink-0">
            <AvatarFallback className="bg-primary text-xs text-primary-foreground">
              {initials}
            </AvatarFallback>
          </Avatar>
          {!collapsed && (
            <>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-sidebar-foreground">
                  {name}
                </span>
                <span className="block truncate text-xs text-muted-foreground">{user?.email}</span>
              </span>
              <ChevronsUpDown className="size-4 shrink-0 text-muted-foreground" />
            </>
          )}
        </button>
      }
    />
  );
}
