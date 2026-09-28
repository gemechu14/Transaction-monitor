import { TriangleAlert } from "lucide-react";

import { Skeleton } from "@/components/ui/skeleton";

export function SpikeAlertBanner({
  title,
  description,
  isLoading,
}: {
  title?: string;
  description: string;
  isLoading?: boolean;
}) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-l-4 border-status-failed/30 border-l-status-failed bg-card px-4 py-4 ring-1 ring-foreground/10 sm:px-6">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-status-failed/10 text-status-failed">
        <TriangleAlert className="size-4" />
      </span>
      <div className="min-w-0 space-y-1">
        <p className="text-[10px] font-semibold tracking-wider text-status-failed uppercase">
          Spike alert &middot; Active review
        </p>
        {isLoading || !title ? (
          <Skeleton className="h-5 w-64" />
        ) : (
          <h2 className="text-base font-semibold text-foreground sm:text-lg">{title}</h2>
        )}
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}
