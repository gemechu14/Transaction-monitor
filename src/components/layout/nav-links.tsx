"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { NAV_ITEMS } from "@/config/nav";
import { useMe } from "@/hooks";
import { cn } from "@/lib/utils";

export function NavLinks({
  onNavigate,
  collapsed = false,
}: {
  onNavigate?: () => void;
  collapsed?: boolean;
}) {
  const pathname = usePathname();
  const meQuery = useMe();
  const isAdmin = meQuery.data?.user.role === "ADMIN";
  const items = NAV_ITEMS.filter((item) => !item.adminOnly || isAdmin);

  return (
    // Full-width rows: the active one gets a light-blue band, blue text and a solid bar on the left edge.
    <nav className="flex flex-col gap-0.5">
      {items.map((item) => {
        const isActive = pathname?.startsWith(item.href);
        const Icon = item.icon;

        const link = (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "relative flex items-center gap-3 px-6 py-2.5 text-sm font-medium outline-none transition-colors",
              "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
              "focus-visible:ring-2 focus-visible:ring-sidebar-ring focus-visible:ring-inset",
              "before:absolute before:inset-y-0 before:left-0 before:w-[3px] before:bg-transparent",
              collapsed && "justify-center px-0",
              isActive && "bg-primary-soft text-primary before:bg-primary hover:bg-primary-soft hover:text-primary",
            )}
          >
            <Icon className="size-[18px] shrink-0" />
            {!collapsed && <span className="flex-1 truncate">{item.title}</span>}
          </Link>
        );

        if (!collapsed) return link;

        return (
          <Tooltip key={item.href}>
            <TooltipTrigger render={link} />
            <TooltipContent side="right">{item.title}</TooltipContent>
          </Tooltip>
        );
      })}
    </nav>
  );
}
