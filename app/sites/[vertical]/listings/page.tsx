import Link from "next/link";
import { notFound } from "next/navigation";
import { headers } from "next/headers";

import { ArrowLeft, ChevronLeft, ChevronRight, MessageCircle, SearchX } from "lucide-react";

import { buildInstagramUrl, buildWhatsAppUrl } from "@/lib/utils";
import { searchPublicListings } from "@/src/server/modules/listings/listings.service";
import { getSiteFromHeaders } from "@/src/server/shared/tenant";

import { ListingCard } from "../components/ListingCard";
import PublicListingsFilters from "./PublicListingsFilters";

type SiteTenant = {
  id: number | string;
  vertical_slug: string;
  name?: string | null;
  subdomain?: string | null;
  whatsapp_phone?: string | null;
  facebook_url?: string | null;
  instagram_username?: string | null;
};

type PublicListingItem = {
  id: number | string;
  title?: string | null;
  price?: number | string | null;
  currency?: string | null;
  location_text?: string | null;
  category_name?: string | null;
  categoryName?: string | null;
  cover_url?: string | null;
  coverUrl?: string | null;
  images_count?: number | string | null;
  created_at?: string | null;
};

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

function formatPriceLabel(price: unknown, currency: unknown) {
  const amount = Number(price);
  if (!Number.isFinite(amount)) return "Precio a consultar";

  const code =
    typeof currency === "string" && currency.trim()
      ? currency.trim().toUpperCase()
      : "USD";

  try {
    return new Intl.NumberFormat("es-SV", {
      style: "currency",
      currency: code,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${amount.toLocaleString("es-SV")} ${code}`.trim();
  }
}

function formatListingDate(value: unknown) {
  if (typeof value !== "string" || !value) return null;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  return new Intl.DateTimeFormat("es-SV", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

function buildPaginationWindow(currentPage: number, totalPages: number) {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1) as Array<
      number | "ellipsis"
    >;
  }

  const pages = new Set([1, totalPages, currentPage, currentPage - 1, currentPage + 1]);

  if (currentPage <= 3) {
    pages.add(2);
    pages.add(3);
    pages.add(4);
  }

  if (currentPage >= totalPages - 2) {
    pages.add(totalPages - 1);
    pages.add(totalPages - 2);
    pages.add(totalPages - 3);
  }

  const sorted = Array.from(pages)
    .filter((p) => p >= 1 && p <= totalPages)
    .sort((a, b) => a - b);

  const output: Array<number | "ellipsis"> = [];
  let prev: number | null = null;

  for (const page of sorted) {
    if (prev != null && page - prev > 1) output.push("ellipsis");
    output.push(page);
    prev = page;
  }

  return output;
}

export default async function PublicListingsPage(props: {
  params: Promise<{ vertical: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await props.params;
  const sp = await props.searchParams;

  let site: SiteTenant;
  try {
    site = (await getSiteFromHeaders(await headers())) as SiteTenant;
  } catch {
    return notFound();
  }

  const dynRaw = Object.entries(sp)
    .filter(([k]) => k.startsWith("a_"))
    .map(([name, val]) => ({
      name,
      values: Array.isArray(val) ? val.map(String) : [String(val)],
    }));

  const page = Math.max(1, Number(sp.page ?? 1) || 1);
  const pageSize = Math.max(1, Number(sp.pageSize ?? 24) || 24);
  const rawSort = typeof sp.sort === "string" ? sp.sort : "newest";
  const sortForSearch: "newest" | "price_asc" | "price_desc" | "relevance" =
    rawSort === "price_asc" ||
    rawSort === "price_desc" ||
    rawSort === "relevance"
      ? rawSort
      : "newest";

  const { total, items } = await searchPublicListings({
    siteId: Number(site.id),
    vertical: site.vertical_slug,
    q: typeof sp.q === "string" ? sp.q : undefined,
    categoryId:
      typeof sp.categoryId === "string" ? Number(sp.categoryId) : undefined,
    categorySlug: typeof sp.category === "string" ? sp.category : undefined,
    minPrice: typeof sp.minPrice === "string" ? Number(sp.minPrice) : undefined,
    maxPrice: typeof sp.maxPrice === "string" ? Number(sp.maxPrice) : undefined,
    sort: sortForSearch,
    page,
    pageSize,
    dynRaw,
    useFulltext: process.env.USE_LISTINGS_FULLTEXT === "1",
  });

  const listingItems = (Array.isArray(items) ? items : []) as PublicListingItem[];

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const hasPrev = page > 1;
  const hasNext = page < totalPages;

  const resultFrom = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const resultTo = total === 0 ? 0 : Math.min(page * pageSize, total);

  const baseVerticalHref = "/";
  const baseListingsHref = "/listings";
  const q = typeof sp.q === "string" ? sp.q.trim() : "";

  const siteWhatsappUrl = buildWhatsAppUrl(
    site.whatsapp_phone,
    `Hola, me interesa una publicación de ${site.name ?? site.subdomain}`
  );
  const siteFacebookUrl = site.facebook_url ?? null;
  const siteInstagramUrl = buildInstagramUrl(site.instagram_username);

  const paginationWindow = buildPaginationWindow(page, totalPages);

  return (
    <main className="mx-auto w-full max-w-[96rem] space-y-7 px-4 pb-12 pt-6 sm:px-6 lg:px-8">
      <section className="relative overflow-hidden rounded-[2rem] border border-zinc-200/70 bg-white px-6 py-6 shadow-[0_25px_60px_-45px_rgba(15,23,42,0.55)] ring-1 ring-zinc-200/60 dark:border-white/10 dark:bg-zinc-900/60 dark:ring-white/10 sm:px-8 sm:py-7">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(99,102,241,0.14),transparent_58%)] dark:bg-[radial-gradient(circle_at_top_right,rgba(99,102,241,0.2),transparent_60%)]" />

        <div className="relative flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div className="space-y-4">
            <Link
              href={baseVerticalHref}
              className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-zinc-600 transition hover:border-zinc-300 hover:bg-zinc-50 hover:text-zinc-900 dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Volver al inicio
            </Link>

            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-600 dark:border-white/10 dark:bg-zinc-800/70 dark:text-zinc-300">
                {site.vertical_slug}
              </span>
              <span className="inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary dark:border-primary/25 dark:bg-primary/15">
                {site.name ?? site.subdomain}
              </span>
            </div>

            <div className="space-y-2">
              <h1 className="text-3xl font-bold tracking-tight text-zinc-950 dark:text-zinc-50 sm:text-4xl">
                Catálogo de Publicaciones
              </h1>
              <p className="max-w-2xl text-sm leading-relaxed text-zinc-600 dark:text-zinc-300 sm:text-base">
                Explora publicaciones activas con filtros rápidos, precio claro y navegación optimizada para encontrar opciones más rápido.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <span className="inline-flex items-center rounded-full border border-zinc-200 bg-white px-4 py-1.5 text-sm font-semibold text-zinc-700 shadow-sm dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-200">
                {total.toLocaleString("es-SV")} publicaciones disponibles
              </span>
              {q ? (
                <span className="inline-flex items-center rounded-full border border-zinc-200 bg-zinc-50 px-4 py-1.5 text-sm font-medium text-zinc-600 dark:border-white/10 dark:bg-zinc-800/70 dark:text-zinc-300">
                  Búsqueda actual: “{q}”
                </span>
              ) : null}
            </div>

            <div className="xl:hidden">
              <PublicListingsFilters variant="button" />
            </div>
          </div>

          <div className="w-full max-w-md space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-zinc-200/80 bg-white/90 px-4 py-3 dark:border-white/10 dark:bg-zinc-900/80">
                <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-zinc-500 dark:text-zinc-400">
                  Mostrando
                </p>
                <p className="mt-1 text-lg font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
                  {resultFrom}-{resultTo}
                </p>
              </div>
              <div className="rounded-2xl border border-zinc-200/80 bg-white/90 px-4 py-3 dark:border-white/10 dark:bg-zinc-900/80">
                <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-zinc-500 dark:text-zinc-400">
                  Página
                </p>
                <p className="mt-1 text-lg font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
                  {page} / {totalPages}
                </p>
              </div>
            </div>

            {(siteWhatsappUrl || siteFacebookUrl || siteInstagramUrl) && (
              <div className="rounded-2xl border border-zinc-200/80 bg-white/90 p-3.5 dark:border-white/10 dark:bg-zinc-900/80">
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-zinc-500 dark:text-zinc-400">
                  Canales de contacto
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  {siteWhatsappUrl ? (
                    <a
                      href={siteWhatsappUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 rounded-xl bg-[#25D366] px-3.5 py-2 text-sm font-semibold text-white transition hover:brightness-95"
                    >
                      <MessageCircle className="h-4 w-4" />
                      WhatsApp
                    </a>
                  ) : null}

                  {siteFacebookUrl ? (
                    <a
                      href={siteFacebookUrl}
                      target="_blank"
                      rel="noreferrer"
                      aria-label="Facebook"
                      className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-zinc-200 bg-white text-zinc-600 transition hover:bg-zinc-50 dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
                    >
                      <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M9 8h-3v4h3v12h5v-12h3.642l.358-4h-4v-1.667c0-.955.192-1.333 1.115-1.333h2.885v-5h-3.808c-3.596 0-5.192 1.583-5.192 4.615v3.385z" />
                      </svg>
                    </a>
                  ) : null}

                  {siteInstagramUrl ? (
                    <a
                      href={siteInstagramUrl}
                      target="_blank"
                      rel="noreferrer"
                      aria-label="Instagram"
                      className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-zinc-200 bg-white text-zinc-600 transition hover:bg-zinc-50 dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
                    >
                      <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
                      </svg>
                    </a>
                  ) : null}
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="hidden xl:block">
          <PublicListingsFilters variant="sidebar" />
        </aside>

        <section className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-zinc-200/70 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-zinc-900/60">
            <p className="text-sm font-medium text-zinc-600 dark:text-zinc-300">
              {total > 0
                ? `Mostrando ${resultFrom}-${resultTo} de ${total.toLocaleString("es-SV")} resultados`
                : "No hay resultados para los filtros actuales"}
            </p>
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-zinc-500 dark:text-zinc-400">
              Ordena y filtra para encontrar antes
            </p>
          </div>

          {listingItems.length > 0 ? (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 2xl:grid-cols-3">
              {listingItems.map((l) => {
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
                const publishedAt = formatListingDate(l.created_at);

                const metaItems = [
                  locationText || null,
                  `${imagesCount} foto${imagesCount === 1 ? "" : "s"}`,
                  publishedAt ? `Publicado ${publishedAt}` : null,
                ].filter(Boolean) as string[];

                return (
                  <ListingCard
                    key={l.id}
                    href={`/listings/${l.id}`}
                    title={String(l.title ?? "Sin título")}
                    coverUrl={coverUrl}
                    priceLabel={formatPriceLabel(l.price, l.currency)}
                    metaItems={metaItems}
                    badges={[categoryName].filter(Boolean)}
                  />
                );
              })}
            </div>
          ) : (
            <div className="flex min-h-[360px] flex-col items-center justify-center rounded-[1.75rem] border border-dashed border-zinc-300 bg-white px-6 py-10 text-center dark:border-white/15 dark:bg-zinc-900/50">
              <div className="mb-4 rounded-2xl bg-zinc-100 p-3 dark:bg-zinc-800/80">
                <SearchX className="h-7 w-7 text-zinc-500 dark:text-zinc-300" />
              </div>
              <h3 className="text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
                No encontramos publicaciones con estos filtros
              </h3>
              <p className="mt-2 max-w-md text-sm text-zinc-600 dark:text-zinc-300">
                Ajusta la búsqueda, amplía el rango de precio o limpia filtros para volver a ver todo el catálogo disponible.
              </p>

              <div className="mt-6 flex flex-wrap justify-center gap-2.5">
                <Link
                  href={baseListingsHref}
                  className="inline-flex items-center rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
                >
                  Limpiar filtros
                </Link>
                <Link
                  href={baseVerticalHref}
                  className="inline-flex items-center rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
                >
                  Volver al inicio
                </Link>
              </div>
            </div>
          )}

          {total > 0 ? (
            <div className="rounded-2xl border border-zinc-200/70 bg-white p-3.5 shadow-sm dark:border-white/10 dark:bg-zinc-900/60 sm:p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm font-medium text-zinc-600 dark:text-zinc-300">
                  Página {page} de {totalPages}
                </p>

                <nav
                  aria-label="Paginación de publicaciones"
                  className="flex items-center gap-1.5"
                >
                  {hasPrev ? (
                    <Link
                      href={makeHref(sp, page - 1)}
                      className="inline-flex h-9 items-center gap-1 rounded-xl border border-zinc-200 bg-white px-3 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
                    >
                      <ChevronLeft className="h-4 w-4" />
                      <span className="hidden sm:inline">Anterior</span>
                    </Link>
                  ) : (
                    <span className="inline-flex h-9 items-center gap-1 rounded-xl border border-zinc-200/60 bg-zinc-50 px-3 text-sm font-medium text-zinc-400 dark:border-white/10 dark:bg-zinc-900/40 dark:text-zinc-600">
                      <ChevronLeft className="h-4 w-4" />
                      <span className="hidden sm:inline">Anterior</span>
                    </span>
                  )}

                  {paginationWindow.map((entry, idx) => {
                    if (entry === "ellipsis") {
                      return (
                        <span
                          key={`ellipsis-${idx}`}
                          className="inline-flex h-9 w-9 items-center justify-center text-sm text-zinc-400"
                        >
                          ...
                        </span>
                      );
                    }

                    const isCurrent = entry === page;

                    return isCurrent ? (
                      <span
                        key={entry}
                        aria-current="page"
                        className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-zinc-900 text-sm font-semibold text-white dark:bg-zinc-100 dark:text-zinc-900"
                      >
                        {entry}
                      </span>
                    ) : (
                      <Link
                        key={entry}
                        href={makeHref(sp, entry)}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-zinc-200 bg-white text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
                      >
                        {entry}
                      </Link>
                    );
                  })}

                  {hasNext ? (
                    <Link
                      href={makeHref(sp, page + 1)}
                      className="inline-flex h-9 items-center gap-1 rounded-xl border border-zinc-200 bg-white px-3 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
                    >
                      <span className="hidden sm:inline">Siguiente</span>
                      <ChevronRight className="h-4 w-4" />
                    </Link>
                  ) : (
                    <span className="inline-flex h-9 items-center gap-1 rounded-xl border border-zinc-200/60 bg-zinc-50 px-3 text-sm font-medium text-zinc-400 dark:border-white/10 dark:bg-zinc-900/40 dark:text-zinc-600">
                      <span className="hidden sm:inline">Siguiente</span>
                      <ChevronRight className="h-4 w-4" />
                    </span>
                  )}
                </nav>
              </div>
            </div>
          ) : null}
        </section>
      </div>

    </main>
  );
}
