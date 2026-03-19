function SkeletonCard() {
  return (
    <article className="overflow-hidden rounded-[1.35rem] border border-zinc-200/80 bg-white dark:border-white/10 dark:bg-zinc-900/70">
      <div className="aspect-[4/3] animate-pulse bg-zinc-200/70 dark:bg-zinc-800/80" />
      <div className="space-y-3 p-5">
        <div className="h-5 w-3/4 animate-pulse rounded bg-zinc-200/80 dark:bg-zinc-800/80" />
        <div className="flex flex-wrap gap-2">
          <div className="h-6 w-24 animate-pulse rounded-full bg-zinc-200/80 dark:bg-zinc-800/80" />
          <div className="h-6 w-20 animate-pulse rounded-full bg-zinc-200/80 dark:bg-zinc-800/80" />
        </div>
        <div className="pt-2">
          <div className="h-4 w-16 animate-pulse rounded bg-zinc-200/80 dark:bg-zinc-800/80" />
          <div className="mt-2 h-8 w-32 animate-pulse rounded bg-zinc-200/80 dark:bg-zinc-800/80" />
        </div>
      </div>
    </article>
  );
}

export default function LoadingPublicListingsPage() {
  return (
    <main className="mx-auto w-full max-w-[96rem] space-y-7 px-4 pb-12 pt-6 sm:px-6 lg:px-8">
      <section className="overflow-hidden rounded-[2rem] border border-zinc-200/70 bg-white px-6 py-6 shadow-sm dark:border-white/10 dark:bg-zinc-900/60 sm:px-8 sm:py-7">
        <div className="space-y-4">
          <div className="h-8 w-36 animate-pulse rounded-full bg-zinc-200/80 dark:bg-zinc-800/80" />
          <div className="h-10 w-72 animate-pulse rounded-xl bg-zinc-200/80 dark:bg-zinc-800/80" />
          <div className="h-5 w-full max-w-xl animate-pulse rounded bg-zinc-200/80 dark:bg-zinc-800/80" />
          <div className="h-9 w-64 animate-pulse rounded-full bg-zinc-200/80 dark:bg-zinc-800/80" />
        </div>
      </section>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="hidden xl:block">
          <div className="space-y-3 rounded-[1.5rem] border border-zinc-200/70 bg-white p-5 dark:border-white/10 dark:bg-zinc-900/70">
            <div className="h-5 w-32 animate-pulse rounded bg-zinc-200/80 dark:bg-zinc-800/80" />
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="h-12 w-full animate-pulse rounded-xl bg-zinc-200/80 dark:bg-zinc-800/80"
              />
            ))}
          </div>
        </aside>

        <section className="space-y-5">
          <div className="h-16 w-full animate-pulse rounded-2xl border border-zinc-200/70 bg-white dark:border-white/10 dark:bg-zinc-900/60" />

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 2xl:grid-cols-3">
            {Array.from({ length: 9 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>

          <div className="h-16 w-full animate-pulse rounded-2xl border border-zinc-200/70 bg-white dark:border-white/10 dark:bg-zinc-900/60" />
        </section>
      </div>
    </main>
  );
}
