"use client";

import Image from "next/image";
import { PanelLeft } from "lucide-react";

import { NavLinks } from "@/components/layout/nav-links";
import { SidebarProfile } from "@/components/layout/sidebar-profile";
import { Button } from "@/components/ui/button";
import { SITE_CONFIG } from "@/config/site";
import { cn } from "@/lib/utils";

export function Sidebar({
  collapsed,
  onToggleCollapse,
}: {
  collapsed: boolean;
  onToggleCollapse: () => void;
}) {
  return (
    <aside
      className={cn(
        "hidden shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-[width] duration-200 md:flex",
        collapsed ? "w-[76px]" : "w-60",
      )}
    >
      <div className={cn("flex h-16 items-center gap-2 px-4", collapsed && "justify-center px-0")}>
        {!collapsed && (
          <>
            <Image
              src="/wso2-mark.png"
              alt=""
              width={185}
              height={185}
              priority
              className="size-8 shrink-0"
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold tracking-tight text-foreground">
                {SITE_CONFIG.brandName}
              </p>
              <p className="truncate text-[10px] leading-tight font-medium tracking-wide text-muted-foreground uppercase">
                {SITE_CONFIG.brandTagline}
              </p>
            </div>
          </>
        )}
        <Button
          variant="ghost"
          size="icon-sm"
          className="shrink-0"
          onClick={onToggleCollapse}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <PanelLeft className={cn("size-4", collapsed && "-scale-x-100")} />
        </Button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto pt-2 pb-4">
        {!collapsed && (
          <p className="px-6 pb-1.5 text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
            Menu
          </p>
        )}
        <NavLinks collapsed={collapsed} />
      </div>

      <div className="border-t border-sidebar-border p-3">
        <SidebarProfile collapsed={collapsed} />
      </div>
    </aside>
  );
}
