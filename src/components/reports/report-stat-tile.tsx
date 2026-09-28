import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export function ReportStatTile({
  label,
  value,
  helperText,
  helperTone = "neutral",
  isLoading,
}: {
  label: string;
  value?: string;
  helperText?: string;
  helperTone?: "positive" | "negative" | "neutral";
  isLoading?: boolean;
}) {
  if (isLoading || value === undefined) {
    return (
      <Card size="sm">
        <CardContent className="space-y-2">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-6 w-16" />
          <Skeleton className="h-3 w-24" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card size="sm">
      <CardContent className="space-y-1">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-2xl font-semibold text-foreground">{value}</p>
        {helperText && (
          <p
            className={cn(
              "text-xs",
              helperTone === "positive" && "text-status-success",
              helperTone === "negative" && "text-status-failed",
              helperTone === "neutral" && "text-muted-foreground",
            )}
          >
            {helperText}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
