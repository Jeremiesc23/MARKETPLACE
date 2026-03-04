"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { Menu, LayoutDashboard, PlusCircle, LogOut } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { ThemeToggle } from "@/components/theme-toggle";

type NavItem = { href: string; label: string; icon: ReactNode };

const navItems: NavItem[] = [
  {
    href: "/dashboard/listings",
    label: "Publicaciones",
    icon: <LayoutDashboard className="h-4 w-4" />,
  },
];

function Nav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-1">
      {navItems.map((item) => {
        const active = pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={[
              "flex items-center gap-2 rounded-xl px-3 py-2 text-sm transition",
              active
                ? "bg-muted text-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            ].join(" ")}
          >
            {item.icon}
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function DashboardShell({
  children,
  user,
}: {
  children: ReactNode;
  user?: { email: string; role: string };
}) {
  return (
    <div className="min-h-dvh bg-background">
      {/* Desktop sidebar */}
      <aside className="hidden md:fixed md:inset-y-0 md:left-0 md:flex md:w-64 md:flex-col md:border-r">
        <div className="p-4">
          <Link href="/dashboard/listings" className="text-sm font-semibold">
            Marketplace
          </Link>
          {user?.email ? (
            <div className="mt-2 text-xs text-muted-foreground">
              <div className="truncate">{user.email}</div>
              <div className="uppercase tracking-wide">{user.role}</div>
            </div>
          ) : null}
        </div>

        <div className="px-3">
          <Nav />
        </div>

        <div className="mt-auto p-3">
          <Separator className="mb-3" />
          <Link href="/logout" className="w-full">
            <Button variant="ghost" className="w-full justify-start">
              <LogOut className="mr-2 h-4 w-4" />
              Cerrar sesión
            </Button>
          </Link>
        </div>
      </aside>

      {/* Main */}
      <div className="md:pl-64">
        {/* Topbar */}
        <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur">
          <div className="mx-auto flex h-14 max-w-6xl items-center gap-2 px-4">
            {/* Mobile menu */}
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="p-0">
                <div className="p-4">
                  <div className="text-sm font-semibold">Marketplace</div>
                  {user?.email ? (
                    <div className="mt-2 text-xs text-muted-foreground">
                      <div className="truncate">{user.email}</div>
                      <div className="uppercase tracking-wide">{user.role}</div>
                    </div>
                  ) : null}
                </div>

                <div className="px-3 pb-3">
                  <Nav />
                </div>

                <div className="mt-auto p-3">
                  <Separator className="mb-3" />
                  <Link href="/logout" className="w-full">
                    <Button variant="ghost" className="w-full justify-start">
                      <LogOut className="mr-2 h-4 w-4" />
                      Cerrar sesión
                    </Button>
                  </Link>
                </div>
              </SheetContent>
            </Sheet>

            <div className="flex-1" />

            <Link href="/dashboard/listings/new">
              <Button className="hidden sm:inline-flex">
                <PlusCircle className="mr-2 h-4 w-4" />
                Nueva publicación
              </Button>
              <Button className="sm:hidden" size="icon" aria-label="Nueva publicación">
                <PlusCircle className="h-5 w-5" />
              </Button>
            </Link>

            <ThemeToggle />
          </div>
        </header>

        <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
      </div>
    </div>
  );
}