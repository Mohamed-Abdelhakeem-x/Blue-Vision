import {cn} from "@/lib/utils";

export function TileSkeleton({
  className,
  children
}: {
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-[1.25rem] border border-lumaris-border bg-lumaris-tile",
        className
      )}
    >
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.035) 50%, transparent 100%)",
          backgroundSize: "200% 100%",
          animation: "shimmer 2.2s linear infinite"
        }}
      />
      {children}
    </div>
  );
}

/** Matches scan tile (area-scan: 2 cols × 2 rows, min-h-[600px]) */
export function UploadTileSkeleton() {
  return (
    <TileSkeleton className="min-h-[600px] h-full">
      <div className="absolute inset-5 flex flex-col gap-4">
        {/* Header bar */}
        <div className="flex items-center justify-between">
          <div className="h-4 w-24 rounded-md bg-lumaris-muted/50" />
          <div className="h-6 w-20 rounded-full bg-lumaris-muted/50" />
        </div>
        {/* Main dropzone area */}
        <div className="flex-1 rounded-2xl border border-dashed border-lumaris-muted/40 bg-lumaris-muted/10" />
        {/* Secondary dropzone */}
        <div className="h-11 rounded-xl border border-dashed border-lumaris-muted/30 bg-lumaris-muted/10" />
        {/* Domain pills */}
        <div className="flex gap-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-10 flex-1 rounded-xl bg-lumaris-muted/30" />
          ))}
        </div>
        {/* CTA */}
        <div className="h-11 w-full rounded-xl bg-lumaris-lime/20" />
      </div>
    </TileSkeleton>
  );
}

/** Matches result tile (area-result: 2 cols × 2 rows, min-h-[600px]) */
export function ResultTileSkeleton() {
  return (
    <TileSkeleton className="min-h-[600px] h-full">
      <div className="absolute inset-5 flex flex-col gap-4">
        <div className="h-4 w-32 rounded-md bg-lumaris-muted/50" />
        <div className="flex-1 rounded-2xl bg-lumaris-muted/15" />
        <div className="flex gap-4 rounded-2xl border border-lumaris-border bg-lumaris-surface/60 p-4">
          <div className="h-32 w-32 rounded-full bg-lumaris-muted/30" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-3/4 rounded-md bg-lumaris-muted/50" />
            <div className="h-3 w-full rounded-md bg-lumaris-muted/30" />
            <div className="h-3 w-5/6 rounded-md bg-lumaris-muted/30" />
          </div>
        </div>
      </div>
    </TileSkeleton>
  );
}

/** Matches health / tips tiles (small single-column tiles) */
export function MetricTileSkeleton() {
  return (
    <TileSkeleton className="h-full min-h-[12rem]">
      <div className="absolute inset-5 flex flex-col gap-3">
        <div className="h-3 w-20 rounded-md bg-lumaris-muted/50" />
        <div className="h-10 w-24 rounded-md bg-lumaris-muted/40" />
        <div className="h-2 w-full rounded-full bg-lumaris-muted/30" />
        <div className="h-3 w-16 rounded-md bg-lumaris-muted/30" />
      </div>
    </TileSkeleton>
  );
}

/** Matches feed tile (area-feed: 2 cols × 1 row) */
export function FeedTileSkeleton() {
  return (
    <TileSkeleton className="h-full min-h-[14rem]">
      <div className="absolute inset-5 flex flex-col gap-3">
        <div className="h-3 w-28 rounded-md bg-lumaris-muted/50" />
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex items-center gap-3 py-1">
            <div className="h-2 w-2 rounded-full bg-lumaris-muted/50" />
            <div className="flex-1 space-y-1.5">
              <div className="h-3 w-2/3 rounded-md bg-lumaris-muted/40" />
              <div className="h-2.5 w-1/3 rounded-md bg-lumaris-muted/25" />
            </div>
            <div className="h-7 w-20 rounded bg-lumaris-muted/20" />
            <div className="h-5 w-12 rounded-full bg-lumaris-muted/30" />
          </div>
        ))}
      </div>
    </TileSkeleton>
  );
}

