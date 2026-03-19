//app/components/dashboard-shell.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import {
  Menu,
  LayoutDashboard,
  PlusCircle,
  LogOut,
  LayoutGrid,
  Globe,
  ListTree,
  Shapes,
  ShieldCheck,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { ThemeToggle } from "@/components/theme-toggle";

type NavItem = {
  href: string;
  label: string;
  icon: ReactNode;
};

const userNavItems: NavItem[] = [
  {
    href: "/dashboard/listings",
    label: "Publicaciones",
    icon: <LayoutDashboard className="h-4 w-4" />,
  },
];

const adminNavItems: NavItem[] = [
  {
    href: "/admin",
    label: "Control Panel",
    icon: <LayoutGrid className="h-4 w-4" />,
  },
  {
    href: "/admin/sites",
    label: "Sitios",
    icon: <Globe className="h-4 w-4" />,
  },
  {
    href: "/admin/categories",
    label: "Categorías",
    icon: <ListTree className="h-4 w-4" />,
  },
  {
    href: "/admin/fields",
    label: "Fields",
    icon: <Shapes className="h-4 w-4" />,
  },
];

function NavSection({
  items,
  pathname,
  onNavigate,
  isAdmin,
}: {
  items: NavItem[];
  pathname: string;
  onNavigate?: () => void;
  isAdmin?: boolean;
}) {
  return (
    <nav className="flex flex-col gap-1">
      {items.map((item) => {
        const active =
          pathname === item.href || pathname.startsWith(`${item.href}/`);

        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "group flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium transition-colors",
              active
                ? isAdmin
                  ? "bg-white text-zinc-950 shadow-[0_12px_30px_-18px_rgba(255,255,255,0.9)]"
                  : "bg-zinc-900 text-white"
                : isAdmin
                  ? "text-zinc-300 hover:bg-white/8 hover:text-white"
                  : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-300 dark:hover:bg-white/10 dark:hover:text-white"
            )}
          >
            <span
              className={cn(
                active
                  ? isAdmin
                    ? "text-zinc-950"
                    : "text-white"
                  : isAdmin
                    ? "text-zinc-500 transition-colors group-hover:text-zinc-100"
                    : "text-zinc-400 transition-colors group-hover:text-zinc-700 dark:text-zinc-500 dark:group-hover:text-zinc-200"
              )}
            >
              {item.icon}
            </span>
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

function Nav({
  onNavigate,
  user,
}: {
  onNavigate?: () => void;
  user?: { email: string; role: string };
}) {
  const pathname = usePathname();
  const isAdmin = user?.role === "admin";

  return (
    <div className="flex flex-col gap-6">
      {!isAdmin ? (
        <div>
          <div className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-400">
            Dashboard
          </div>
          <NavSection items={userNavItems} pathname={pathname} onNavigate={onNavigate} />
        </div>
      ) : null}

      {isAdmin ? (
        <div>
          <div className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
            Admin
          </div>
          <NavSection items={adminNavItems} pathname={pathname} onNavigate={onNavigate} isAdmin />
        </div>
      ) : null}
    </div>
  );
}

function UserAvatar({ email }: { email: string }) {
  const initials = email.slice(0, 2).toUpperCase();

  return (
    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-zinc-900 text-[11px] font-semibold text-white dark:bg-white dark:text-zinc-900">
      {initials}
    </div>
  );
}

function SidebarContent({
  user,
  homeHref,
  onNavigate,
  isAdmin,
}: {
  user?: { email: string; role: string };
  homeHref: string;
  onNavigate?: () => void;
  isAdmin: boolean;
}) {
  return (
    <>
      <div className={cn("px-4 py-5", isAdmin ? "pb-4" : "")}>
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm font-semibold",
              isAdmin
                ? "bg-gradient-to-br from-amber-200 via-white to-zinc-200 text-zinc-950 shadow-[0_18px_40px_-24px_rgba(255,255,255,0.8)]"
                : "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900"
            )}
          >
            M
          </div>

          <Link href={homeHref} onClick={onNavigate} className="min-w-0">
            <div
              className={cn(
                "truncate text-sm font-semibold tracking-tight",
                isAdmin ? "text-white" : "text-zinc-900 dark:text-white"
              )}
            >
              {isAdmin ? "Escovex Platform" : "Marketplace"}
            </div>
            <div
              className={cn(
                "truncate text-[11px]",
                isAdmin ? "text-zinc-400" : "text-zinc-500 dark:text-zinc-400"
              )}
            >
              {isAdmin ? "Control Plane" : "Dashboard"}
            </div>
          </Link>
        </div>

        {isAdmin ? (
          <div className="mt-4 rounded-[1.4rem] border border-white/10 bg-white/6 p-3 text-zinc-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-amber-200/90">
              <ShieldCheck className="h-3.5 w-3.5" />
              Platform Admin
            </div>
            <p className="mt-2 text-xs leading-relaxed text-zinc-400">
              Gestiona tenants, taxonomía y fields desde un mismo panel central.
            </p>
          </div>
        ) : null}
      </div>

      <div className={cn("mx-4 h-px", isAdmin ? "bg-white/10" : "bg-zinc-200 dark:bg-white/10")} />

      <div className="flex-1 overflow-y-auto px-3 py-4">
        <Nav user={user} onNavigate={onNavigate} />
      </div>

      <div className={cn("mx-4 h-px", isAdmin ? "bg-white/10" : "bg-zinc-200 dark:bg-white/10")} />

      <div className="p-3">
        {user?.email ? (
          <div
            className={cn(
              "mb-2 flex items-center gap-3 rounded-2xl px-2 py-2",
              isAdmin ? "bg-white/5" : ""
            )}
          >
            <UserAvatar email={user.email} />
            <div className="min-w-0 flex-1">
              <div
                className={cn(
                  "truncate text-xs font-medium",
                  isAdmin ? "text-white" : "text-zinc-900 dark:text-white"
                )}
              >
                {user.email}
              </div>
              <div
                className={cn(
                  "text-[10px] uppercase tracking-[0.16em]",
                  isAdmin ? "text-zinc-500" : "text-zinc-400 dark:text-zinc-500"
                )}
              >
                {user.role}
              </div>
            </div>
          </div>
        ) : null}

        <Link href="/logout" className="block w-full" onClick={onNavigate}>
          <span
            className={cn(
              "flex w-full items-center gap-2.5 rounded-2xl px-3 py-2.5 text-sm font-medium transition-colors",
              isAdmin
                ? "text-zinc-300 hover:bg-red-500/10 hover:text-red-300"
                : "text-zinc-600 hover:bg-red-50 hover:text-red-600 dark:text-zinc-300 dark:hover:bg-red-500/10 dark:hover:text-red-400"
            )}
          >
            <LogOut className="h-4 w-4" />
            Cerrar sesión
          </span>
        </Link>
      </div>
    </>
  );
}

export function DashboardShell({
  children,
  user,
}: {
  children: ReactNode;
  user?: { email: string; role: string };
}) {
  const isAdmin = user?.role === "admin";
  const homeHref = isAdmin ? "/admin" : "/dashboard/listings";

  return (
    <div
      className={cn(
        "min-h-dvh",
        isAdmin
          ? "bg-[radial-gradient(circle_at_top_left,rgba(245,158,11,0.12),transparent_28%),linear-gradient(180deg,#f8fafc_0%,#eef2f7_48%,#f8fafc_100%)] dark:bg-[radial-gradient(circle_at_top_left,rgba(245,158,11,0.12),transparent_22%),linear-gradient(180deg,#09090b_0%,#111827_45%,#09090b_100%)]"
          : "bg-zinc-50 dark:bg-[oklch(0.16_0.008_255)]"
      )}
    >
      <aside
        className={cn(
          "hidden md:fixed md:inset-y-0 md:left-0 md:flex md:w-64 md:flex-col md:border-r",
          isAdmin
            ? "md:border-white/10 md:bg-[linear-gradient(180deg,rgba(9,9,11,0.98)_0%,rgba(24,24,27,0.98)_100%)]"
            : "md:border-zinc-200 md:bg-white dark:md:border-white/10 dark:md:bg-[oklch(0.18_0.008_255)]"
        )}
      >
        <SidebarContent user={user} homeHref={homeHref} isAdmin={isAdmin} />
      </aside>

      <div className="md:pl-64">
        <header
          className={cn(
            "sticky top-0 z-40 border-b backdrop-blur",
            isAdmin
              ? "border-zinc-200/70 bg-white/80 dark:border-white/10 dark:bg-zinc-950/70"
              : "border-zinc-200 bg-white/95 dark:border-white/10 dark:bg-[oklch(0.18_0.008_255)]/90"
          )}
        >
          <div className={cn("mx-auto flex h-14 items-center gap-2 px-4", isAdmin ? "max-w-7xl" : "max-w-6xl")}>
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>

              <SheetContent
                side="left"
                className={cn(
                  "flex h-full w-72 flex-col p-0",
                  isAdmin
                    ? "border-r border-white/10 bg-[linear-gradient(180deg,rgba(9,9,11,0.98)_0%,rgba(24,24,27,0.98)_100%)]"
                    : "border-r border-zinc-200 bg-white dark:border-white/10 dark:bg-[oklch(0.18_0.008_255)]"
                )}
              >
                <SidebarContent
                  user={user}
                  homeHref={homeHref}
                  isAdmin={isAdmin}
                  onNavigate={() => {}}
                />
              </SheetContent>
            </Sheet>

            {isAdmin ? (
              <div className="hidden min-w-0 flex-1 md:block">
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                  Escovex
                </div>
                <div className="truncate text-sm font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
                  Plataforma administrativa
                </div>
              </div>
            ) : (
              <div className="flex-1" />
            )}

            {!isAdmin ? (
              <>
                <Button asChild size="sm" className="hidden sm:inline-flex">
                  <Link href="/dashboard/listings/new">
                    <PlusCircle className="h-4 w-4" />
                    Nueva publicación
                  </Link>
                </Button>

                <Button asChild size="icon" className="sm:hidden" aria-label="Nueva publicación">
                  <Link href="/dashboard/listings/new">
                    <PlusCircle className="h-5 w-5" />
                  </Link>
                </Button>
              </>
            ) : null}

            <ThemeToggle />
          </div>
        </header>

        <main className={cn("mx-auto px-4 py-6", isAdmin ? "max-w-7xl" : "max-w-6xl")}>{children}</main>
      </div>
    </div>
  );
}
