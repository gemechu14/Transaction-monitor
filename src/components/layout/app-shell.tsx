"use client";

import { useState } from "react";

import { Sidebar } from "@/components/layout/sidebar";
import { TopNav } from "@/components/layout/top-nav";

const SIDEBAR_STORAGE_KEY = "wso2-sidebar";

// AppShell only mounts on the client (behind AuthGate), so reading storage up front can't mismatch SSR.
function readCollapsed(): boolean {
  try {
    return window.localStorage.getItem(SIDEBAR_STORAGE_KEY) === "collapsed";
  } catch {
    return false;
  }
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(readCollapsed);

  function toggleCollapsed() {
    setCollapsed((current) => {
      const next = !current;
      try {
        window.localStorage.setItem(SIDEBAR_STORAGE_KEY, next ? "collapsed" : "open");
      } catch {
        // Storage blocked: the choice just won't persist.
      }
      return next;
    });
  }

  return (
    <div className="flex h-svh w-full overflow-hidden bg-background">
      <Sidebar collapsed={collapsed} onToggleCollapse={toggleCollapsed} />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <TopNav />
        <main className="relative min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
