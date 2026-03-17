"use client";

import type { ReactNode } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function EditorSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children?: ReactNode;
}) {
  return (
    <Card className="group relative overflow-hidden rounded-[2rem] border border-zinc-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(244,244,245,0.92))] shadow-[0_28px_80px_-48px_rgba(15,23,42,0.45)] dark:border-white/10 dark:bg-[linear-gradient(180deg,rgba(39,39,42,0.95),rgba(24,24,27,0.96))]">
      <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-zinc-900/30 to-transparent dark:via-white/30" />
      <div className="pointer-events-none absolute -right-16 top-0 h-36 w-36 rounded-full bg-zinc-900/6 blur-3xl transition-transform duration-500 group-hover:scale-110 dark:bg-white/10" />
      <div className="pointer-events-none absolute -left-16 bottom-0 h-28 w-28 rounded-full bg-zinc-200/60 blur-3xl dark:bg-white/5" />

      <CardHeader className="relative gap-4 border-b border-zinc-200/70 pb-5 dark:border-white/10">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-3">
            <span className="inline-flex items-center rounded-full border border-zinc-300/80 bg-white/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-zinc-500 shadow-sm dark:border-white/10 dark:bg-white/5 dark:text-zinc-400">
              Seccion
            </span>

            <div className="space-y-2">
              <CardTitle className="text-lg font-semibold tracking-[-0.02em] text-zinc-950 dark:text-white">
                {title}
              </CardTitle>

              {description ? (
                <p className="max-w-2xl text-sm leading-6 text-zinc-600 dark:text-zinc-400">
                  {description}
                </p>
              ) : null}
            </div>
          </div>

          <div className="hidden items-center gap-2 rounded-full border border-zinc-200/80 bg-white/80 px-3 py-1.5 text-xs font-medium text-zinc-500 shadow-sm sm:inline-flex dark:border-white/10 dark:bg-white/5 dark:text-zinc-400">
            <span className="h-2 w-2 rounded-full bg-zinc-900 dark:bg-white" />
            Lista para editar
          </div>
        </div>
      </CardHeader>

      {children ? <CardContent className="relative pt-6">{children}</CardContent> : null}
    </Card>
  );
}