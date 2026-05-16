export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse bg-rule rounded-[2px] ${className}`} />;
}
