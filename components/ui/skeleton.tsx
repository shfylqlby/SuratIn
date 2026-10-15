import { cn } from "@/lib/cn";

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn("rounded-md bg-garis-halus motion-safe:animate-pulse", className)} />;
}

export function ListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div role="status" aria-label="Memuat data" className="space-y-3">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-4 rounded-[var(--radius-kartu)] border border-garis-halus bg-lembar p-4">
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-2/5" />
            <Skeleton className="h-3.5 w-3/5" />
          </div>
          <Skeleton className="h-7 w-28 rounded-full" />
        </div>
      ))}
      <span className="sr-only">Memuat…</span>
    </div>
  );
}
