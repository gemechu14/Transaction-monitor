"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

import { useMe } from "@/hooks";

/**
 * Gates the dashboard routes behind a valid session. There's no server-side
 * session check available (the auth backend may live on a different origin
 * than this app), so this relies on a client-side `GET /api/auth/me` — see
 * FRONTEND_INTEGRATION.md.
 */
export function AuthGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const meQuery = useMe();

  useEffect(() => {
    if (meQuery.isError) {
      router.replace("/login");
    }
  }, [meQuery.isError, router]);

  if (meQuery.data?.user) {
    return children;
  }

  return (
    <div className="flex h-svh w-full items-center justify-center bg-background">
      <Loader2 className="size-6 animate-spin text-muted-foreground" />
    </div>
  );
}
