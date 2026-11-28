export default function CategoryStorefrontLoading() {
  return (
    <div className="min-h-screen w-full bg-white animate-pulse">
      {/* Sticky Header Skeleton */}
      <div className="w-full bg-zinc-900 px-3 md:px-6 pt-3 pb-3 space-y-3">
        <div className="max-w-[1440px] mx-auto flex items-center gap-2">
          <div className="h-10 w-10 rounded-xl bg-white/15 shrink-0" />
          <div className="h-10 flex-1 rounded-xl bg-white/90" />
          <div className="h-10 w-12 rounded-xl bg-white/15 shrink-0" />
        </div>
        <div className="max-w-[1440px] mx-auto flex items-center gap-4 overflow-hidden pt-1">
          {[...Array(7)].map((_, i) => (
            <div key={i} className="flex flex-col items-center gap-1.5 shrink-0">
              <div className="h-8 w-8 rounded-xl bg-white/15" />
              <div className="h-2.5 w-14 rounded bg-white/20" />
            </div>
          ))}
        </div>
      </div>

      {/* Hero + Subcategory + Product Skeleton */}
      <div className="max-w-[1440px] mx-auto px-3 md:px-6 py-4 space-y-5">
        <div className="h-[240px] md:h-[220px] w-full rounded-[22px] bg-zinc-200" />
        <div className="grid grid-cols-4 md:grid-cols-8 gap-3">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="flex flex-col items-center gap-1.5">
              <div className="w-full aspect-square rounded-2xl bg-zinc-100" />
              <div className="h-2.5 w-12 rounded bg-zinc-200" />
            </div>
          ))}
        </div>
        <div className="h-44 w-full rounded-[24px] bg-zinc-100" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="aspect-[4/5] rounded-2xl bg-zinc-100" />
          ))}
        </div>
      </div>
    </div>
  );
}
