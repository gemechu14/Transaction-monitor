"use client";

import dynamic from "next/dynamic";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { PeakLoadPoint } from "@/types/api";

const PeakLoadHeatmap = dynamic(
  () => import("@/components/charts/heatmap-chart").then((mod) => mod.PeakLoadHeatmap),
  { ssr: false, loading: () => <Skeleton className="h-64 w-full" /> },
);

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function PeakLoadCard({
  data,
  isLoading,
}: {
  data: PeakLoadPoint[];
  isLoading?: boolean;
}) {
  const busiest = data.reduce<PeakLoadPoint | undefined>(
    (max, point) => (!max || point.value > max.value ? point : max),
    undefined,
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Peak load — volume by day and hour</CardTitle>
        <CardDescription>
          {busiest
            ? `Busiest window: ${DAY_LABELS[busiest.day]} at ${String(busiest.hour).padStart(2, "0")}:00`
            : "Typical weekly load pattern"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading || data.length === 0 ? (
          <Skeleton className="h-64 w-full" />
        ) : (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-500 ease-out">
            <PeakLoadHeatmap data={data} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
