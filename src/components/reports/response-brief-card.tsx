import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCompactNumber, formatPercent } from "@/lib/format";
import { cn } from "@/lib/utils";

export interface ResponseBrief {
  channelName: string;
  transactionsObserved: number;
  gatewayResponseMs: number;
  /** Fraction 0-1. */
  successRate: number;
  actionNeeded: boolean;
}

export function ResponseBriefCard({
  brief,
  isLoading,
}: {
  brief?: ResponseBrief;
  isLoading?: boolean;
}) {
  return (
    <Card>
      <CardHeader>
        <p className="text-[10px] font-semibold tracking-wider text-primary uppercase">
          Response brief
        </p>
        <CardTitle>Operational assessment</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading || !brief ? (
          <Skeleton className="h-56 w-full" />
        ) : (
          <>
            <dl className="space-y-2.5 text-sm">
              <div className="flex items-center justify-between">
                <dt className="text-muted-foreground">Affected channel</dt>
                <dd className="font-medium text-foreground">{brief.channelName}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-muted-foreground">Transactions observed</dt>
                <dd className="font-medium text-foreground">
                  {formatCompactNumber(brief.transactionsObserved)}
                </dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-muted-foreground">Gateway response</dt>
                <dd className="font-medium text-foreground">
                  {Math.round(brief.gatewayResponseMs)} ms
                </dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-muted-foreground">Success rate</dt>
                <dd className="font-medium text-foreground">
                  {formatPercent(brief.successRate, 2)}
                </dd>
              </div>
            </dl>
            <div
              className={cn(
                "rounded-lg px-3 py-2.5",
                brief.actionNeeded ? "bg-status-failed/10" : "bg-status-success/10",
              )}
            >
              <p
                className={cn(
                  "text-xs font-semibold",
                  brief.actionNeeded ? "text-status-failed" : "text-status-success",
                )}
              >
                {brief.actionNeeded ? "Review recommended" : "No action required"}
              </p>
              <p className="mt-0.5 text-sm text-foreground">
                {brief.actionNeeded
                  ? "Validate upstream channel health and review failed requests before the next sync cycle."
                  : "Failure-rate movement is within normal operating range."}
              </p>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
