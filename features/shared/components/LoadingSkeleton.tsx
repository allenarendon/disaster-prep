export function LoadingSkeleton() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="h-6 w-3/4 rounded bg-ph-blue/10" />
      <div className="h-4 w-full rounded bg-ph-blue/10" />
      <div className="h-4 w-5/6 rounded bg-ph-blue/10" />
      <div className="h-4 w-2/3 rounded bg-ph-blue/10" />
    </div>
  );
}
