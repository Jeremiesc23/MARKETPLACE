"use client";

import type { ReactNode } from "react";

export function EditorShell({
  children,
  sidebar,
}: {
  children: ReactNode;
  sidebar?: ReactNode;
}) {
  return (
    <div className="relative grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
      <div className="pointer-events-none absolute inset-0 -z-10 rounded-[2.5rem] bg-[radial-gradient(circle_at_top_left,rgba(24,24,27,0.06),transparent_32%),radial-gradient(circle_at_bottom_right,rgba(24,24,27,0.05),transparent_28%)] dark:bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.05),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(255,255,255,0.04),transparent_28%)]" />

      <div className="min-w-0 space-y-6">{children}</div>

      {sidebar ? (
        <aside className="hidden xl:block">
          <div className="sticky top-24 space-y-4">{sidebar}</div>
        </aside>
      ) : null}
    </div>
  );
}