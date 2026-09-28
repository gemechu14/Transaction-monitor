"use client";

import { useState } from "react";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";

import { NavLinks } from "@/components/layout/nav-links";
import { SidebarProfile } from "@/components/layout/sidebar-profile";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { NAV_ITEMS } from "@/config/nav";
import { SITE_CONFIG } from "@/config/site";

function useCurrentPage() {
  const pathname = usePathname();
  return (
    NAV_ITEMS.find((item) => pathname?.startsWith(item.href)) ?? {
      title: SITE_CONFIG.shortName,
      description: SITE_CONFIG.description,
    }
  );
}

export function TopNav() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const page = useCurrentPage();

  return (
    <header className="flex shrink-0 items-center gap-3 border-b border-border bg-background px-4 py-3 sm:px-6">
      <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
        <SheetTrigger
          render={
            <Button variant="ghost" size="icon" className="md:hidden" />
          }
        >
          <Menu className="size-5" />
          <span className="sr-only">Open navigation</span>
        </SheetTrigger>
        <SheetContent
          side="left"
          className="flex w-64 flex-col border-r-0 bg-sidebar p-0 text-sidebar-foreground"
        >
          <SheetHeader className="flex h-16 flex-row items-center gap-2 px-5">
            <SheetTitle className="sr-only">{SITE_CONFIG.brandName} navigation</SheetTitle>
            <Image
              src="/wso2-mark.png"
              alt=""
              width={185}
              height={185}
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
          </SheetHeader>
          <div className="min-h-0 flex-1 overflow-y-auto pt-2 pb-4">
            <p className="px-6 pb-1.5 text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
              Menu
            </p>
            <NavLinks onNavigate={() => setMobileNavOpen(false)} />
          </div>
          <div className="border-t border-sidebar-border p-3">
            <SidebarProfile />
          </div>
        </SheetContent>
      </Sheet>

      <div className="min-w-0 flex-1">
        <h1 className="truncate text-base font-semibold text-foreground">{page.title}</h1>
        <p className="truncate text-xs text-muted-foreground">{page.description}</p>
      </div>

      <div className="flex items-center gap-2">
        <ThemeToggle />
      </div>
    </header>
  );
}
