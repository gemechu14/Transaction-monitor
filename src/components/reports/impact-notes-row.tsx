import type { LucideIcon } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export interface ImpactNote {
  icon: LucideIcon;
  title: string;
  body: string;
}

const NOTE_SKELETON_COUNT = 3;

export function ImpactNotesRow({
  notes,
  isLoading,
}: {
  notes: ImpactNote[];
  isLoading?: boolean;
}) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      {isLoading
        ? Array.from({ length: NOTE_SKELETON_COUNT }).map((_, index) => (
            <Card key={index} size="sm">
              <CardContent className="space-y-2">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-12 w-full" />
              </CardContent>
            </Card>
          ))
        : notes.map((note) => (
            <Card key={note.title} size="sm">
              <CardContent className="space-y-1.5">
                <p className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                  <note.icon className="size-4 text-primary" />
                  {note.title}
                </p>
                <p className="text-xs text-muted-foreground">{note.body}</p>
              </CardContent>
            </Card>
          ))}
    </div>
  );
}
