export default function DashboardLoading() {
  return (
    <div className="container mx-auto px-4 pt-8 pb-8 sm:pb-16 max-w-7xl animate-pulse">
      <div className="mb-4">
        <div className="flex items-start justify-between gap-4 mb-2">
          <div className="h-10 w-48 bg-white/10 rounded-lg" />
          <div className="h-12 w-40 bg-white/10 rounded-lg" />
        </div>
        <div className="h-5 w-72 bg-white/10 rounded mt-2" />
      </div>

      {/* Search/filter bar skeleton */}
      <div className="flex gap-3 mb-6">
        <div className="h-10 flex-1 bg-white/10 rounded-lg" />
        <div className="h-10 w-32 bg-white/10 rounded-lg" />
      </div>

      {/* Proof cards skeleton */}
      <div className="space-y-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="rounded-xl border border-white/10 bg-white/5 p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 space-y-3">
                <div className="h-5 w-64 bg-white/10 rounded" />
                <div className="h-4 w-96 bg-white/10 rounded" />
                <div className="flex gap-2">
                  <div className="h-6 w-20 bg-white/10 rounded-full" />
                  <div className="h-6 w-16 bg-white/10 rounded-full" />
                </div>
              </div>
              <div className="h-8 w-24 bg-white/10 rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
