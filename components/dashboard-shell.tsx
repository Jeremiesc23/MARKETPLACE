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
} from "lucide-react";

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
    href: "/dashboard/admin",
    label: "Control Panel",
    icon: <LayoutGrid className="h-4 w-4" />,
  },
  {
    href: "/dashboard/admin/sites",
    label: "Sitios",
    icon: <Globe className="h-4 w-4" />,
  },
  {
    href: "/dashboard/admin/categories",
    label: "Categorías",
    icon: <ListTree className="h-4 w-4" />,
  },
  {
    href: "/dashboard/admin/fields",
    label: "Fields",
    icon: <Shapes className="h-4 w-4" />,
  },
];

function NavSection({
  items,
  pathname,
  onNavigate,
}: {
  items: NavItem[];
  pathname: string;
  onNavigate?: () => void;
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
            className={[
              "group flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium transition-colors",
              active
                ? "bg-zinc-900 text-white"
                : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-300 dark:hover:bg-white/10 dark:hover:text-white",
            ].join(" ")}
          >
            <span
              className={
                active
                  ? "text-white"
                  : "text-zinc-400 transition-colors group-hover:text-zinc-700 dark:text-zinc-500 dark:group-hover:text-zinc-200"
              }
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
          <div className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-400">
            Admin
          </div>
          <NavSection items={adminNavItems} pathname={pathname} onNavigate={onNavigate} />
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
      <div className="flex items-center gap-3 px-4 py-5">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-zinc-900 text-sm font-semibold text-white dark:bg-white dark:text-zinc-900">
          M
        </div>

        <Link href={homeHref} onClick={onNavigate} className="min-w-0">
          <div className="truncate text-sm font-semibold tracking-tight text-zinc-900 dark:text-white">
            Marketplace
          </div>
          <div className="truncate text-[11px] text-zinc-500 dark:text-zinc-400">
            {isAdmin ? "Admin Panel" : "Dashboard"}
          </div>
        </Link>
      </div>

      <div className="mx-4 h-px bg-zinc-200 dark:bg-white/10" />

      <div className="flex-1 overflow-y-auto px-3 py-4">
        <Nav user={user} onNavigate={onNavigate} />
      </div>

      <div className="mx-4 h-px bg-zinc-200 dark:bg-white/10" />

      <div className="p-3">
        {user?.email ? (
          <div className="mb-2 flex items-center gap-3 rounded-2xl px-2 py-2">
            <UserAvatar email={user.email} />
            <div className="min-w-0 flex-1">
              <div className="truncate text-xs font-medium text-zinc-900 dark:text-white">
                {user.email}
              </div>
              <div className="text-[10px] uppercase tracking-[0.16em] text-zinc-400 dark:text-zinc-500">
                {user.role}
              </div>
            </div>
          </div>
        ) : null}

        <Link href="/logout" className="block w-full" onClick={onNavigate}>
          <span className="flex w-full items-center gap-2.5 rounded-2xl px-3 py-2.5 text-sm font-medium text-zinc-600 transition-colors hover:bg-red-50 hover:text-red-600 dark:text-zinc-300 dark:hover:bg-red-500/10 dark:hover:text-red-400">
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
  const homeHref = isAdmin ? "/dashboard/admin" : "/dashboard/listings";

  return (
    <div className="min-h-dvh bg-zinc-50 dark:bg-[oklch(0.16_0.008_255)]">
      <aside className="hidden md:fixed md:inset-y-0 md:left-0 md:flex md:w-64 md:flex-col md:border-r md:border-zinc-200 md:bg-white dark:md:border-white/10 dark:md:bg-[oklch(0.18_0.008_255)]">
        <SidebarContent user={user} homeHref={homeHref} isAdmin={isAdmin} />
      </aside>

      <div className="md:pl-64">
        <header className="sticky top-0 z-40 border-b border-zinc-200 bg-white/95 backdrop-blur dark:border-white/10 dark:bg-[oklch(0.18_0.008_255)]/90">
          <div className="mx-auto flex h-14 max-w-6xl items-center gap-2 px-4">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>

              <SheetContent
                side="left"
                className="flex h-full w-72 flex-col border-r border-zinc-200 bg-white p-0 dark:border-white/10 dark:bg-[oklch(0.18_0.008_255)]"
              >
                <SidebarContent
                  user={user}
                  homeHref={homeHref}
                  isAdmin={isAdmin}
                  onNavigate={() => {}}
                />
              </SheetContent>
            </Sheet>

            <div className="flex-1" />

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

        <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
      </div>
    </div>
  );
}