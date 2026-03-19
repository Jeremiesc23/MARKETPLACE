"use client";

import Link from "next/link";
import { useEffect } from "react";
import { AlertTriangle, RefreshCcw } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function PublicListingsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="mx-auto flex min-h-[70vh] w-full max-w-3xl items-center px-4 py-12 sm:px-6">
      <section className="w-full rounded-[1.75rem] border border-zinc-200/80 bg-white p-8 text-center shadow-sm dark:border-white/10 dark:bg-zinc-900/70 sm:p-10">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300">
          <AlertTriangle className="h-7 w-7" />
        </div>

        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
          No pudimos cargar el catálogo
        </h1>
        <p className="mx-auto mt-2 max-w-lg text-sm text-zinc-600 dark:text-zinc-300">
          Ocurrió un problema temporal al cargar publicaciones. Puedes reintentar ahora o volver al listado principal.
        </p>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-2.5">
          <Button
            onClick={reset}
            className="h-11 rounded-xl bg-zinc-900 px-4 text-sm font-semibold text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
          >
            <RefreshCcw className="h-4 w-4" />
            Reintentar
          </Button>

          <Button
            asChild
            variant="outline"
            className="h-11 rounded-xl border-zinc-200 bg-white px-4 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            <Link href="/listings">Volver al catálogo</Link>
          </Button>
        </div>
      </section>
    </main>
  );
}
