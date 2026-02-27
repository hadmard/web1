/** 骨架屏：数据库风格，极简矩形 */
export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded bg-border ${className}`}
      aria-hidden
    />
  );
}

export function SkeletonCard() {
  return (
    <div className="p-5 rounded-lg border border-border bg-surface-elevated space-y-2">
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-3 w-1/2" />
      <Skeleton className="h-3 w-full mt-2" />
    </div>
  );
}
