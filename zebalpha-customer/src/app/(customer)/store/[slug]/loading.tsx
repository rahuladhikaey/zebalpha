export default function StorefrontLoading() {
  return (
    <main className="min-h-screen bg-[var(--dems-bg,#FFFFFF)] text-[var(--dems-text-primary,#14120F)] pb-24">
      {/* Top Header Placeholder */}
      <div className="h-14 w-full bg-[var(--dems-primary,#F03A46)] animate-pulse" />

      {/* Storefront Hero Banner Skeleton */}
      <div className="mx-auto max-w-[1400px] px-3.5 md:px-8 pt-4 space-y-5">
        <div className="rounded-3xl border border-[var(--dems-border,#EAD296)] bg-[var(--dems-surface,#FFFDF8)] p-5 shadow-sm animate-pulse">
          <div className="h-28 sm:h-40 w-full rounded-2xl bg-black/5 mb-4" />
          <div className="flex items-center gap-3.5">
            <div className="h-14 w-14 rounded-2xl bg-black/10 shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-5 w-44 rounded-lg bg-black/10" />
              <div className="h-3 w-64 max-w-full rounded bg-black/5" />
            </div>
          </div>
        </div>

        {/* Product Grid Skeleton */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3.5">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="rounded-2xl border border-[var(--dems-border,#EAD296)] bg-[var(--dems-card-bg,#FFFFFF)] p-2.5 space-y-2.5 animate-pulse"
            >
              <div className="aspect-[3/4] w-full rounded-xl bg-black/5" />
              <div className="h-3 w-3/4 rounded bg-black/10" />
              <div className="h-4 w-1/2 rounded bg-black/10" />
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
