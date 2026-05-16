import { Skeleton } from '@/components/Skeleton';

export default function LocationLoading() {
  return (
    <div className="max-w-5xl mx-auto p-6 lg:p-12 space-y-6">
      {/* Title */}
      <Skeleton className="h-8 w-56" />
      {/* Grid of tile skeletons */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 lg:gap-6">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="aspect-square" />
        ))}
      </div>
    </div>
  );
}
