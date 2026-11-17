export default function SiteLoading() {
  return (
    <div aria-busy="true" aria-live="polite" className="animate-pulse">
      <span className="sr-only">Loading page…</span>
      <div className="border-b border-line bg-linear-to-b from-brand-50/60 to-white">
        <div className="container-page py-12 lg:py-16">
          <div className="h-3 w-40 rounded-full bg-line" />
          <div className="mt-6 h-9 w-[min(420px,80%)] rounded-xl bg-line" />
          <div className="mt-3 h-9 w-[min(300px,60%)] rounded-xl bg-line" />
          <div className="mt-5 h-4 w-[min(520px,90%)] rounded-full bg-line/80" />
          <div className="mt-2.5 h-4 w-[min(380px,70%)] rounded-full bg-line/70" />
        </div>
      </div>
      <div className="container-page py-12 lg:py-16">
        <div className="flex items-end justify-between gap-4">
          <div>
            <div className="h-3 w-24 rounded-full bg-line" />
            <div className="mt-3 h-7 w-64 rounded-lg bg-line" />
          </div>
          <div className="hidden h-9 w-28 rounded-full bg-line sm:block" />
        </div>
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="overflow-hidden rounded-panel border border-line bg-surface">
              <div className="aspect-[4/3] bg-page" />
              <div className="space-y-3 p-4">
                <div className="h-4 w-3/4 rounded-full bg-line" />
                <div className="h-3 w-1/2 rounded-full bg-line/80" />
                <div className="h-8 w-full rounded-lg bg-page" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
