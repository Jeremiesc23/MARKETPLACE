"use client";

import Link from "next/link";

export function ListingCard(props: {
  href: string;
  title: string;
  priceLabel: string;
  meta?: string;
  coverUrl?: string | null;
  badges?: string[];
  whatsappUrl?: string | null;
  facebookUrl?: string | null;
  instagramUrl?: string | null;
}) {
  const {
    href,
    title,
    priceLabel,
    meta,
    coverUrl,
    badges = [],
  } = props;

  return (
    <Link href={href} className="group block h-full outline-none">
      <article className="relative flex h-full flex-col overflow-hidden rounded-[1.5rem] border border-white/60 bg-white/40 shadow-sm ring-1 ring-zinc-200/50 backdrop-blur-md transition-all duration-400 ease-out hover:-translate-y-1.5 hover:bg-white/80 hover:shadow-2xl hover:shadow-black/10 hover:ring-primary/20 dark:border-white/10 dark:bg-zinc-900/40 dark:ring-white/5 dark:hover:bg-zinc-900/80 dark:hover:shadow-black/50 dark:hover:ring-primary/20">
        <div className="relative aspect-[5/4] w-full overflow-hidden bg-zinc-100 dark:bg-zinc-800">
          {coverUrl ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={coverUrl}
                alt={title}
                loading="lazy"
                className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100 dark:from-black/60" />
            </>
          ) : (
            <div className="flex h-full items-center justify-center text-sm font-medium text-zinc-400 dark:text-zinc-500">
              <svg className="h-8 w-8 opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          )}

          {badges.length > 0 ? (
            <div className="absolute left-3 top-3 z-10 flex flex-wrap gap-1.5">
              <span className="inline-flex items-center rounded-full bg-primary/90 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-white shadow-sm backdrop-blur-md">
                {badges[0]}
              </span>
            </div>
          ) : null}
        </div>

        <div className="flex flex-1 flex-col p-6">
          <div className="mb-2 min-w-0 space-y-2">
            <h3 className="line-clamp-2 text-lg font-bold leading-snug tracking-tight text-zinc-900 transition-colors group-hover:text-primary dark:text-zinc-100">
              {title}
            </h3>
            {meta ? (
              <p className="line-clamp-1 text-sm font-medium text-zinc-500 dark:text-zinc-400">{meta}</p>
            ) : null}
          </div>

          <div className="mt-auto pt-5">
            <div className="flex items-end justify-between gap-3 border-t border-zinc-200/50 pt-4 dark:border-white/10">
              <div className="text-2xl font-extrabold tracking-tight text-primary dark:text-primary">
                {priceLabel}
              </div>
              <div className="relative inline-flex h-10 w-10 items-center justify-center rounded-full border border-primary/20 bg-primary/5 text-primary opacity-0 transition-all duration-400 group-hover:opacity-100 dark:border-primary/20 dark:bg-primary/10">
                <div className="absolute inset-0 rounded-full bg-primary/10 opacity-0 transition-opacity duration-300 group-hover:animate-ping group-hover:opacity-100" />
                <svg className="relative z-10 h-5 w-5 transition-transform duration-300 group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </article>
    </Link>
  );
}