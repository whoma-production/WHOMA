import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading(): JSX.Element {
  return (
    <main className="min-h-screen bg-surface-1 px-4 py-10">
      <div className="mx-auto w-full max-w-6xl space-y-6">
        <Skeleton className="h-7 w-40" />
        <Card className="space-y-4">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-14 w-full" />
          <div className="grid gap-4 md:grid-cols-2">
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
        </Card>
        <div className="grid gap-4 md:grid-cols-3">
          <Skeleton className="h-44 w-full" />
          <Skeleton className="h-44 w-full" />
          <Skeleton className="h-44 w-full" />
        </div>
      </div>
    </main>
  );
}
