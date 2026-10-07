export default function ProductDetailLoading() {
  return (
    <main className="min-h-screen bg-black text-white overflow-x-hidden">
      {/* Header Placeholder to prevent layout jump */}
      <div className="sticky top-0 z-40 h-[68px] w-full border-b border-zinc-800/80 bg-black/90 backdrop-blur-md px-4 md:px-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-5 w-5 rounded-full bg-zinc-800 animate-pulse" />
          <div className="h-5 w-32 rounded-lg bg-zinc-800 animate-pulse" />
        </div>
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-zinc-800 animate-pulse" />
          <div className="h-8 w-8 rounded-full bg-zinc-800 animate-pulse" />
        </div>
      </div>

      <div className="mx-auto max-w-[1440px] px-4 py-8 md:px-8 lg:py-12">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 lg:items-start">
          {/* LEFT COLUMN: Main Image & Action Buttons Skeleton */}
          <div className="lg:col-span-7 lg:sticky lg:top-24">
            <div className="flex flex-col gap-6">
              {/* Main Product Image Skeleton (matches aspect ratio and radius) */}
              <div className="relative overflow-hidden rounded-[2.5rem] sm:rounded-[3rem] bg-zinc-950 border border-zinc-800 shadow-2xl min-h-[320px] sm:min-h-[450px] md:min-h-[550px] aspect-square w-full flex items-center justify-center p-8">
                <div className="w-full h-full rounded-[2rem] bg-zinc-900 animate-pulse flex items-center justify-center">
                  <div className="h-16 w-16 rounded-2xl bg-zinc-800/60 animate-pulse" />
                </div>

                {/* Simulated Floating Badge */}
                <div className="absolute top-4 left-4 h-6 w-20 rounded-md bg-zinc-800 animate-pulse" />
              </div>

              {/* Slide Indicator Bar Skeleton */}
              <div className="flex items-center justify-center gap-2 mt-2">
                <div className="h-2 w-10 rounded-full bg-zinc-700 animate-pulse" />
                <div className="h-2 w-2 rounded-full bg-zinc-800" />
                <div className="h-2 w-2 rounded-full bg-zinc-800" />
              </div>

              {/* Action Buttons - Desktop (matches CTA positions) */}
              <div className="hidden lg:grid grid-cols-2 gap-4 mt-2">
                <div className="h-16 rounded-2xl bg-zinc-900 border border-zinc-800 animate-pulse" />
                <div className="h-16 rounded-2xl bg-zinc-800 animate-pulse" />
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: Product Info Skeleton */}
          <div className="lg:col-span-5 space-y-8">
            {/* Breadcrumb Skeleton */}
            <div className="flex items-center gap-2">
              <div className="h-3 w-12 rounded bg-zinc-900 animate-pulse" />
              <span className="text-zinc-700 text-xs">/</span>
              <div className="h-3 w-20 rounded bg-zinc-900 animate-pulse" />
              <span className="text-zinc-700 text-xs">/</span>
              <div className="h-3 w-32 rounded bg-zinc-900 animate-pulse" />
            </div>

            {/* Brand & Title Skeleton */}
            <div className="space-y-3">
              <div className="h-3 w-24 rounded bg-zinc-900 animate-pulse" />
              <div className="h-8 w-4/5 rounded-xl bg-zinc-900 animate-pulse" />
              <div className="h-8 w-3/5 rounded-xl bg-zinc-900 animate-pulse" />
            </div>

            {/* Price Block Skeleton */}
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <div className="h-10 w-28 rounded-xl bg-zinc-900 animate-pulse" />
                <div className="h-6 w-20 rounded-lg bg-zinc-900/60 animate-pulse" />
                <div className="h-6 w-16 rounded-lg bg-zinc-900/40 animate-pulse" />
              </div>
              <div className="h-3 w-40 rounded bg-zinc-900/50 animate-pulse" />
            </div>

            {/* Package / Variant Selector Skeleton */}
            <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-3">
              <div className="h-3 w-28 rounded bg-zinc-900 animate-pulse" />
              <div className="grid grid-cols-3 gap-2">
                <div className="h-12 rounded-xl bg-zinc-900 animate-pulse" />
                <div className="h-12 rounded-xl bg-zinc-900 animate-pulse" />
                <div className="h-12 rounded-xl bg-zinc-900 animate-pulse" />
              </div>
            </div>

            {/* Description & Highlights Skeleton */}
            <div className="grid gap-6 md:grid-cols-2 pt-6 border-t border-zinc-800">
              <div className="space-y-3">
                <div className="h-4 w-32 rounded bg-zinc-900 animate-pulse" />
                <div className="h-3 w-full rounded bg-zinc-900/60 animate-pulse" />
                <div className="h-3 w-5/6 rounded bg-zinc-900/60 animate-pulse" />
                <div className="h-3 w-4/6 rounded bg-zinc-900/60 animate-pulse" />
              </div>
              <div className="space-y-3">
                <div className="h-4 w-28 rounded bg-zinc-900 animate-pulse" />
                <div className="h-3 w-full rounded bg-zinc-900/60 animate-pulse" />
                <div className="h-3 w-5/6 rounded bg-zinc-900/60 animate-pulse" />
                <div className="h-3 w-4/6 rounded bg-zinc-900/60 animate-pulse" />
              </div>
            </div>

            {/* Seller Info Skeleton */}
            <div className="p-6 rounded-2xl bg-zinc-950 border border-zinc-800 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-full bg-zinc-900 animate-pulse" />
                <div className="space-y-2">
                  <div className="h-4 w-36 rounded bg-zinc-900 animate-pulse" />
                  <div className="h-3 w-28 rounded bg-zinc-900/60 animate-pulse" />
                </div>
              </div>
              <div className="h-7 w-20 rounded-full bg-zinc-900 animate-pulse" />
            </div>

            {/* Features (Bottom Icons) Skeleton */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 py-6">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex flex-col items-center p-4 bg-zinc-950 border border-zinc-800 rounded-2xl space-y-2">
                  <div className="h-8 w-8 rounded-lg bg-zinc-900 animate-pulse" />
                  <div className="h-3 w-16 rounded bg-zinc-900/60 animate-pulse" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* STICKY BOTTOM BAR FOR MOBILE SKELETON */}
      <div className="fixed bottom-0 left-0 right-0 z-[60] flex h-16 w-full items-center bg-black/95 backdrop-blur-md border-t border-zinc-800 lg:hidden shadow-2xl px-3 gap-2">
        <div className="grid grid-cols-2 h-11 flex-1 gap-2">
          <div className="h-full rounded-xl bg-zinc-900 border border-zinc-800 animate-pulse" />
          <div className="h-full rounded-xl bg-zinc-800 animate-pulse" />
        </div>
      </div>
      <div className="h-20 lg:hidden" />
    </main>
  );
}
