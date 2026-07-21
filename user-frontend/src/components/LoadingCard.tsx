export function LoadingCard() {
  return (
    <div className="animate-pulse rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
      <div className="h-48 rounded-3xl bg-zinc-200" />
      <div className="mt-5 space-y-3">
        <div className="h-5 w-3/4 rounded-full bg-zinc-200" />
        <div className="h-4 w-1/2 rounded-full bg-zinc-200" />
        <div className="h-10 w-full rounded-2xl bg-zinc-200" />
      </div>
    </div>
  );
}
