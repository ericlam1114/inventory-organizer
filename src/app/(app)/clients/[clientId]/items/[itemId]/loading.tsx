import { Skeleton } from '@/components/Skeleton';

export default function ItemLoading() {
  return (
    <div className="max-w-3xl mx-auto p-8 lg:p-12 space-y-8">
      {/* Cover photo placeholder */}
      <Skeleton className="w-full aspect-square max-w-sm" />
      {/* Title */}
      <Skeleton className="h-7 w-64" />
      {/* Form fields */}
      <div className="space-y-5">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    </div>
  );
}
