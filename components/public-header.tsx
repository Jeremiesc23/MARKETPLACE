//app/components/public-header.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/utils";

export function PublicHeader() {
  const pathname = usePathname();

  const listingsHref = "/listings";

  const isListings =
    pathname === listingsHref || pathname?.startsWith(`${listingsHref}/`);

  return (
    <header className="sticky top-0 z-40 border-b border-zinc-200/50 bg-white/70 backdrop-blur-2xl shadow-[0_4px_20px_-10px_rgba(0,0,0,0.05)] supports-[backdrop-filter]:bg-white/50 dark:border-white/10 dark:bg-black/50 dark:shadow-black/20">
      <div className="mx-auto flex h-16 max-w-[85rem] items-center justify-between gap-3 px-4 sm:px-6">
        <Link
          href="/"
          className="group flex min-w-0 items-center gap-3 transition-opacity hover:opacity-90"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-zinc-800 to-zinc-950 text-base font-bold text-white shadow-sm dark:from-white dark:to-zinc-200 dark:text-zinc-900">
            M
          </div>

          <div className="min-w-0">
            <div className="truncate text-base font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
              Marketplace
            </div>
            <div className="truncate text-[11px] font-medium tracking-wide uppercase text-zinc-500 dark:text-zinc-400">
              Catálogo público
            </div>
          </div>
        </Link>

        <nav className="flex items-center gap-1 sm:gap-2">
          <Link
            href={listingsHref}
            className={cn(
              "rounded-full px-4 py-2 text-sm font-medium transition-all duration-200",
              isListings
                ? "bg-zinc-100 text-zinc-900 dark:bg-zinc-800/80 dark:text-white"
                : "text-zinc-500 hover:bg-zinc-100/50 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800/50 dark:hover:text-white"
            )}
          >
            Publicaciones
          </Link>

          <div className="mx-1 h-5 w-px bg-zinc-200 dark:bg-white/10" />
          <ThemeToggle />
        </nav>
      </div>
    </header>
  );
}