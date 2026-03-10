import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";

const RHPreExportSkeleton = () => {
  return (
    <div className="space-y-4">
      {/* Barre de progression indéterminée */}
      <div className="w-full h-0.5 bg-muted rounded-full overflow-hidden">
        <div className="h-full w-1/3 bg-primary rounded-full animate-[indeterminate_1.5s_ease-in-out_infinite]" />
      </div>

      {/* Dashboard stats skeleton - 5 cards */}
      <div className="grid gap-3 grid-cols-2 md:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Card key={i} className="p-3 shadow-sm border-border/50">
            <div className="flex items-center gap-2">
              <Skeleton className="h-8 w-8 rounded-full" />
              <div className="space-y-1.5 flex-1">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-5 w-10" />
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Toolbar skeleton */}
      <div className="flex items-center gap-2 flex-wrap">
        <Skeleton className="h-9 w-28 rounded-md" />
        <Skeleton className="h-9 w-24 rounded-md" />
        <Skeleton className="h-9 w-32 rounded-md" />
        <div className="flex-1" />
        <Skeleton className="h-9 w-36 rounded-md" />
      </div>

      {/* Tableau skeleton */}
      <div className="border border-border rounded-lg overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 bg-muted/50 border-b border-border">
          {[80, 120, 90, 70, 70, 90, 80].map((w, i) => (
            <Skeleton key={i} className="h-4" style={{ width: w }} />
          ))}
        </div>

        {/* Rows */}
        {Array.from({ length: 8 }).map((_, row) => (
          <div
            key={row}
            className="flex items-center gap-3 px-4 py-3 border-b border-border last:border-0"
          >
            {/* Avatar circle */}
            <Skeleton className="h-6 w-6 rounded-full shrink-0" />
            {/* Cells with varied widths */}
            {[100, 130, 60, 50, 50, 70, 60].map((w, i) => (
              <Skeleton
                key={i}
                className="h-4"
                style={{ width: w + (row % 3) * 10 }}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

export default RHPreExportSkeleton;
