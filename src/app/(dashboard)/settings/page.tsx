"use client";

// import { useState } from "react"; // only needed by the disabled sections below
import { ShieldAlert } from "lucide-react";
// import {
//   AlertTriangle,
//   Mail,
//   MessageSquare,
//   Save,
//   ShieldCheck,
//   Webhook,
//   type LucideIcon,
// } from "lucide-react";

import { UserManagementCard } from "@/components/settings/user-management-card";
// import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
// import { CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
// import { Input } from "@/components/ui/input";
// import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
// import { Switch } from "@/components/ui/switch";
// import { CHANNEL_LIST, type ChannelId } from "@/config/channels";
import { useMe } from "@/hooks";

// interface ChannelThreshold {
//   failureRatePct: number;
//   latencyMs: number;
// }
//
// const DEFAULT_THRESHOLDS: Record<ChannelId, ChannelThreshold> = Object.fromEntries(
//   CHANNEL_LIST.map((c) => [c.id, { failureRatePct: 2, latencyMs: 1500 }]),
// ) as Record<ChannelId, ChannelThreshold>;
//
// type NotifyKey = "email" | "sms" | "webhook";
//
// const NOTIFY_CHANNELS: { key: NotifyKey; label: string; icon: LucideIcon; helper: string }[] = [
//   {
//     key: "email",
//     label: "Email",
//     icon: Mail,
//     helper: "Daily digest plus real-time critical alerts",
//   },
//   {
//     key: "sms",
//     label: "SMS",
//     icon: MessageSquare,
//     helper: "Critical anomalies only",
//   },
//   {
//     key: "webhook",
//     label: "Webhook",
//     icon: Webhook,
//     helper: "Push events to the incident-response channel",
//   },
// ];

export default function SettingsPage() {
  const meQuery = useMe();
  const isAdmin = meQuery.data?.user.role === "ADMIN";
  // const user = meQuery.data?.user; // only used by the disabled "Signed in" card below
  // const [thresholds, setThresholds] = useState(DEFAULT_THRESHOLDS);
  // const [notify, setNotify] = useState<Record<NotifyKey, boolean>>({
  //   email: true,
  //   sms: true,
  //   webhook: false,
  // });
  // const [saved, setSaved] = useState(false);
  //
  // function updateThreshold(id: ChannelId, field: keyof ChannelThreshold, value: number) {
  //   setThresholds((prev) => ({ ...prev, [id]: { ...prev[id], [field]: value } }));
  //   setSaved(false);
  // }

  return (
    <div className="space-y-4">
      <div className="sticky -top-4 z-20 -mx-4 -mt-2 flex flex-col gap-3 border-b border-border bg-background px-4 py-3 sm:-top-6 sm:-mx-6 sm:px-6 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-base font-bold text-foreground sm:text-lg">Settings</h1>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
              <span className="size-1.5 shrink-0 rounded-full bg-primary" />
              Admin
            </span>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Pre-approve sign-ins and manage who has access to the workspace.
          </p>
        </div>

        {/*
        "Save changes" belonged to the alert-thresholds / notification-channel forms below,
        disabled along with them.

        <Button size="sm" className="gap-1.5 text-xs" onClick={() => setSaved(true)}>
          <Save className="size-3.5" />
          Save changes
        </Button>
        */}
      </div>

      {/*
      {saved && (
        <div className="flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-sm text-primary">
          <ShieldCheck className="size-4 shrink-0" />
          Preferences saved for this session.
        </div>
      )}
      */}

      {meQuery.isLoading ? (
        <Card>
          <CardContent className="space-y-3 py-10">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-40 w-full" />
          </CardContent>
        </Card>
      ) : isAdmin ? (
        <UserManagementCard />
      ) : (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-muted">
              <ShieldAlert className="size-6 text-muted-foreground" />
            </span>
            <div className="space-y-1">
              <p className="text-sm font-semibold text-foreground">Admins only</p>
              <p className="mx-auto max-w-sm text-sm text-muted-foreground">
                This page is restricted to workspace admins. Contact an administrator if you believe you
                should have access.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/*
      Alert thresholds, Notification channels and Signed-in are disabled for now — the page is
      admin-only user management above. Kept here, commented out, in case they come back.

      <Card>
        <CardHeader>
          <CardTitle>Alert thresholds</CardTitle>
          <CardDescription>
            Per-channel limits that flag an anomaly, evaluated against the trailing 24-hour window for
            each platform.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-[1fr_repeat(2,minmax(0,140px))] items-center gap-x-4 gap-y-2 text-xs font-medium text-muted-foreground">
            <span>Channel</span>
            <span>Failure rate (%)</span>
            <span>Latency (ms)</span>
          </div>
          <Separator />
          {CHANNEL_LIST.map((channel) => (
            <div
              key={channel.id}
              className="grid grid-cols-[1fr_repeat(2,minmax(0,140px))] items-center gap-x-4 gap-y-2"
            >
              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                <span
                  className="size-2 shrink-0 rounded-full"
                  style={{ backgroundColor: channel.color }}
                />
                {channel.name}
              </div>
              <Input
                type="number"
                min={0}
                step={0.1}
                value={thresholds[channel.id].failureRatePct}
                onChange={(e) =>
                  updateThreshold(channel.id, "failureRatePct", Number(e.target.value))
                }
              />
              <Input
                type="number"
                min={0}
                step={50}
                value={thresholds[channel.id].latencyMs}
                onChange={(e) => updateThreshold(channel.id, "latencyMs", Number(e.target.value))}
              />
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Notification channels</CardTitle>
            <CardDescription>
              Choose how reconciliation and threshold alerts reach the team.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {NOTIFY_CHANNELS.map(({ key, label, icon: Icon, helper }) => (
              <div
                key={key}
                className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2"
              >
                <div className="flex items-center gap-2.5">
                  <Icon className="size-4 shrink-0 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium text-foreground">{label}</p>
                    <p className="text-xs text-muted-foreground">{helper}</p>
                  </div>
                </div>
                <Switch
                  checked={notify[key]}
                  onCheckedChange={(checked) =>
                    setNotify((prev) => ({ ...prev, [key]: checked }))
                  }
                  aria-label={`Toggle ${label} notifications`}
                />
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Signed in</CardTitle>
            <CardDescription>
              Your workspace identity for audit trails and report attribution.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                {(user?.displayName ?? user?.username ?? "?").slice(0, 2).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-foreground">
                  {user?.displayName ?? user?.username ?? "Signed in"}
                </p>
                <p className="truncate text-xs text-muted-foreground">{user?.email}</p>
              </div>
              {user?.role && (
                <span className="ml-auto shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                  {user.role === "ADMIN" ? "Admin" : "User"}
                </span>
              )}
            </div>
            <Separator />
            <div className="flex items-start gap-2 text-xs text-muted-foreground">
              <AlertTriangle className="size-3.5 shrink-0" />
              <span>
                The Anomalies view is currently hidden from navigation pending review. Existing alert
                thresholds above still govern detection in the background.
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
      */}
    </div>
  );
}
