import { cn } from "@/lib/utils";

/**
 * One loading line: a shimmer bar inside an invisible line of text. Give it the
 * same type classes as the real line so the loading state is exactly as tall.
 */
export function ShimmerLine({
  className,
  barClassName,
  delay = 0,
}: {
  className?: string;
  /** Bar width and shape, e.g. "w-32 rounded-full". Height defaults to 0.8em. */
  barClassName?: string;
  delay?: number;
}) {
  return (
    <div className={cn("relative", className)} aria-hidden="true">
      <span className="invisible">0</span>
      <span
        className={cn(
          "skeleton-shimmer absolute top-1/2 left-0 h-[0.8em] -translate-y-1/2 rounded-full",
          barClassName,
        )}
        style={{ animationDelay: `${delay}ms` }}
      />
    </div>
  );
}

/** A shimmer ring for donut charts while they load. */
export function ShimmerRing({ size, radius, stroke }: { size: number; radius: number; stroke: number }) {
  const inner = radius - stroke / 2;
  const outer = radius + stroke / 2;
  return (
    <div
      className="skeleton-shimmer rounded-full"
      style={{
        width: size,
        height: size,
        mask: `radial-gradient(circle, transparent ${inner}px, #000 ${inner + 0.5}px, #000 ${outer}px, transparent ${outer + 0.5}px)`,
      }}
      aria-hidden="true"
    />
  );
}
