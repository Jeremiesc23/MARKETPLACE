import Link from "next/link";
import { notFound } from "next/navigation";
import { headers } from "next/headers";

import PublicAttributesBlock from "../../components/PublicAttributesBlock";
import { getPublicListingByIdForSite } from "@/src/server/modules/listings/listings.service";
import { getPublicListingImages } from "@/src/server/modules/listings/listingImages.service";
import { getSiteFromHeaders } from "@/src/server/shared/tenant";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

function parseMaybeJson(v: unknown) {
  if (typeof v !== "string") return v;
  try {
    return JSON.parse(v);
  } catch {
    return v;
  }
}

export default async function PublicListingDetailPage(props: {
  params: Promise<{ vertical: string; id: string }>;
}) {
  const { vertical, id } = await props.params;
  const listingId = Number(id);
  if (!Number.isFinite(listingId)) return notFound();

  let site: any;
  try {
    const h = await headers();
    site = await getSiteFromHeaders(h);
  } catch {
    return notFound();
  }

  // 🔒 evita cruces tenant vs URL
  if (site.vertical_slug !== vertical) return notFound();

  // ✅ tenant-real: lookup por siteId (y solo published)
  const listing = await getPublicListingByIdForSite(Number(site.id), listingId);
  if (!listing) return notFound();

  const { cover, gallery } = await getPublicListingImages({
    listingId,
    siteId: Number(site.id),
  });

  const categoryId = Number((listing as any).category_id ?? 0) || null;

  const rawAttributes = parseMaybeJson((listing as any).attributes);
  const attributes =
    rawAttributes && typeof rawAttributes === "object" && !Array.isArray(rawAttributes)
      ? (rawAttributes as Record<string, unknown>)
      : {};

  const title = String((listing as any).title ?? "Listing");
  const priceLabel =
    (listing as any).price != null
      ? `${(listing as any).price} ${(listing as any).currency ?? ""}`.trim()
      : "-";

  const locationText = (listing as any).location_text ? String((listing as any).location_text) : "";
  const description = (listing as any).description ? String((listing as any).description) : "";
  const coverUrl = cover?.public_url ?? null;
  const thumbs = Array.isArray(gallery) ? gallery : [];

  return (
    <main className="mx-auto max-w-7xl p-4 md:p-6 space-y-6">
      {/* Top bar */}
      <div className="flex items-center justify-between gap-3">
        <Button asChild variant="ghost" className="rounded-xl">
         <Link href="/listings">← Volver</Link>
        </Button>

        {/* (opcional) badges rápidos */}
        <div className="hidden sm:flex items-center gap-2">
          {locationText ? (
            <Badge variant="secondary" className="rounded-full">
              📍 {locationText}
            </Badge>
          ) : null}
          <Badge variant="secondary" className="rounded-full">
            {thumbs.length} fotos
          </Badge>
        </div>
      </div>

      {/* Title */}
      <div className="space-y-1">
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">{title}</h1>
        <p className="text-sm text-muted-foreground">
          {locationText ? `📍 ${locationText} • ` : null}
          {thumbs.length} fotos
        </p>
      </div>

      {/* Main layout */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.6fr_1fr]">
        {/* Gallery */}
        <div className="space-y-3">
          <Card className="overflow-hidden rounded-2xl">
            <div className="aspect-[3/2] bg-muted">
              {coverUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={coverUrl}
                  alt={title}
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
              ) : null}
            </div>
          </Card>

          {thumbs.length ? (
            <div className="grid grid-cols-4 gap-2">
              {thumbs.slice(0, 8).map((img: any) => (
                <Card key={img.id} className="overflow-hidden rounded-2xl">
                  <div className="aspect-square bg-muted">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={img.public_url}
                      alt=""
                      loading="lazy"
                      className="h-full w-full object-cover"
                    />
                  </div>
                </Card>
              ))}
            </div>
          ) : null}
        </div>

        {/* Price panel */}
        <Card className="rounded-2xl h-fit lg:sticky lg:top-20">
          <CardContent className="p-4 md:p-5 space-y-4">
            <div className="space-y-1">
              <div className="text-xs font-medium text-muted-foreground">Precio</div>
              <div className="text-2xl font-semibold tracking-tight">{priceLabel}</div>
            </div>

            <Separator />

            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="rounded-xl border bg-background px-3 py-2">
                <div className="text-xs text-muted-foreground">Fotos</div>
                <div className="font-medium">{thumbs.length}</div>
              </div>
              <div className="rounded-xl border bg-background px-3 py-2">
                <div className="text-xs text-muted-foreground">Categoría</div>
                <div className="font-medium">{categoryId ?? "-"}</div>
              </div>
            </div>

            <div className="flex gap-2">
              <Button asChild className="flex-1 rounded-xl">
                <Link href="/login">Contactar</Link>
              </Button>
              <Button variant="secondary" className="rounded-xl">
                Guardar
              </Button>
            </div>

            <p className="text-xs text-muted-foreground">
              Consejo: inicia sesión para contactar al vendedor.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Description */}
      {description ? (
        <Card className="rounded-2xl">
          <CardContent className="p-4 md:p-6">
            <div className="text-sm font-semibold tracking-tight">Descripción</div>
            <div className="mt-2 whitespace-pre-wrap text-sm text-foreground/90">
              {description}
            </div>
          </CardContent>
        </Card>
      ) : null}

      {/* Attributes */}
      <Card className="rounded-2xl">
        <CardContent className="p-4 md:p-6">
          <div className="text-sm font-semibold tracking-tight">Detalles</div>
          <div className="mt-3">
            <PublicAttributesBlock categoryId={categoryId} attributes={attributes} />
          </div>
        </CardContent>
      </Card>
    </main>
  );
}