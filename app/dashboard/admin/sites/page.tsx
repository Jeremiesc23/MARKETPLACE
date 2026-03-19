"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  Building2,
  KeyRound,
  Plus,
  RefreshCcw,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";

import {
  AdminEmptyState,
  AdminPageIntro,
  AdminSearchInput,
  AdminStat,
  AdminToolbar,
  adminSurfaceClassName,
} from "@/components/admin/admin-ui";
import { ResetOwnerPasswordDialog } from "@/components/admin/reset-owner-password-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { buildTenantUrlFromHost, splitHostPort } from "@/lib/host-routing";

type Site = {
  id: number;
  subdomain: string;
  vertical_slug: string;
  name: string | null;
  is_active: number;
  created_at: string | null;
  owner: {
    id: number;
    name: string;
    email: string;
    role: string;
    is_active: number;
    force_password_change: number;
  };
};

const compactActionClassName = "h-9 rounded-lg px-3 text-xs font-semibold";

function getTenantUrl(subdomain: string, host: string, proto: string) {
  const { hostname, port } = splitHostPort(host);
  const baseHost =
    hostname === "localhost" || hostname === "127.0.0.1"
      ? `lvh.me${port}`
      : host;

  return buildTenantUrlFromHost(baseHost, proto, subdomain, "/");
}

function SitesLoadingState() {
  return (
    <>
      <div className="grid gap-3 lg:hidden">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="overflow-hidden rounded-[1.5rem] border border-zinc-200/80 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-zinc-900/70"
          >
            <div className="animate-pulse space-y-3">
              <div className="h-4 w-32 rounded-full bg-zinc-200 dark:bg-zinc-800" />
              <div className="h-3 w-48 rounded-full bg-zinc-100 dark:bg-zinc-800/80" />
              <div className="grid grid-cols-2 gap-2 pt-2">
                <div className="h-9 rounded-xl bg-zinc-100 dark:bg-zinc-800/80" />
                <div className="h-9 rounded-xl bg-zinc-100 dark:bg-zinc-800/80" />
              </div>
            </div>
          </div>
        ))}
      </div>

      <section className={cn(adminSurfaceClassName, "hidden lg:block")}> 
        <div className="overflow-hidden">
          <div className="grid grid-cols-[2.1fr_1.4fr_1.2fr_1.8fr] border-b border-zinc-200/80 bg-zinc-50/80 px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500 dark:border-white/10 dark:bg-zinc-950/60 dark:text-zinc-400">
            <div>Sitio</div>
            <div>Owner</div>
            <div>Estado</div>
            <div className="text-right">Acciones</div>
          </div>

          {Array.from({ length: 6 }).map((_, index) => (
            <div
              key={index}
              className="grid animate-pulse grid-cols-[2.1fr_1.4fr_1.2fr_1.8fr] items-center gap-4 border-b border-zinc-200/70 px-5 py-4 last:border-b-0 dark:border-white/10"
            >
              <div className="space-y-2">
                <div className="h-4 w-40 rounded-full bg-zinc-200 dark:bg-zinc-800" />
                <div className="h-3 w-32 rounded-full bg-zinc-100 dark:bg-zinc-800/80" />
              </div>
              <div className="space-y-2">
                <div className="h-4 w-36 rounded-full bg-zinc-200 dark:bg-zinc-800" />
                <div className="h-3 w-28 rounded-full bg-zinc-100 dark:bg-zinc-800/80" />
              </div>
              <div className="flex gap-2">
                <div className="h-6 w-20 rounded-full bg-zinc-100 dark:bg-zinc-800/80" />
                <div className="h-6 w-28 rounded-full bg-zinc-100 dark:bg-zinc-800/80" />
              </div>
              <div className="flex justify-end gap-2">
                <div className="h-9 w-20 rounded-xl bg-zinc-100 dark:bg-zinc-800/80" />
                <div className="h-9 w-20 rounded-xl bg-zinc-100 dark:bg-zinc-800/80" />
                <div className="h-9 w-20 rounded-xl bg-zinc-100 dark:bg-zinc-800/80" />
              </div>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}

export default function AdminSitesPage() {
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [runtimeHost, setRuntimeHost] = useState("lvh.me:3000");
  const [runtimeProto, setRuntimeProto] = useState("http");

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/sites", { cache: "no-store" });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data?.error || "Error cargando sitios");
      }

      setSites(data.sites ?? []);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Error";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    setRuntimeHost(window.location.host || "lvh.me:3000");
    setRuntimeProto(window.location.protocol.replace(":", "") || "http");
  }, []);

  const filtered = useMemo(() => {
    const search = q.trim().toLowerCase();
    if (!search) return sites;

    return sites.filter((site) => {
      return (
        (site.name ?? "").toLowerCase().includes(search) ||
        site.subdomain.toLowerCase().includes(search) ||
        site.vertical_slug.toLowerCase().includes(search) ||
        site.owner.name.toLowerCase().includes(search) ||
        site.owner.email.toLowerCase().includes(search)
      );
    });
  }, [q, sites]);

  const totalSites = sites.length;
  const activeSites = sites.filter((site) => Number(site.is_active) === 1).length;
  const pendingPasswords = sites.filter(
    (site) => Number(site.owner.force_password_change ?? 0) === 1
  ).length;

  async function toggleActive(site: Site) {
    const next = !Boolean(site.is_active);

    try {
      const res = await fetch(`/api/admin/sites/${site.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: next }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data?.error || "No se pudo actualizar");
      }

      toast.success(next ? "Sitio activado" : "Sitio desactivado");
      await load();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Error";
      toast.error(message);
    }
  }

  return (
    <div className="space-y-5">
      <AdminPageIntro
        eyebrow="Tenant management"
        title="Sitios"
        description="Centraliza los tenants de la plataforma con una vista mas compacta, clara y operativa para owners, estados y accesos por subdominio."
        stats={
          <>
            <AdminStat label="Total" value={`${totalSites} sitios`} />
            <AdminStat label="Activos" value={`${activeSites} operativos`} />
            <AdminStat label="Password pendiente" value={`${pendingPasswords} owners`} />
          </>
        }
        actions={
          <>
            <Button
              variant="outline"
              onClick={() => void load()}
              disabled={loading}
              className="h-10 rounded-xl border-zinc-300 bg-white/90 px-4 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 dark:border-white/10 dark:bg-zinc-950/60 dark:text-zinc-100 dark:hover:bg-zinc-900"
            >
              <RefreshCcw className={cn("h-4 w-4", loading && "animate-spin")} />
              Recargar
            </Button>
            <Button
              asChild
              className="h-10 rounded-xl px-4 text-sm font-semibold"
            >
              <Link href="/admin/sites/new">
                <Plus className="h-4 w-4" />
                Nuevo sitio
              </Link>
            </Button>
          </>
        }
      />

      <AdminToolbar className="p-3.5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0 flex-1">
            <AdminSearchInput
              value={q}
              onChange={(event) => setQ(event.target.value)}
              placeholder="Buscar por nombre, subdominio, vertical u owner"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs font-medium text-zinc-600 dark:border-white/10 dark:bg-zinc-950/60 dark:text-zinc-300">
              {filtered.length === totalSites
                ? `${filtered.length} resultados`
                : `${filtered.length} de ${totalSites} resultados`}
            </div>

            <Button asChild variant="ghost" className="h-10 rounded-xl px-3 text-sm font-semibold">
              <Link href="/admin">Control panel</Link>
            </Button>
          </div>
        </div>
      </AdminToolbar>

      {loading ? (
        <SitesLoadingState />
      ) : filtered.length === 0 ? (
        <AdminEmptyState
          title={q.trim() ? "No encontramos coincidencias" : "Todavia no hay sitios"}
          description={
            q.trim()
              ? "Prueba con otro nombre, owner o subdominio. La vista mantiene todos los sitios, solo estas filtrando localmente."
              : "Crea el primer tenant para empezar a operar subdominios, owners y catalogos desde el panel admin."
          }
          action={
            q.trim() ? (
              <Button variant="outline" onClick={() => setQ("")}>Limpiar busqueda</Button>
            ) : (
              <Button asChild>
                <Link href="/admin/sites/new">Crear sitio</Link>
              </Button>
            )
          }
        />
      ) : (
        <>
          <section className="grid gap-3 lg:hidden">
            {filtered.map((site) => {
              const hasPendingPasswordChange = Number(site.owner.force_password_change ?? 0) === 1;
              const tenantUrl = getTenantUrl(site.subdomain, runtimeHost, runtimeProto);

              return (
                <article
                  key={site.id}
                  className="overflow-hidden rounded-[1.55rem] border border-zinc-200/80 bg-white p-4 shadow-[0_18px_50px_-45px_rgba(15,23,42,0.6)] dark:border-white/10 dark:bg-zinc-900/70"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-zinc-950 text-white dark:bg-zinc-100 dark:text-zinc-950">
                        <Building2 className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 space-y-2">
                        <div className="truncate text-sm font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
                          {site.name ?? site.subdomain}
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="outline" className="font-mono text-[10px] text-zinc-600 dark:text-zinc-300">
                            {site.subdomain}
                          </Badge>
                          <Badge variant="outline" className="bg-zinc-50 text-[10px] uppercase tracking-[0.12em] text-zinc-600 dark:bg-zinc-950/60 dark:text-zinc-300">
                            {site.vertical_slug}
                          </Badge>
                        </div>
                      </div>
                    </div>

                    <Badge variant={site.is_active ? "success" : "secondary"}>
                      {site.is_active ? "Activo" : "Inactivo"}
                    </Badge>
                  </div>

                  <div className="mt-4 grid gap-3 rounded-2xl border border-zinc-200/80 bg-zinc-50/85 p-3 dark:border-white/10 dark:bg-zinc-950/55">
                    <div className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-200">
                      <UserRound className="h-4 w-4 text-zinc-400" />
                      <span className="truncate">{site.owner.name || "Owner sin nombre"}</span>
                    </div>
                    <div className="truncate text-xs text-zinc-500 dark:text-zinc-400">{site.owner.email}</div>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant={hasPendingPasswordChange ? "warning" : "secondary"}>
                        {hasPendingPasswordChange ? "Password pendiente" : "Password al dia"}
                      </Badge>
                      <Badge variant={site.owner.is_active ? "outline" : "secondary"}>
                        {site.owner.is_active ? "Owner activo" : "Owner inactivo"}
                      </Badge>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <Button size="sm" variant="outline" asChild>
                      <a href={tenantUrl} target="_blank" rel="noreferrer">
                        <ArrowUpRight className="h-4 w-4" />
                        Abrir sitio
                      </a>
                    </Button>

                    <Button size="sm" variant="ghost" asChild>
                      <Link href={`/admin/sites/${site.id}/edit`}>Editar</Link>
                    </Button>

                    <ResetOwnerPasswordDialog
                      siteId={site.id}
                      ownerEmail={site.owner.email}
                      triggerLabel="Reset password"
                      triggerVariant="outline"
                      triggerClassName="h-9 rounded-lg px-3 text-xs font-semibold"
                    />

                    <Button
                      size="sm"
                      variant={site.is_active ? "secondary" : "default"}
                      onClick={() => void toggleActive(site)}
                    >
                      {site.is_active ? "Desactivar" : "Activar"}
                    </Button>
                  </div>
                </article>
              );
            })}
          </section>

          <section className={cn(adminSurfaceClassName, "hidden lg:block")}>
            <div className="flex items-center justify-between border-b border-zinc-200/80 px-5 py-4 dark:border-white/10">
              <div>
                <h2 className="text-sm font-semibold tracking-tight text-zinc-950 dark:text-zinc-100">
                  Directorio de sitios
                </h2>
                <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                  Acceso rapido a tenants, owner principal y estado operativo.
                </p>
              </div>
              <div className="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-xs font-medium text-zinc-600 dark:border-white/10 dark:bg-zinc-950/60 dark:text-zinc-300">
                {filtered.length} visibles
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full border-separate border-spacing-0">
                <thead>
                  <tr className="bg-zinc-50/80 text-left text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500 dark:bg-zinc-950/60 dark:text-zinc-400">
                    <th className="px-5 py-3">Sitio</th>
                    <th className="px-5 py-3">Owner</th>
                    <th className="px-5 py-3">Estado</th>
                    <th className="px-5 py-3 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200/80 dark:divide-white/10">
                  {filtered.map((site) => {
                    const hasPendingPasswordChange = Number(site.owner.force_password_change ?? 0) === 1;
                    const tenantUrl = getTenantUrl(site.subdomain, runtimeHost, runtimeProto);

                    return (
                      <tr
                        key={site.id}
                        className="align-top transition-colors hover:bg-zinc-50/70 dark:hover:bg-zinc-950/40"
                      >
                        <td className="px-5 py-4">
                          <div className="flex min-w-0 gap-3">
                            <div className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-zinc-950 text-white dark:bg-zinc-100 dark:text-zinc-950">
                              <Building2 className="h-5 w-5" />
                            </div>

                            <div className="min-w-0 space-y-2">
                              <div className="truncate text-sm font-semibold tracking-tight text-zinc-950 dark:text-zinc-100">
                                {site.name ?? site.subdomain}
                              </div>
                              <div className="flex flex-wrap items-center gap-2">
                                <Badge variant="outline" className="font-mono text-[10px] text-zinc-600 dark:text-zinc-300">
                                  {site.subdomain}
                                </Badge>
                                <Badge variant="outline" className="bg-zinc-50 text-[10px] uppercase tracking-[0.12em] text-zinc-600 dark:bg-zinc-950/60 dark:text-zinc-300">
                                  {site.vertical_slug}
                                </Badge>
                              </div>
                              <div className="text-xs text-zinc-500 dark:text-zinc-400">
                                Site ID #{site.id}
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="px-5 py-4">
                          <div className="space-y-2">
                            <div className="flex items-center gap-2 text-sm font-medium text-zinc-900 dark:text-zinc-100">
                              <UserRound className="h-4 w-4 text-zinc-400" />
                              <span className="truncate">{site.owner.name || "Owner sin nombre"}</span>
                            </div>
                            <div className="text-sm text-zinc-600 dark:text-zinc-300">{site.owner.email}</div>
                            <div className="flex flex-wrap gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                              <span className="rounded-full border border-zinc-200 bg-white px-2.5 py-1 dark:border-white/10 dark:bg-zinc-950/50">
                                User #{site.owner.id}
                              </span>
                              <span className="rounded-full border border-zinc-200 bg-white px-2.5 py-1 dark:border-white/10 dark:bg-zinc-950/50">
                                {site.owner.role}
                              </span>
                            </div>
                          </div>
                        </td>

                        <td className="px-5 py-4">
                          <div className="flex flex-wrap gap-2">
                            <Badge variant={site.is_active ? "success" : "secondary"}>
                              {site.is_active ? "Activo" : "Inactivo"}
                            </Badge>
                            <Badge variant={hasPendingPasswordChange ? "warning" : "secondary"}>
                              {hasPendingPasswordChange ? "Password pendiente" : "Password al dia"}
                            </Badge>
                            <Badge variant={site.owner.is_active ? "outline" : "secondary"}>
                              {site.owner.is_active ? "Owner activo" : "Owner inactivo"}
                            </Badge>
                          </div>
                        </td>

                        <td className="px-5 py-4">
                          <div className="flex flex-wrap justify-end gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className={compactActionClassName}
                              asChild
                            >
                              <a href={tenantUrl} target="_blank" rel="noreferrer">
                                <ArrowUpRight className="h-4 w-4" />
                                Abrir
                              </a>
                            </Button>

                            <Button
                              size="sm"
                              variant="ghost"
                              className={compactActionClassName}
                              asChild
                            >
                              <Link href={`/admin/sites/${site.id}/edit`}>Editar</Link>
                            </Button>

                            <ResetOwnerPasswordDialog
                              siteId={site.id}
                              ownerEmail={site.owner.email}
                              triggerLabel="Reset password"
                              triggerVariant="outline"
                              triggerClassName={compactActionClassName}
                            />

                            <Button
                              size="sm"
                              variant={site.is_active ? "secondary" : "default"}
                              className={compactActionClassName}
                              onClick={() => void toggleActive(site)}
                            >
                              {site.is_active ? "Desactivar" : "Activar"}
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}

      <div className="grid gap-3 lg:grid-cols-3">
        <div className="rounded-[1.45rem] border border-zinc-200/80 bg-white/90 p-4 shadow-sm dark:border-white/10 dark:bg-zinc-900/70">
          <div className="flex items-center gap-2 text-sm font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
            <ShieldCheck className="h-4 w-4 text-zinc-400" />
            Jerarquia mas clara
          </div>
          <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
            El nombre del sitio, subdominio, owner y estado ahora se leen en un solo barrido visual.
          </p>
        </div>

        <div className="rounded-[1.45rem] border border-zinc-200/80 bg-white/90 p-4 shadow-sm dark:border-white/10 dark:bg-zinc-900/70">
          <div className="flex items-center gap-2 text-sm font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
            <KeyRound className="h-4 w-4 text-zinc-400" />
            Acciones compactas
          </div>
          <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
            Abrir, editar, resetear password y activar ya no rompen la composicion ni desperdician altura.
          </p>
        </div>

        <div className="rounded-[1.45rem] border border-zinc-200/80 bg-white/90 p-4 shadow-sm dark:border-white/10 dark:bg-zinc-900/70">
          <div className="flex items-center gap-2 text-sm font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
            <Building2 className="h-4 w-4 text-zinc-400" />
            Mejor uso del ancho
          </div>
          <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
            La tabla en desktop y las cards densas en mobile aprovechan el panel sin sensacion de vacio.
          </p>
        </div>
      </div>
    </div>
  );
}
