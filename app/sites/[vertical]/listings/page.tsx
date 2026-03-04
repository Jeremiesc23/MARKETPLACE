// app/sites/[vertical]/listings/page.tsx
import Link from "next/link";
import { notFound } from "next/navigation";
import { headers } from "next/headers";

import { getSiteFromHeaders } from "@/src/server/shared/tenant";
import { searchPublicListings } from "@/src/server/modules/listings/listings.service";

import PublicListingsFilters from "./PublicListingsFilters";
import { ListingCard } from "../components/ListingCard";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

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
  const { vertical } = await props.params;
  const sp = await props.searchParams;

  let site: any;
  try {
    site = await getSiteFromHeaders(await headers());
  } catch {
    return notFound();
  }

  // 🔒 evita cruces tenant vs URL
  if (site.vertical_slug !== vertical) return notFound();

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
    categoryId: typeof sp.categoryId === "string" ? Number(sp.categoryId) : undefined,
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

  return (
    <main className="mx-auto max-w-7xl p-4 md:p-6 space-y-6">
      {/* Header + botón filtros en móvil */}
      <div className="flex items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Listings publicados</h2>
          <p className="text-sm text-muted-foreground">Total: {total}</p>
        </div>

        <div className="lg:hidden">
          <PublicListingsFilters variant="button" />
        </div>
      </div>

      {/* Layout: sidebar (desktop) + grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[320px_1fr]">
        <div className="hidden lg:block">
          <PublicListingsFilters variant="sidebar" />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((l: any) => {
            const cover = l.cover_url ?? l.coverUrl ?? null;
            const priceLabel =
              l.price != null ? `${l.price} ${l.currency ?? ""}`.trim() : "-";
            const meta = `${l.images_count ?? 0} fotos`;

            return (
              <ListingCard
                key={l.id}
                href={`/listings/${l.id}`}  // ✅ FIX: ruta ABSOLUTA
                title={l.title}
                coverUrl={cover}
                priceLabel={priceLabel}
                meta={meta}
              />
            );
          })}

          {items.length === 0 && (
            <Card className="rounded-2xl border bg-card p-6 sm:col-span-2 xl:col-span-3">
              <div className="text-sm font-medium">No hay resultados</div>
              <div className="mt-1 text-sm text-muted-foreground">
                Prueba quitando filtros o buscando otra palabra.
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* Paginación */}
      <div className="flex items-center justify-between gap-3">
        <Button asChild variant="secondary" className="rounded-xl" disabled={!hasPrev}>
          <Link
            aria-disabled={!hasPrev}
            tabIndex={hasPrev ? 0 : -1}
            href={hasPrev ? makeHref(sp, page - 1) : "#"}
          >
            ← Prev
          </Link>
        </Button>

        <div className="text-sm text-muted-foreground">Página {page}</div>

        <Button asChild variant="secondary" className="rounded-xl" disabled={!hasNext}>
          <Link
            aria-disabled={!hasNext}
            tabIndex={hasNext ? 0 : -1}
            href={hasNext ? makeHref(sp, page + 1) : "#"}
          >
            Next →
          </Link>
        </Button>
      </div>
    </main>
  );
}