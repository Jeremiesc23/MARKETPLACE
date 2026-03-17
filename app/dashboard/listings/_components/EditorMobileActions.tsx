"use client";

import type { ReactNode } from "react";

export function EditorMobileActions({ children }: { children: ReactNode }) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 p-3 md:hidden">
      <div className="mx-auto max-w-3xl rounded-[1.75rem] border border-zinc-200/80 bg-white/92 p-2 shadow-[0_-12px_40px_-28px_rgba(15,23,42,0.45)] backdrop-blur dark:border-white/10 dark:bg-zinc-950/85">
        <div className="flex items-center gap-2">{children}</div>
      </div>
    </div>
  );
}