"use client";

// import { Activity, FileDown, KeyRound, Scale, SlidersHorizontal } from "lucide-react"; // only needed by the disabled sections below
import { ShieldCheck } from "lucide-react";

import { Avatar, AvatarBadge, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { SITE_CONFIG } from "@/config/site";
import { useMe } from "@/hooks";
import type { UserRole } from "@/types/auth";

const ROLE_LABELS: Record<UserRole, string> = { ADMIN: "Administrator", USER: "Analyst" };

// const ACTIVITY = [
//   {
//     icon: SlidersHorizontal,
//     title: "Lowered the Telebirr failure-rate threshold to 1.5%",
//     time: "2 days ago",
//   },
//   {
//     icon: FileDown,
//     title: "Exported the Platform Pulse report as CSV",
//     time: "4 days ago",
//   },
//   {
//     icon: Scale,
//     title: "Reviewed CoopStream inflow/outflow reconciliation",
//     time: "1 week ago",
//   },
//   {
//     icon: Activity,
//     title: "Acknowledged a latency spike alert on Chapa",
//     time: "2 weeks ago",
//   },
// ];

function initialsFor(name: string | null | undefined, fallback: string) {
  const source = name?.trim() || fallback;
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export default function ProfilePage() {
  const meQuery = useMe();
  const user = meQuery.data?.user;

  return (
    <div className="space-y-4">
      <div className="sticky -top-4 z-20 -mx-4 flex flex-col gap-3 border-b border-border bg-background px-4 py-3 sm:-top-6 sm:-mx-6 sm:px-6">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-base font-bold text-foreground sm:text-lg">Profile</h1>
            {user && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
                <span className="size-1.5 shrink-0 rounded-full bg-primary" />
                {ROLE_LABELS[user.role]}
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Your identity within the {SITE_CONFIG.name} workspace.
          </p>
        </div>
      </div>

      <div className="w-full max-w-sm">
        <Card>
          <CardContent className="flex flex-col items-start gap-3 pt-2 text-left">
            <div className="flex w-full items-center gap-3">
              <Avatar size="lg" className="size-16 shrink-0">
                <AvatarFallback className="bg-primary text-lg font-semibold text-primary-foreground">
                  {meQuery.isLoading ? "" : initialsFor(user?.displayName, user?.username ?? user?.email ?? "")}
                </AvatarFallback>
                <AvatarBadge>
                  <ShieldCheck />
                </AvatarBadge>
              </Avatar>

              {meQuery.isLoading ? (
                <div className="min-w-0 flex-1 space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-40" />
                </div>
              ) : (
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-foreground">
                    {user?.displayName ?? user?.username ?? "Signed in"}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">{user?.email}</p>
                </div>
              )}
            </div>

            {user && (
              <div className="flex flex-wrap items-center gap-1.5">
                <Badge variant="outline">{ROLE_LABELS[user.role]}</Badge>
              </div>
            )}
            <Separator />
            <p className="text-xs text-muted-foreground">
              Identity and password are managed by your organization&apos;s single sign-on provider.
            </p>
          </CardContent>
        </Card>
      </div>

      {/*
        Recent activity has no backing API yet (no audit/activity endpoint exists) — re-enable
        once one is wired up, using the ACTIVITY placeholder above as a shape reference.

        <Card className="h-full">
          <CardHeader>
            <CardTitle>Recent activity</CardTitle>
            <CardDescription>Your latest actions across the workspace.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-1">
            {ACTIVITY.map((item, index) => (
              <div key={index}>
                <div className="flex items-start gap-3 py-2">
                  <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-muted">
                    <item.icon className="size-3.5 text-muted-foreground" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-foreground">{item.title}</p>
                    <p className="text-xs text-muted-foreground">{item.time}</p>
                  </div>
                </div>
                {index < ACTIVITY.length - 1 && <Separator />}
              </div>
            ))}
          </CardContent>
        </Card>
        */}
    </div>
  );
}
