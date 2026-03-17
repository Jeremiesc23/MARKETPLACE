// app/sites/[vertical]/listings/page.tsx
import Link from "next/link";
import { notFound } from "next/navigation";
import { headers } from "next/headers";

import { Card } from "@/components/ui/card";
import { buildInstagramUrl, buildWhatsAppUrl } from "@/lib/utils";
import { searchPublicListings } from "@/src/server/modules/listings/listings.service";
import { getSiteFromHeaders } from "@/src/server/shared/tenant";

import { ListingCard } from "../components/ListingCard";
import PublicListingsFilters from "./PublicListingsFilters";

function makeHref(
  sp: Record<string, string | string[] | undefined>,
  nextPage: number
) {
  const usp = new URLSearchParams();

  for (const [k, v] of Object.entries(sp)) {
    if (v == null) continue;
    if (Array.isArray(v)) v.forEach((x) => usp.append(k, String(x)));
    else usp.set(k, String(v));
  }

  usp.set("page", String(nextPage));
  return `?${usp.toString()}`;
}

export default async function PublicListingsPage(props: {
  params: Promise<{ vertical: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await props.params;
  const sp = await props.searchParams;

  let site: any;
  try {
    site = await getSiteFromHeaders(await headers());
  } catch {
    return notFound();
  }

  const dynRaw = Object.entries(sp)
    .filter(([k]) => k.startsWith("a_"))
    .map(([name, val]) => ({
      name,
      values: Array.isArray(val) ? val.map(String) : [String(val)],
    }));

  const page = Number(sp.page ?? 1) || 1;
  const pageSize = Number(sp.pageSize ?? 24) || 24;

  const { total, items } = await searchPublicListings({
    siteId: Number(site.id),
    vertical: site.vertical_slug,
    q: typeof sp.q === "string" ? sp.q : undefined,
    categoryId:
      typeof sp.categoryId === "string" ? Number(sp.categoryId) : undefined,
    categorySlug: typeof sp.category === "string" ? sp.category : undefined,
    minPrice: typeof sp.minPrice === "string" ? Number(sp.minPrice) : undefined,
    maxPrice: typeof sp.maxPrice === "string" ? Number(sp.maxPrice) : undefined,
    sort: (typeof sp.sort === "string" ? sp.sort : "newest") as any,
    page,
    pageSize,
    dynRaw,
    useFulltext: process.env.USE_LISTINGS_FULLTEXT === "1",
  });

  const hasPrev = page > 1;
  const hasNext = page * pageSize < total;

  const baseVerticalHref = "/";
  const baseListingsHref = "/listings";
  const q = typeof sp.q === "string" ? sp.q.trim() : "";

  const siteWhatsappUrl = buildWhatsAppUrl(
    site.whatsapp_phone,
    `Hola, me interesa una publicación de ${site.name ?? site.subdomain}`
  );
  const siteFacebookUrl = site.facebook_url ?? null;
  const siteInstagramUrl = buildInstagramUrl(site.instagram_username);

  return (
    <main className="mx-auto max-w-[85rem] space-y-8 px-4 py-8 md:px-6 md:py-12">
      <section className="relative overflow-hidden rounded-[2rem] border border-white/60 bg-white/40 p-6 shadow-lg shadow-black/[0.03] ring-1 ring-zinc-200/50 backdrop-blur-xl dark:border-white/10 dark:bg-zinc-900/40 dark:ring-white/5 sm:p-12">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-white/50 to-transparent pointer-events-none dark:from-primary/5 dark:via-zinc-900/50" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex flex-col items-start gap-4">
            <Link
              href={baseVerticalHref}
              className="inline-flex items-center gap-1.5 rounded-full bg-zinc-100/80 px-3 py-1 text-xs font-semibold text-zinc-600 transition-colors hover:bg-zinc-200 hover:text-zinc-900 dark:bg-zinc-800/80 dark:text-zinc-400 dark:hover:bg-zinc-700 dark:hover:text-zinc-200"
            >
              <svg
                viewBox="0 0 24 24"
                className="h-3.5 w-3.5 fill-none stroke-current stroke-2"
              >
                <polyline points="15 18 9 12 15 6" />
              </svg>
              Volver al inicio
            </Link>

            <div className="space-y-1">
              <div className="flex items-center gap-2 mb-2">
                <span className="inline-flex h-6 items-center rounded-full bg-primary/10 px-2.5 text-[10px] font-bold uppercase tracking-widest text-primary dark:bg-primary/20">
                  {site.vertical_slug}
                </span>
              </div>

              <h1 className="text-4xl font-extrabold tracking-tight text-zinc-900 dark:text-white sm:text-5xl">
                Catálogo de Publicaciones
              </h1>

              <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-white/50 bg-white/50 px-4 py-1.5 text-sm font-medium text-zinc-600 shadow-sm backdrop-blur-md dark:border-white/10 dark:bg-zinc-800/50 dark:text-zinc-300">
                <span className="flex h-2 w-2 rounded-full bg-primary" />
                <span>
                  <strong className="font-bold text-zinc-900 dark:text-zinc-100">{total}</strong> publicaciones disponibles
                  {q && (
                    <>
                      {" "}para <strong className="font-bold text-zinc-900 dark:text-zinc-100">“{q}”</strong>
                    </>
                  )}
                </span>
              </div>
            </div>
            
            <div className="lg:hidden mt-2">
              <PublicListingsFilters variant="button" />
            </div>
          </div>

          {(siteWhatsappUrl || siteFacebookUrl || siteInstagramUrl) ? (
            <div className="flex flex-wrap items-center gap-3">
              {siteWhatsappUrl ? (
                <a
                  href={siteWhatsappUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-full bg-[#25D366] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-transform hover:scale-105 hover:shadow-md"
                >
                  <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/></svg>
                  WhatsApp
                </a>
              ) : null}

              {siteFacebookUrl ? (
                <a
                  href={siteFacebookUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-zinc-200/50 bg-white text-zinc-600 shadow-sm transition-all hover:scale-105 hover:bg-zinc-50 dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800"
                  aria-label="Facebook"
                >
                  <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><path d="M9 8h-3v4h3v12h5v-12h3.642l.358-4h-4v-1.667c0-.955.192-1.333 1.115-1.333h2.885v-5h-3.808c-3.596 0-5.192 1.583-5.192 4.615v3.385z"/></svg>
                </a>
              ) : null}

              {siteInstagramUrl ? (
                <a
                  href={siteInstagramUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-zinc-200/50 bg-white text-zinc-600 shadow-sm transition-all hover:scale-105 hover:bg-zinc-50 dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800"
                  aria-label="Instagram"
                >
                  <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
                </a>
              ) : null}
            </div>
          ) : null}
        </div>
      </section>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="hidden lg:block">
          <PublicListingsFilters variant="sidebar" />
        </aside>

        <section className="space-y-6">
          {items.length > 0 ? (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {items.map((l: any) => {
                const coverUrl = l.cover_url ?? l.coverUrl ?? null;
                const locationText =
                  typeof l.location_text === "string" ? l.location_text : "";
                const categoryName =
                  typeof l.category_name === "string"
                    ? l.category_name
                    : typeof l.categoryName === "string"
                      ? l.categoryName
                      : "";
                const imagesCount = Number(l.images_count ?? 0);
                const priceLabel =
                  l.price != null
                    ? `${l.price} ${l.currency ?? ""}`.trim()
                    : "-";

                const meta = [
                  locationText || null,
                  `${imagesCount} foto${imagesCount === 1 ? "" : "s"}`,
                ]
                  .filter(Boolean)
                  .join(" • ");

                const badges = [categoryName].filter(Boolean);

                return (
                  <ListingCard
                    key={l.id}
                    href={`/listings/${l.id}`}
                    title={String(l.title ?? "Sin título")}
                    coverUrl={coverUrl}
                    priceLabel={priceLabel}
                    meta={meta}
                    badges={badges}
                    whatsappUrl={siteWhatsappUrl}
                    facebookUrl={siteFacebookUrl}
                    instagramUrl={siteInstagramUrl}
                  />
                );
              })}
            </div>
          ) : (
            <div className="flex h-full min-h-[400px] flex-col items-center justify-center rounded-[2rem] border border-white/60 bg-white/40 p-8 text-center shadow-sm ring-1 ring-zinc-200/50 backdrop-blur-md dark:border-white/10 dark:bg-zinc-900/40 dark:ring-white/5">
              <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800">
                <svg className="h-8 w-8 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
                No encontramos publicaciones
              </h3>
              <p className="mt-2 max-w-sm text-base text-zinc-500 dark:text-zinc-400">
                Prueba ajustando los filtros de búsqueda o revisando otra categoría para encontrar lo que buscas.
              </p>

              <div className="mt-8 flex flex-wrap justify-center gap-3">
                <Link
                  href={baseListingsHref}
                  className="rounded-full bg-zinc-900 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:scale-105 hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100"
                >
                  Limpiar filtros
                </Link>
                <Link
                  href={baseVerticalHref}
                  className="rounded-full border border-zinc-200 bg-white px-6 py-2.5 text-sm font-semibold text-zinc-700 shadow-sm transition-all hover:scale-105 hover:bg-zinc-50 dark:border-white/10 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
                >
                  Volver al inicio
                </Link>
              </div>
            </div>
          )}

          {total > 0 ? (
            <div className="flex items-center justify-between gap-4 rounded-3xl border border-white/60 bg-white/40 p-4 shadow-sm ring-1 ring-zinc-200/50 backdrop-blur-md dark:border-white/10 dark:bg-zinc-900/40 dark:ring-white/5">
              {hasPrev ? (
                <Link
                  href={makeHref(sp, page - 1)}
                  className="inline-flex items-center gap-1.5 rounded-2xl border border-white/50 bg-white px-5 py-2.5 text-sm font-semibold text-zinc-700 shadow-sm transition-all hover:-translate-x-1 hover:bg-zinc-50 dark:border-white/10 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                  Anterior
                </Link>
              ) : (
                <span className="inline-flex items-center gap-1.5 rounded-2xl px-5 py-2.5 text-sm font-semibold text-zinc-300 dark:text-zinc-600">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                  Anterior
                </span>
              )}

              <div className="rounded-full bg-black/5 px-4 py-1.5 text-sm font-semibold text-zinc-600 dark:bg-white/5 dark:text-zinc-400">
                Página <span className="text-zinc-900 dark:text-zinc-100">{page}</span>
              </div>

              {hasNext ? (
                <Link
                  href={makeHref(sp, page + 1)}
                  className="inline-flex items-center gap-1.5 rounded-2xl border border-white/50 bg-white px-5 py-2.5 text-sm font-semibold text-zinc-700 shadow-sm transition-all hover:translate-x-1 hover:bg-zinc-50 dark:border-white/10 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
                >
                  Siguiente
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                </Link>
              ) : (
                <span className="inline-flex items-center gap-1.5 rounded-2xl px-5 py-2.5 text-sm font-semibold text-zinc-300 dark:text-zinc-600">
                  Siguiente
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                </span>
              )}
            </div>
          ) : null}
        </section>
      </div>
    </main>
  );
}