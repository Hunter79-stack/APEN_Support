export default function Loading() {
  return (
    <div className="page-enter max-w-7xl mx-auto px-6 py-10 space-y-8 animate-pulse">
      {/* Header skeleton */}
      <div className="space-y-3">
        <div className="h-4 w-24 rounded bg-white/5" />
        <div className="h-8 w-72 rounded bg-white/5" />
        <div className="h-4 w-96 rounded bg-white/5" />
      </div>

      {/* Card grid skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="rounded-2xl border border-white/5 bg-white/[0.02] p-6 space-y-4"
          >
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-white/5" />
              <div className="space-y-2 flex-1">
                <div className="h-4 w-3/4 rounded bg-white/5" />
                <div className="h-3 w-1/2 rounded bg-white/5" />
              </div>
            </div>
            <div className="space-y-2">
              <div className="h-3 w-full rounded bg-white/5" />
              <div className="h-3 w-5/6 rounded bg-white/5" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
