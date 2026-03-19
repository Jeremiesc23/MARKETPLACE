import type { InputHTMLAttributes, ReactNode } from "react";
import { Search } from "lucide-react";

import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export const adminControlClassName =
  "h-10 rounded-xl border-zinc-200 bg-white text-sm text-zinc-900 shadow-none placeholder:text-zinc-400 focus-visible:border-zinc-300 focus-visible:ring-4 focus-visible:ring-zinc-200/70 dark:border-white/10 dark:bg-zinc-950/80 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus-visible:border-white/15 dark:focus-visible:ring-white/10";

export const adminSelectClassName =
  "h-10 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-900 outline-none shadow-none transition focus:border-zinc-300 focus:ring-4 focus:ring-zinc-200/70 dark:border-white/10 dark:bg-zinc-950/80 dark:text-zinc-100 dark:focus:border-white/15 dark:focus:ring-white/10";

export const adminTextareaClassName =
  "min-h-[110px] w-full rounded-2xl border border-zinc-200 bg-white px-3.5 py-3 text-sm text-zinc-900 outline-none shadow-none transition placeholder:text-zinc-400 focus:border-zinc-300 focus:ring-4 focus:ring-zinc-200/70 dark:border-white/10 dark:bg-zinc-950/80 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:border-white/15 dark:focus:ring-white/10";

export const adminSurfaceClassName =
  "overflow-hidden rounded-[1.6rem] border border-zinc-200/80 bg-white shadow-[0_22px_60px_-55px_rgba(15,23,42,0.55)] dark:border-white/10 dark:bg-zinc-900/70";

export function AdminPageIntro({
  eyebrow,
  title,
  description,
  stats,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description: string;
  stats?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <section className="relative overflow-hidden rounded-[1.75rem] border border-zinc-200/80 bg-white p-5 shadow-[0_25px_60px_-45px_rgba(15,23,42,0.45)] dark:border-white/10 dark:bg-zinc-900/70 sm:p-6">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(15,23,42,0.05),transparent_28%)] dark:bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.04),transparent_24%)]" />
      <div className="relative flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div className="space-y-3">
          {eyebrow ? (
            <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500 dark:text-zinc-400">
              {eyebrow}
            </div>
          ) : null}

          <div className="space-y-1.5">
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50 sm:text-[2rem]">
              {title}
            </h1>
            <p className="max-w-2xl text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
              {description}
            </p>
          </div>

          {stats ? <div className="flex flex-wrap gap-2">{stats}</div> : null}
        </div>

        {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
      </div>
    </section>
  );
}

export function AdminStat({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-zinc-200/80 bg-zinc-50/90 px-3.5 py-2 dark:border-white/10 dark:bg-zinc-950/60">
      <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500 dark:text-zinc-400">
        {label}
      </div>
      <div className="mt-1 text-sm font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
        {value}
      </div>
    </div>
  );
}

export function AdminToolbar({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <Card
      className={cn(
        "rounded-[1.35rem] border-zinc-200/80 bg-white/95 p-3 shadow-sm dark:border-white/10 dark:bg-zinc-900/75 lg:sticky lg:top-20 lg:z-20",
        className
      )}
    >
      {children}
    </Card>
  );
}

export function AdminToolbarLabel({ children }: { children: ReactNode }) {
  return (
    <label className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500 dark:text-zinc-400">
      {children}
    </label>
  );
}

export function AdminSearchInput({
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className={cn("relative", className)}>
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400 dark:text-zinc-500" />
      <Input {...props} className={cn(adminControlClassName, "pl-9")} />
    </div>
  );
}

export function AdminEmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-[1.5rem] border border-dashed border-zinc-300 bg-white/90 px-5 py-10 text-center dark:border-white/15 dark:bg-zinc-900/55">
      <h3 className="text-base font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
        {title}
      </h3>
      <p className="mx-auto mt-1.5 max-w-md text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
        {description}
      </p>
      {action ? <div className="mt-5 flex justify-center">{action}</div> : null}
    </div>
  );
}
