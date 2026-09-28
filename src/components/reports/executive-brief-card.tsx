import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export function ExecutiveBriefCard({
  eyebrow,
  title,
  subtitle,
  bigValue,
  bigValueHelper,
  changeLabel,
  changePositive = true,
  isLoading,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
  bigValue?: string;
  bigValueHelper: string;
  changeLabel?: string;
  changePositive?: boolean;
  isLoading?: boolean;
}) {
  return (
    <div className="overflow-hidden rounded-xl bg-card text-sm text-card-foreground ring-1 ring-foreground/10">
      <div className="space-y-1 px-4 py-4 sm:px-6">
        <p className="text-[10px] font-semibold tracking-wider text-primary uppercase">{eyebrow}</p>
        <h2 className="text-xl font-bold text-foreground sm:text-2xl">{title}</h2>
        <p className="text-sm text-muted-foreground">{subtitle}</p>
      </div>
      <div className="border-t border-border px-4 py-4 sm:px-6">
        {isLoading || bigValue === undefined ? (
          <Skeleton className="h-9 w-48" />
        ) : (
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-3xl font-bold text-foreground">{bigValue}</p>
            <span className="text-sm text-muted-foreground">{bigValueHelper}</span>
            {changeLabel && (
              <span
                className={cn(
                  "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium",
                  changePositive
                    ? "bg-status-success/10 text-status-success"
                    : "bg-status-failed/10 text-status-failed",
                )}
              >
                {changePositive ? "↗" : "↘"} {changeLabel}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
