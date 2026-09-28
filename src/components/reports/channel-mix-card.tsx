import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { CHANNELS, type ChannelId } from "@/config/channels";
import { formatCurrencyCompact, formatPercent } from "@/lib/format";

export interface ChannelMixRow {
  channel: ChannelId;
  value: number;
  /** Fraction 0-1 of total value. */
  share: number;
}

export function ChannelMixCard({
  rows,
  isLoading,
}: {
  rows: ChannelMixRow[];
  isLoading?: boolean;
}) {
  return (
    <Card>
      <CardHeader>
        <p className="text-[10px] font-semibold tracking-wider text-primary uppercase">
          Channel mix
        </p>
        <CardTitle>Where the value moved</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-56 w-full" />
        ) : (
          <ul className="space-y-3">
            {rows.map((row) => {
              const config = CHANNELS[row.channel];
              return (
                <li key={row.channel} className="flex items-center gap-3">
                  <span className="flex w-28 shrink-0 items-center gap-1.5 text-sm text-foreground">
                    <span
                      className="size-2 shrink-0 rounded-full"
                      style={{ backgroundColor: config?.color }}
                    />
                    <span className="truncate">{config?.name ?? row.channel}</span>
                  </span>
                  <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                    <span
                      className="block h-full rounded-full"
                      style={{
                        width: `${Math.max(2, row.share * 100)}%`,
                        backgroundColor: config?.color,
                      }}
                    />
                  </span>
                  <span className="w-32 shrink-0 text-right text-xs text-muted-foreground">
                    {formatPercent(row.share, 1)} &middot; {formatCurrencyCompact(row.value, "ETB", 2)}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
