//app/sites/[vertical]/listings/[id]/page.tsx
import Link from "next/link";
import { notFound } from "next/navigation";
import { headers } from "next/headers";

import PublicAttributesBlock from "../../components/PublicAttributesBlock";
import { ImageCarousel } from "../../components/ImageCarousel";

import { getPublicListingByIdForSite } from "@/src/server/modules/listings/listings.service";
import { getPublicListingImages } from "@/src/server/modules/listings/listingImages.service";
import { getSiteFromHeaders } from "@/src/server/shared/tenant";
import { buildInstagramUrl, buildWhatsAppUrl } from "@/lib/utils";

import { Button } from "@/components/ui/button";
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
  const { id } = await props.params;
  const listingId = Number(id);
  const listingsHref = "/listings";

  if (!Number.isFinite(listingId)) return notFound();

  let site: any;
  try {
    site = await getSiteFromHeaders(await headers());
  } catch {
    return notFound();
  }

  const listing = await getPublicListingByIdForSite(Number(site.id), listingId);
  if (!listing) return notFound();

  const { cover, gallery } = await getPublicListingImages({
    listingId,
    siteId: Number(site.id),
  });

  const categoryId = Number((listing as any).category_id ?? 0) || null;

  const categoryName =
    typeof (listing as any).category_name === "string"
      ? String((listing as any).category_name)
      : typeof (listing as any).categoryName === "string"
        ? String((listing as any).categoryName)
        : "";

  const rawAttributes = parseMaybeJson((listing as any).attributes);
  const attributes =
    rawAttributes &&
    typeof rawAttributes === "object" &&
    !Array.isArray(rawAttributes)
      ? (rawAttributes as Record<string, unknown>)
      : {};

  const title = String((listing as any).title ?? "Publicación");
  const priceLabel =
    (listing as any).price != null
      ? `${(listing as any).price} ${(listing as any).currency ?? ""}`.trim()
      : "-";

  const locationText = (listing as any).location_text
    ? String((listing as any).location_text)
    : "";

  const description = (listing as any).description
    ? String((listing as any).description)
    : "";

  const coverUrl = cover?.public_url ?? null;

  const rawGallery = Array.isArray(gallery) ? gallery : [];
  const galleryImages = rawGallery.filter((img: any) => {
    if (!img?.public_url) return false;
    if (cover?.id && img.id === cover.id) return false;
    if (coverUrl && img.public_url === coverUrl) return false;
    return true;
  });

  const allImages = [
    ...(coverUrl ? [{ url: coverUrl, alt: title }] : []),
    ...galleryImages.map((img: any) => ({
      url: String(img.public_url),
      alt: title,
    })),
  ];

  const totalPhotos = allImages.length;

  const whatsappUrl = buildWhatsAppUrl(
    site.whatsapp_phone,
    `Hola, me interesa la publicación: ${title}`
  );
  const instagramUrl = buildInstagramUrl(site.instagram_username);
  const facebookUrl = site.facebook_url ?? null;

  return (
    <main className="mx-auto max-w-[85rem] space-y-8 px-4 py-8 pb-32 md:px-6 md:pb-16 mt-4">
      <section className="relative overflow-hidden rounded-3xl border border-white/60 bg-white/40 px-6 py-5 shadow-sm ring-1 ring-zinc-200/50 backdrop-blur-xl dark:border-white/10 dark:bg-zinc-900/40 dark:ring-white/5">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-white/50 to-transparent pointer-events-none dark:from-primary/5 dark:via-zinc-900/50" />
        <nav
          aria-label="Breadcrumb"
          className="relative flex flex-wrap items-center gap-2.5 text-sm text-zinc-500 dark:text-zinc-400"
        >
          <Link
            href="/"
            className="group flex items-center gap-1.5 font-medium transition-colors hover:text-primary"
          >
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-zinc-100 transition-colors group-hover:bg-primary/10 dark:bg-zinc-800 dark:group-hover:bg-primary/20">
              <svg
                viewBox="0 0 24 24"
                className="h-3.5 w-3.5 fill-none stroke-current stroke-[2.5]"
              >
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </span>
            <span>Inicio</span>
          </Link>
          <span aria-hidden="true" className="text-zinc-300 dark:text-zinc-600">
            /
          </span>
          <Link
            href={listingsHref}
            className="font-medium transition-colors hover:text-primary"
          >
            Publicaciones
          </Link>
          <span aria-hidden="true" className="text-zinc-300 dark:text-zinc-600">
            /
          </span>
          <span className="max-w-[150px] truncate font-semibold text-zinc-900 dark:text-zinc-100 sm:max-w-xs">
            {title}
          </span>
        </nav>
      </section>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_400px]">
        <section className="space-y-8">
          <div className="rounded-[2.5rem] border border-white/60 bg-white/40 p-2.5 shadow-xl shadow-black/5 ring-1 ring-zinc-200/50 backdrop-blur-xl dark:border-white/10 dark:bg-zinc-900/40 dark:ring-white/5 dark:shadow-black/50">
            <ImageCarousel images={allImages} />
          </div>

          <div className="rounded-[2rem] border border-white/60 bg-white/40 p-8 shadow-sm ring-1 ring-zinc-200/50 backdrop-blur-xl dark:border-white/10 dark:bg-zinc-900/40 dark:ring-white/5 lg:hidden">
            <div className="mb-5 flex flex-wrap items-center gap-2">
              {categoryName ? (
                <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-primary dark:bg-primary/20">
                  {categoryName}
                </span>
              ) : null}
              {locationText ? (
                <span className="rounded-full border border-zinc-200/50 bg-zinc-50 px-3 py-1 text-xs font-medium text-zinc-600 shadow-sm dark:border-white/5 dark:bg-zinc-800/50 dark:text-zinc-400">
                  <span className="mr-1.5 opacity-60">📍</span>
                  {locationText}
                </span>
              ) : null}
            </div>

            <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-white sm:text-4xl">
              {title}
            </h1>

            <div className="mt-4 text-3xl font-extrabold tracking-tight text-primary dark:text-primary">
              {priceLabel}
            </div>

            <div className="mt-6 flex flex-col gap-3">
              {whatsappUrl ? (
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="group flex w-full items-center justify-center gap-2 rounded-2xl bg-[#25D366] px-5 py-3.5 text-base font-semibold text-white shadow-md shadow-[#25D366]/20 transition-all hover:scale-[1.02] hover:bg-[#20ba5a] hover:shadow-lg hover:shadow-[#25D366]/30"
                >
                  <svg className="h-5 w-5 transition-transform group-hover:scale-110" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/></svg>
                  Contactar por WhatsApp
                </a>
              ) : null}

              <Button asChild variant="outline" className="w-full h-12 rounded-2xl border-zinc-200 bg-white/50 text-base font-semibold transition-all hover:bg-zinc-50 dark:border-white/10 dark:bg-black/50 dark:hover:bg-zinc-900">
                <Link href={listingsHref}>Seguir explorando</Link>
              </Button>
            </div>
          </div>

          <div className="rounded-[2.5rem] border border-white/60 bg-white/40 p-8 shadow-sm ring-1 ring-zinc-200/50 backdrop-blur-xl dark:border-white/10 dark:bg-zinc-900/40 dark:ring-white/5 sm:p-12">
            {description ? (
              <div className="space-y-5">
                <h2 className="flex items-center gap-3 text-2xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-100">
                  <span className="h-8 w-1.5 rounded-full bg-primary" />
                  Descripción del vendedor
                </h2>
                <div className="prose prose-zinc max-w-none text-[15px] leading-relaxed text-zinc-600 dark:prose-invert dark:text-zinc-400">
                  {description.split('\n').map((paragraph: string, i: number) => (
                    paragraph.trim() ? <p key={i}>{paragraph}</p> : <br key={i} />
                  ))}
                </div>
              </div>
            ) : null}

            {description && Object.keys(attributes).length > 0 ? (
              <Separator className="my-10 opacity-50 dark:opacity-20" />
            ) : null}

            {Object.keys(attributes).length > 0 ? (
              <div className="space-y-6">
                <h2 className="flex items-center gap-3 text-2xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-100">
                  <span className="h-8 w-1.5 rounded-full bg-primary" />
                  Especificaciones
                </h2>
                <div className="rounded-[1.5rem] border border-white/50 bg-white/60 p-6 shadow-sm dark:border-white/5 dark:bg-black/20 md:p-8">
                  <PublicAttributesBlock
                    categoryId={categoryId}
                    attributes={attributes}
                  />
                </div>
              </div>
            ) : null}

            {!description && Object.keys(attributes).length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <div className="mb-3 rounded-full bg-zinc-100 p-3 dark:bg-zinc-800">
                  <svg className="h-6 w-6 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <p className="text-base text-zinc-500 dark:text-zinc-400">
                  El vendedor no ha añadido una descripción para esta publicación.
                </p>
              </div>
            ) : null}
          </div>
        </section>

        <aside className="hidden lg:block">
          <div className="sticky top-28 space-y-6">
            <div className="relative overflow-hidden rounded-[2.5rem] border border-white/60 bg-white/40 shadow-2xl shadow-black/[0.04] ring-1 ring-zinc-200/50 backdrop-blur-2xl dark:border-white/10 dark:bg-zinc-900/60 dark:ring-white/5 dark:shadow-black/50">
              <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-primary via-blue-400 to-indigo-500 opacity-90" />
              <div className="absolute -inset-x-20 -top-20 -z-10 h-40 rounded-full bg-primary/10 blur-[50px] pointer-events-none" />
              
              <div className="p-10">
                <div className="mb-5 flex flex-wrap items-center gap-2">
                  {categoryName ? (
                    <span className="rounded-full bg-primary/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-primary dark:bg-primary/20">
                      {categoryName}
                    </span>
                  ) : null}
                  {locationText ? (
                    <span className="rounded-full border border-zinc-200/50 bg-zinc-50 px-3 py-1 text-[11px] font-medium text-zinc-600 dark:border-white/5 dark:bg-zinc-800/50 dark:text-zinc-400">
                      <span className="mr-1 opacity-60">📍</span>
                      {locationText}
                    </span>
                  ) : null}
                </div>

                <h1 className="text-3xl font-extrabold leading-tight tracking-tight text-zinc-900 dark:text-white">
                  {title}
                </h1>

                <div className="mt-5 text-[2.75rem] font-black tracking-tighter text-zinc-900 dark:text-white">
                  {priceLabel}
                </div>

                <div className="mt-6 flex items-center gap-3 rounded-[1.25rem] border border-primary/10 bg-primary/5 px-4 py-3 dark:border-primary/20 dark:bg-primary/10">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-sm dark:bg-zinc-800">
                    <span className="text-lg">👋</span>
                  </div>
                  <div>
                    <p className="text-[13px] font-semibold text-zinc-900 dark:text-zinc-100">
                      Contacto directo
                    </p>
                    <p className="text-[12px] font-medium text-zinc-500 dark:text-zinc-400">
                      Vendedor verificado
                    </p>
                  </div>
                </div>

                <Separator className="my-8 opacity-50 dark:opacity-20" />

                <div className="flex flex-col gap-3.5">
                  {whatsappUrl ? (
                    <a
                      href={whatsappUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="group flex items-center justify-center gap-2 rounded-2xl bg-[#25D366] px-5 py-4.5 text-base font-bold text-white shadow-lg shadow-[#25D366]/20 transition-all hover:scale-[1.03] hover:bg-[#20ba5a] hover:shadow-xl hover:shadow-[#25D366]/30"
                    >
                      <svg className="h-5 w-5 transition-transform group-hover:-rotate-6 group-hover:scale-110" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/></svg>
                      Contactar por WhatsApp
                    </a>
                  ) : null}

                  <div className="mt-2 flex items-center justify-center gap-3">
                    {facebookUrl ? (
                      <a
                        href={facebookUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center justify-center gap-2 rounded-2xl border border-zinc-200/50 bg-white px-4 py-3 text-sm font-semibold text-zinc-700 shadow-sm transition-all hover:bg-zinc-50 dark:border-white/10 dark:bg-zinc-900/50 dark:text-zinc-300 dark:hover:bg-zinc-800"
                      >
                        <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M9 8h-3v4h3v12h5v-12h3.642l.358-4h-4v-1.667c0-.955.192-1.333 1.115-1.333h2.885v-5h-3.808c-3.596 0-5.192 1.583-5.192 4.615v3.385z"/></svg>
                      </a>
                    ) : null}

                    {instagramUrl ? (
                      <a
                        href={instagramUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center justify-center gap-2 rounded-2xl border border-zinc-200/50 bg-white px-4 py-3 text-sm font-semibold text-zinc-700 shadow-sm transition-all hover:bg-zinc-50 dark:border-white/10 dark:bg-zinc-900/50 dark:text-zinc-300 dark:hover:bg-zinc-800"
                      >
                        <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
                      </a>
                    ) : null}
                  </div>

                  <Button asChild variant="outline" className="mt-2 h-12 w-full rounded-2xl border-zinc-200/50 bg-transparent text-base font-semibold shadow-none dark:border-white/10 dark:text-zinc-300">
                    <Link href={listingsHref}>Seguir explorando</Link>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </aside>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-white/20 bg-white/90 p-4 shadow-[0_-8px_30px_-15px_rgba(0,0,0,0.1)] backdrop-blur-xl dark:border-white/10 dark:bg-black/80 md:hidden">
        <div className="grid grid-cols-2 gap-3 max-w-md mx-auto">
          {whatsappUrl ? (
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noreferrer"
              className="group flex items-center justify-center gap-2 rounded-2xl bg-[#25D366] px-4 py-3 text-sm font-semibold text-white shadow-md transition-all active:scale-95"
            >
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/></svg>
              WhatsApp
            </a>
          ) : (
            <div />
          )}

          <Button asChild variant="outline" className="w-full h-11.5 rounded-2xl border-white/50 bg-white/50 text-sm font-semibold shadow-sm backdrop-blur-sm transition-all active:scale-95 dark:border-white/10 dark:bg-zinc-900/50">
            <Link href={listingsHref}>Volver</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}