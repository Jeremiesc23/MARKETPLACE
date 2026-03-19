"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

export function ListingCard(props: {
  href: string;
  title: string;
  priceLabel: string;
  metaItems?: string[];
  coverUrl?: string | null;
  badges?: string[];
}) {
  const { href, title, priceLabel, metaItems = [], coverUrl, badges = [] } = props;

  return (
    <Link
      href={href}
      className="group block h-full rounded-[1.35rem] outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
    >
      <article className="flex h-full flex-col overflow-hidden rounded-[1.35rem] border border-zinc-200/80 bg-white shadow-[0_18px_45px_-36px_rgba(15,23,42,0.55)] transition duration-300 hover:-translate-y-1 hover:border-zinc-300 hover:shadow-[0_30px_60px_-34px_rgba(15,23,42,0.45)] dark:border-white/10 dark:bg-zinc-900/70 dark:hover:border-white/20">
        <div className="relative aspect-[4/3] w-full overflow-hidden bg-zinc-100 dark:bg-zinc-800">
          {coverUrl ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={coverUrl}
                alt={title}
                loading="lazy"
                className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
              />
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-60" />
            </>
          ) : (
            <div className="flex h-full items-center justify-center bg-gradient-to-br from-zinc-100 to-zinc-200 text-sm font-medium text-zinc-500 dark:from-zinc-800 dark:to-zinc-700 dark:text-zinc-300">
              Sin imagen disponible
            </div>
          )}

          {badges.length > 0 ? (
            <div className="absolute left-3 top-3 z-10">
              <span className="inline-flex max-w-[180px] items-center truncate rounded-full bg-zinc-900/90 px-3 py-1 text-[11px] font-semibold tracking-wide text-white backdrop-blur-md dark:bg-zinc-100/90 dark:text-zinc-900">
                {badges[0]}
              </span>
            </div>
          ) : null}
        </div>

        <div className="flex flex-1 flex-col gap-4 p-5">
          <h3 className="line-clamp-2 text-[1.05rem] font-semibold leading-snug tracking-tight text-zinc-900 transition-colors group-hover:text-primary dark:text-zinc-50">
            {title}
          </h3>

          {metaItems.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {metaItems.map((item) => (
                <span
                  key={item}
                  className="inline-flex max-w-full items-center rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-[11px] font-medium text-zinc-600 dark:border-white/10 dark:bg-zinc-800/70 dark:text-zinc-300"
                >
                  <span className="truncate">{item}</span>
                </span>
              ))}
            </div>
          ) : (
            <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
              Publicación activa
            </p>
          )}

          <div className="mt-auto flex items-end justify-between border-t border-zinc-200/80 pt-4 dark:border-white/10">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-zinc-500 dark:text-zinc-400">
                Precio
              </p>
              <p className="mt-1 text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
                {priceLabel}
              </p>
            </div>

            <span className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-600 transition group-hover:border-zinc-900 group-hover:bg-zinc-900 group-hover:text-white dark:border-white/15 dark:bg-zinc-900 dark:text-zinc-300 dark:group-hover:border-zinc-100 dark:group-hover:bg-zinc-100 dark:group-hover:text-zinc-900">
              <ArrowUpRight className="h-5 w-5" />
            </span>
          </div>
        </div>
      </article>
    </Link>
  );
}
