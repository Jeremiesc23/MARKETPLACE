// app/dashboard/listings/page.tsx
import Link from "next/link";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { PageHeader } from "@/components/page-header";

type ListingRow = {
  id: number;
  title: string;
  price: number | null;
  currency: string | null;
  status: string; // draft|published|archived|deleted
  categoryName?: string | null;
  updatedAt?: string | null;
  imagesCount: number;
};

type HeadersLike = { get(name: string): string | null };

type MeResponse = {
  ok: boolean;
  user?: {
    id: number;
    email: string;
    role: string;
    siteSubdomain?: string | null;
  };
};

function firstHeaderValue(value: string | null) {
  return value?.split(",")[0]?.trim() ?? "";
}

function getHost(h: HeadersLike) {
  return firstHeaderValue(h.get("x-forwarded-host") ?? h.get("host")).toLowerCase();
}

function getProto(h: HeadersLike) {
  return firstHeaderValue(h.get("x-forwarded-proto")) || "http";
}

function getBaseUrl(h: HeadersLike) {
  const host = getHost(h);
  const proto = getProto(h);
  if (!host) throw new Error("No se pudo resolver el host de la petición");
  return `${proto}://${host}`;
}

function splitHostPort(host: string) {
  const [hostname, port] = host.split(":");
  return { hostname, port: port ? `:${port}` : "" };
}

function isIpv4(hostname: string) {
  return /^\d{1,3}(\.\d{1,3}){3}$/.test(hostname);
}

const ROOT_DOMAIN = (process.env.ROOT_DOMAIN || "").toLowerCase();
const DEV_ROOT_DOMAIN = (process.env.DEV_ROOT_DOMAIN || "lvh.me").toLowerCase();

function getApexHostname(hostname: string) {
  if (ROOT_DOMAIN && (hostname === ROOT_DOMAIN || hostname.endsWith(`.${ROOT_DOMAIN}`))) {
    return ROOT_DOMAIN;
  }
  if (DEV_ROOT_DOMAIN && (hostname === DEV_ROOT_DOMAIN || hostname.endsWith(`.${DEV_ROOT_DOMAIN}`))) {
    return DEV_ROOT_DOMAIN;
  }
  return hostname;
}

function getTenantSubdomain(host: string) {
  const { hostname } = splitHostPort(host);
  if (ROOT_DOMAIN && hostname.endsWith(`.${ROOT_DOMAIN}`)) {
    return hostname.slice(0, -(`.${ROOT_DOMAIN}`.length));
  }
  if (DEV_ROOT_DOMAIN && hostname.endsWith(`.${DEV_ROOT_DOMAIN}`)) {
    return hostname.slice(0, -(`.${DEV_ROOT_DOMAIN}`.length));
  }
  return "";
}

function isTenantHost(host: string) {
  return Boolean(getTenantSubdomain(host));
}

function buildTenantUrl(h: HeadersLike, subdomain: string, pathname: string) {
  const proto = getProto(h);
  const host = getHost(h);
  const { hostname, port } = splitHostPort(host);
  const apex = getApexHostname(hostname) || hostname;
  return `${proto}://${subdomain}.${apex}${port}${pathname}`;
}

function extractArray<T = any>(payload: any): T[] {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.listings)) return payload.listings;
  return [];
}

function formatMoney(price: number | null, currency: string | null) {
  if (price === null || price === undefined) return "—";
  const code = (currency || "USD").toUpperCase();
  try {
    return new Intl.NumberFormat("es-ES", {
      style: "currency",
      currency: code,
      maximumFractionDigits: 2,
    }).format(Number(price));
  } catch {
    return `${price} ${code}`;
  }
}

function formatDate(value?: string | null) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return new Intl.DateTimeFormat("es-ES", { dateStyle: "short", timeStyle: "short" }).format(d);
}

function statusBadge(status: string) {
  if (status === "published") return { variant: "default" as const, label: "Publicado" };
  if (status === "archived") return { variant: "secondary" as const, label: "Suspendido" };
  if (status === "deleted") return { variant: "destructive" as const, label: "Eliminado" };
  return { variant: "secondary" as const, label: "Borrador" };
}

async function safeJson(res: Response) {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

async function getMe(h: HeadersLike): Promise<MeResponse | null> {
  const baseUrl = getBaseUrl(h);

  const res = await fetch(`${baseUrl}/api/auth/me`, {
    method: "GET",
    headers: { cookie: h.get("cookie") ?? "" },
    cache: "no-store",
  });

  if (!res.ok) return null;
  return (await res.json()) as MeResponse;
}

async function getDashboardListings(includeDeleted: boolean): Promise<ListingRow[]> {
  const h = await headers();
  const baseUrl = getBaseUrl(h);

  const qs = includeDeleted ? "?includeDeleted=1" : "";
  const res = await fetch(`${baseUrl}/api/dashboard/listings${qs}`, {
    headers: { cookie: h.get("cookie") ?? "" },
    cache: "no-store",
  });

  if (!res.ok) {
    let msg = `Error ${res.status}`;
    const data = await safeJson(res);
    msg = data?.error || data?.message || msg;
    throw new Error(msg);
  }

  const data = await safeJson(res);
  if (!data) return [];

  return extractArray<any>(data).map((row) => ({
    id: Number(row.id),
    title: String(row.title ?? "(sin título)"),
    price: row.price === null || row.price === undefined ? null : Number(row.price),
    currency: row.currency ? String(row.currency) : "USD",
    status: String(row.status ?? "draft"),
    categoryName: row.categoryName ?? row.category_name ?? null,
    updatedAt: row.updatedAt ?? row.updated_at ?? null,
    imagesCount: Number(row.imagesCount ?? row.images_count ?? 0),
  }));
}

type SearchParamsLike =
  | Record<string, string | string[] | undefined>
  | Promise<Record<string, string | string[] | undefined>>;

export default async function DashboardListingsPage({ searchParams }: { searchParams?: SearchParamsLike }) {
  const sp = searchParams ? await searchParams : {};

  const okMsg = typeof sp.ok === "string" ? sp.ok : null;
  const errMsg = typeof sp.err === "string" ? sp.err : null;

  const deletedParam = typeof sp.deleted === "string" ? sp.deleted : null;
  const includeDeleted = deletedParam === "1" || deletedParam === "true";

  async function publishAction(formData: FormData) {
    "use server";

    const id = String(formData.get("id") ?? "");
    if (!id) return;

    const h = await headers();
    const baseUrl = getBaseUrl(h);

    const res = await fetch(`${baseUrl}/api/listings/${id}/publish`, {
      method: "POST",
      headers: { cookie: h.get("cookie") ?? "" },
      cache: "no-store",
    });

    const data = await safeJson(res);

    revalidatePath("/dashboard/listings");
    revalidatePath(`/dashboard/listings/${id}/edit`);

    if (!res.ok) {
      const msg = data?.message || data?.error || `No se pudo publicar (HTTP ${res.status})`;
      redirect(`/dashboard/listings?err=${encodeURIComponent(msg)}${includeDeleted ? "&deleted=1" : ""}`);
    }

    redirect(`/dashboard/listings?ok=${encodeURIComponent("Publicado correctamente")}${includeDeleted ? "&deleted=1" : ""}`);
  }

  async function archiveAction(formData: FormData) {
    "use server";

    const id = String(formData.get("id") ?? "");
    if (!id) return;

    const h = await headers();
    const baseUrl = getBaseUrl(h);

    const res = await fetch(`${baseUrl}/api/listings/${id}/archive`, {
      method: "POST",
      headers: { cookie: h.get("cookie") ?? "" },
      cache: "no-store",
    });

    const data = await safeJson(res);

    revalidatePath("/dashboard/listings");
    revalidatePath(`/dashboard/listings/${id}/edit`);

    if (!res.ok) {
      const msg = data?.message || data?.error || `No se pudo suspender (HTTP ${res.status})`;
      redirect(`/dashboard/listings?err=${encodeURIComponent(msg)}${includeDeleted ? "&deleted=1" : ""}`);
    }

    redirect(`/dashboard/listings?ok=${encodeURIComponent("Suspendido correctamente")}${includeDeleted ? "&deleted=1" : ""}`);
  }

  async function restoreAction(formData: FormData) {
    "use server";

    const id = String(formData.get("id") ?? "");
    if (!id) return;

    const h = await headers();
    const baseUrl = getBaseUrl(h);

    const res = await fetch(`${baseUrl}/api/listings/${id}/restore`, {
      method: "POST",
      headers: { cookie: h.get("cookie") ?? "" },
      cache: "no-store",
    });

    const data = await safeJson(res);

    revalidatePath("/dashboard/listings");
    revalidatePath(`/dashboard/listings/${id}/edit`);

    if (!res.ok) {
      const msg = data?.message || data?.error || `No se pudo reactivar (HTTP ${res.status})`;
      redirect(`/dashboard/listings?err=${encodeURIComponent(msg)}${includeDeleted ? "&deleted=1" : ""}`);
    }

    redirect(`/dashboard/listings?ok=${encodeURIComponent("Reactivado como borrador")}${includeDeleted ? "&deleted=1" : ""}`);
  }

  let listings: ListingRow[] = [];
  let error: string | null = null;

  try {
    listings = await getDashboardListings(includeDeleted);
  } catch (e: any) {
    const message = e?.message ?? "No se pudieron cargar las publicaciones";

    if (message === "Forbidden") {
      const h = await headers();
      const me = await getMe(h);
      const host = getHost(h);

      if (me?.ok && me.user?.role !== "admin" && me.user?.siteSubdomain && !isTenantHost(host)) {
        redirect(buildTenantUrl(h, me.user.siteSubdomain, "/dashboard/listings"));
      }

      redirect("/login");
    }

    error = message;
  }

  const toggleHref = includeDeleted ? "/dashboard/listings" : "/dashboard/listings?deleted=1";
  const toggleLabel = includeDeleted ? "Ocultar eliminados" : "Mostrar eliminados";

  return (
    <div>
      <PageHeader
        title="Publicaciones"
        description="Administra tus productos y crea nuevas publicaciones."
        actions={
          <div className="flex items-center gap-2">
            <Link href={toggleHref}>
              <Button variant="outline">{toggleLabel}</Button>
            </Link>
            <Link href="/dashboard/listings/new">
              <Button>Nueva publicación</Button>
            </Link>
          </div>
        }
      />

      <div className="grid gap-3">
        {okMsg ? (
          <Card className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-3 text-sm">
            {okMsg}
          </Card>
        ) : null}

        {errMsg ? (
          <Card className="rounded-2xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            {errMsg}
          </Card>
        ) : null}

        {error ? (
          <Card className="rounded-2xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </Card>
        ) : null}
      </div>

      <Separator className="my-5" />

      {!error && listings.length === 0 ? (
        <Card className="rounded-2xl p-6">
          <div className="text-sm font-medium">Aún no tienes publicaciones{includeDeleted ? " (incluyendo eliminadas)" : ""}.</div>
          <div className="mt-1 text-sm text-muted-foreground">
            Crea tu primera publicación para empezar a vender.
          </div>
          <div className="mt-4">
            <Link href="/dashboard/listings/new">
              <Button>Crear la primera</Button>
            </Link>
          </div>
        </Card>
      ) : null}

      {!error && listings.length > 0 ? (
        <div className="grid gap-3 md:hidden">
          {listings.map((row) => {
            const badge = statusBadge(row.status);
            const hasImages = row.imagesCount > 0;

            const canPublish = row.status === "draft";
            const canArchive = row.status === "published";
            const canRestore = row.status === "archived";
            const isDeleted = row.status === "deleted";

            return (
              <Card key={row.id} className="rounded-2xl p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">
                      {row.title} <span className="text-muted-foreground">#{row.id}</span>
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {row.categoryName || "—"} • {formatMoney(row.price, row.currency)}
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <Badge variant={badge.variant}>{badge.label}</Badge>
                      <span className="text-xs text-muted-foreground">{row.imagesCount} img</span>
                      <span className="text-xs text-muted-foreground">• {formatDate(row.updatedAt)}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <Link href={`/dashboard/listings/${row.id}/edit`}>
                    <Button variant="outline" size="sm">
                      Editar
                    </Button>
                  </Link>

                  {canPublish ? (
                    <form action={publishAction} className="flex items-center gap-2">
                      <input type="hidden" name="id" value={row.id} />
                      <Button size="sm" disabled={!hasImages}>
                        Publicar
                      </Button>
                      {!hasImages ? <span className="text-xs text-destructive">Sube 1 imagen</span> : null}
                    </form>
                  ) : null}

                  {canArchive ? (
                    <form action={archiveAction}>
                      <input type="hidden" name="id" value={row.id} />
                      <Button variant="secondary" size="sm">
                        Suspender
                      </Button>
                    </form>
                  ) : null}

                  {canRestore ? (
                    <form action={restoreAction}>
                      <input type="hidden" name="id" value={row.id} />
                      <Button variant="secondary" size="sm">
                        Reactivar
                      </Button>
                    </form>
                  ) : null}

                  {isDeleted ? (
                    <span className="text-xs text-muted-foreground">Eliminado</span>
                  ) : null}
                </div>
              </Card>
            );
          })}
        </div>
      ) : null}

      {!error && listings.length > 0 ? (
        <div className="hidden md:block">
          <Card className="rounded-2xl">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[920px] text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">ID</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Título</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Categoría</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Precio</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Estado</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Actualizado</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">Acciones</th>
                  </tr>
                </thead>

                <tbody>
                  {listings.map((row) => {
                    const badge = statusBadge(row.status);
                    const hasImages = row.imagesCount > 0;

                    const canPublish = row.status === "draft";
                    const canArchive = row.status === "published";
                    const canRestore = row.status === "archived";

                    return (
                      <tr key={row.id} className="border-b last:border-b-0">
                        <td className="px-4 py-3 text-muted-foreground">#{row.id}</td>
                        <td className="px-4 py-3">
                          <div className="max-w-[340px] truncate font-medium">{row.title}</div>
                        </td>
                        <td className="px-4 py-3">{row.categoryName || "—"}</td>
                        <td className="px-4 py-3">{formatMoney(row.price, row.currency)}</td>

                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <Badge variant={badge.variant}>{badge.label}</Badge>
                            <span className="text-xs text-muted-foreground">{row.imagesCount} img</span>
                          </div>
                        </td>

                        <td className="px-4 py-3 text-muted-foreground">{formatDate(row.updatedAt)}</td>

                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-2">
                            <Link href={`/dashboard/listings/${row.id}/edit`}>
                              <Button variant="outline" size="sm">
                                Editar
                              </Button>
                            </Link>

                            {canPublish ? (
                              <form action={publishAction} className="flex items-center gap-2">
                                <input type="hidden" name="id" value={row.id} />
                                <Button size="sm" disabled={!hasImages}>
                                  Publicar
                                </Button>
                                {!hasImages ? <span className="text-xs text-destructive">Sube 1 imagen</span> : null}
                              </form>
                            ) : null}

                            {canArchive ? (
                              <form action={archiveAction}>
                                <input type="hidden" name="id" value={row.id} />
                                <Button variant="secondary" size="sm">
                                  Suspender
                                </Button>
                              </form>
                            ) : null}

                            {canRestore ? (
                              <form action={restoreAction}>
                                <input type="hidden" name="id" value={row.id} />
                                <Button variant="secondary" size="sm">
                                  Reactivar
                                </Button>
                              </form>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      ) : null}
    </div>
  );
}