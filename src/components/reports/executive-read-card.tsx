import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export interface ExecutiveReadInsights {
  narrative: string;
  growthLabel: string | null;
  flagLabel: string | null;
}

export function ExecutiveReadCard({
  insights,
  isLoading,
}: {
  insights?: ExecutiveReadInsights;
  isLoading?: boolean;
}) {
  return (
    <Card>
      <CardHeader>
        <p className="text-[10px] font-semibold tracking-wider text-primary uppercase">
          Executive read
        </p>
        <CardTitle>Why it matters</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading || !insights ? (
          <Skeleton className="h-48 w-full" />
        ) : (
          <>
            <p className="text-sm text-foreground">{insights.narrative}</p>
            {insights.growthLabel && (
              <div className="rounded-lg bg-primary/10 px-3 py-2.5">
                <p className="text-xs font-semibold text-primary">Growth signal</p>
                <p className="mt-0.5 text-sm text-foreground">{insights.growthLabel}</p>
              </div>
            )}
            {insights.flagLabel && (
              <div className="rounded-lg bg-status-pending/10 px-3 py-2.5">
                <p className="text-xs font-semibold text-status-pending">Flag to watch</p>
                <p className="mt-0.5 text-sm text-foreground">{insights.flagLabel}</p>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
