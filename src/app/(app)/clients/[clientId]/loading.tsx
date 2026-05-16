import { Skeleton } from '@/components/Skeleton';

export default function ClientLoading() {
  return (
    <div className="max-w-3xl mx-auto p-8 lg:p-12 space-y-6">
      {/* Header */}
      <Skeleton className="h-8 w-48" />
      {/* Location row skeletons */}
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 py-2.5 px-3">
            <Skeleton className="w-4 h-4 shrink-0" />
            <Skeleton className="h-5 w-40" />
          </div>
        ))}
      </div>
    </div>
  );
}
