export function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl p-5 border border-zinc-200 animate-pulse">
      <div className="flex justify-between mb-3">
        <div className="h-5 bg-zinc-200 rounded w-32" />
        <div className="h-5 bg-zinc-200 rounded w-20" />
      </div>
      <div className="space-y-2">
        <div className="h-4 bg-zinc-100 rounded w-full" />
        <div className="h-4 bg-zinc-100 rounded w-2/3" />
        <div className="h-4 bg-zinc-100 rounded w-3/4" />
      </div>
      <div className="flex justify-between pt-3 mt-3 border-t border-zinc-100">
        <div className="h-5 bg-zinc-200 rounded w-24" />
      </div>
    </div>
  );
}

export function SkeletonTable({ rows = 5 }: { rows?: number }) {
  return (
    <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden animate-pulse">
      <div className="h-11 bg-zinc-50 border-b border-zinc-200" />
      {[...Array(rows)].map((_, i) => (
        <div key={i} className="h-12 border-b border-zinc-100 flex items-center gap-4 px-4">
          <div className="h-4 bg-zinc-100 rounded w-32" />
          <div className="h-4 bg-zinc-100 rounded w-20" />
          <div className="h-4 bg-zinc-100 rounded w-16 ml-auto" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonGrid({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 animate-pulse">
      {[...Array(count)].map((_, i) => (
        <div key={i} className="bg-white border border-zinc-200 rounded-2xl p-5 space-y-3">
          <div className="h-5 bg-zinc-200 rounded w-20" />
          <div className="h-4 bg-zinc-100 rounded w-16" />
          <div className="h-32 bg-zinc-100 rounded-xl" />
          <div className="h-4 bg-zinc-100 rounded w-24" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonStats() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 animate-pulse">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="bg-white border border-zinc-200 rounded-2xl p-5">
          <div className="h-3 bg-zinc-100 rounded w-24 mb-2" />
          <div className="h-6 bg-zinc-200 rounded w-20" />
        </div>
      ))}
    </div>
  );
}
