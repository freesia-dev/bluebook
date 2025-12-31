import { Skeleton } from "@/components/ui/skeleton";
import { MainLayout } from "@/components/layout/MainLayout";

export const DashboardSkeleton = () => (
  <MainLayout>
    <div className="space-y-6">
      {/* Header skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-72" />
        </div>
        <Skeleton className="h-10 w-40" />
      </div>

      {/* Stats grid skeleton */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>

      {/* Cards skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Skeleton className="h-48 rounded-xl" />
        <Skeleton className="h-48 rounded-xl" />
      </div>

      {/* Chart skeleton */}
      <Skeleton className="h-72 rounded-xl" />

      {/* Recent data skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-64 rounded-xl" />
        ))}
      </div>
    </div>
  </MainLayout>
);

export const TablePageSkeleton = () => (
  <MainLayout>
    <div className="space-y-6">
      {/* Header skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-72" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-10 w-32" />
        </div>
      </div>

      {/* Search and filters skeleton */}
      <div className="flex gap-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-10 w-32" />
      </div>

      {/* Table skeleton */}
      <Skeleton className="h-96 rounded-xl" />
    </div>
  </MainLayout>
);

export const FormPageSkeleton = () => (
  <MainLayout>
    <div className="space-y-6">
      {/* Header skeleton */}
      <div>
        <Skeleton className="h-8 w-48 mb-2" />
        <Skeleton className="h-4 w-72" />
      </div>

      {/* Form skeleton */}
      <div className="grid gap-4 max-w-2xl">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-10 w-full" />
          </div>
        ))}
        <Skeleton className="h-10 w-32 mt-4" />
      </div>
    </div>
  </MainLayout>
);

export const GenericPageSkeleton = () => (
  <MainLayout>
    <div className="space-y-6">
      <div>
        <Skeleton className="h-8 w-48 mb-2" />
        <Skeleton className="h-4 w-72" />
      </div>
      <Skeleton className="h-64 rounded-xl" />
    </div>
  </MainLayout>
);
