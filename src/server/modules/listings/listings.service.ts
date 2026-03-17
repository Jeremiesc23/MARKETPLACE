// src/server/modules/listings/listings.service.ts
import { AppError } from "@/src/server/shared/errors";
import { listFieldsByCategory } from "../categories/categoryFields.repo";
import { getCategoryByIdAndVertical, getCategoryBySlugAndVertical } from "@/src/server/modules/categories/categories.repo";
import { searchPublishedPublic } from "./listings.repo";
import { countImagesByListingAndSite } from "./listingImages.repo";

import {
  categoryExistsInVertical,
  insertDraftListing,
  updateListingByIdAndSite,
  countImagesByListingIdsAndSite,
  setListingStatus,
  listByUserAndVertical,
  getListingByIdAndVertical,
  listPublishedByVertical,
  getListingByIdAndSite,
  listPublishedBySite,
  publishListingByIdAndSite,

  // ✅ NEW
  archiveListingByIdAndSite,
  restoreListingToDraftByIdAndSite,
  softDeleteListingByIdAndSite,
} from "./listings.repo";

import { sanitizeAndValidateAttributes } from "./attributes.validator";

export async function getPublicListings(siteId: number) {
  return listPublishedBySite(siteId);
}

export async function createListingDraft(args: {
  siteId: number;
  userId: number;
  vertical: string;
  categoryId: number;
  title: string;
  description?: string;
  price?: number;
  currency: string;
  locationText?: string;
}) {
  const ok = await categoryExistsInVertical(args.categoryId, args.vertical);
  if (!ok) throw new AppError("Categoría inválida para este vertical", 400);

  return insertDraftListing({
    siteId: args.siteId,
    userId: args.userId,
    categoryId: args.categoryId,
    title: args.title,
    description: args.description,
    price: args.price,
    currency: args.currency,
    locationText: args.locationText,
  });
}

export async function getPublicListingsByVertical(vertical: string) {
  return listPublishedByVertical(vertical);
}

export async function updateListingDraft(args: {
  listingId: number;
  siteId: number;
  vertical: string;
  data: Partial<{
    categoryId: number;
    title: string;
    description: string;
    price: number | null;
    currency: string;
    locationText: string | null;

    attributes: Record<string, any>;
  }>;
}) {
  const current = await getListingByIdAndSite(args.listingId, args.siteId);
  if (!current) throw new AppError("No existe", 404);

  if (current.status === "deleted") throw new AppError("Publicación eliminada", 410);

  const nextCategoryId = args.data.categoryId ?? current.category_id;

  const ok = await categoryExistsInVertical(Number(nextCategoryId), args.vertical);
  if (!ok) throw new AppError("Categoría inválida para este vertical", 400);

  if (args.data.attributes !== undefined) {
    const allowed = await listFieldsByCategory(Number(nextCategoryId), args.vertical);

    const categoryChanged =
      args.data.categoryId !== undefined &&
      Number(args.data.categoryId) !== Number(current.category_id);

    const currentAttrs =
      !categoryChanged && current.attributes
        ? (typeof current.attributes === "string" ? JSON.parse(current.attributes) : current.attributes)
        : {};

    const incoming = sanitizeAndValidateAttributes(args.data.attributes, allowed, {
      requireAllRequired: false,
    });

    args.data.attributes = categoryChanged ? incoming : { ...currentAttrs, ...incoming };
  }

  const affected = await updateListingByIdAndSite(args.listingId, args.siteId, args.data);
  if (affected === 0) throw new AppError("No existe", 404);
}

export async function getMyListings(
  userId: number,
  vertical: string,
  siteId: number,
  opts?: { includeDeleted?: boolean }
) {
  return listByUserAndVertical(userId, vertical, siteId, { includeDeleted: opts?.includeDeleted });
}

export async function getPublicListingById(vertical: string, listingId: number) {
  const listing = await getListingByIdAndVertical(listingId, vertical);
  if (!listing) return null;
  if (listing.status !== "published") return null;
  return listing;
}

export async function getListingForSite(listingId: number, siteId: number) {
  return getListingByIdAndSite(listingId, siteId);
}

export async function publishListing(listingId: number, siteId: number, vertical: string) {
  const listing = await getListingByIdAndSite(listingId, siteId);
  if (!listing) throw new AppError("No existe", 404);

  if (listing.status === "deleted") throw new AppError("Publicación eliminada", 410);
  if (listing.status === "archived") throw new AppError("Está suspendida. Reactívala primero.", 409);

  const ok = await categoryExistsInVertical(Number(listing.category_id), vertical);
  if (!ok) throw new AppError("Categoría inválida para este vertical", 400);

  const imgCount = await countImagesByListingAndSite(listingId, siteId);
  if (imgCount === 0) {
    throw new AppError("Debes subir al menos 1 imagen antes de publicar", 400);
  }

  const allowed = await listFieldsByCategory(Number(listing.category_id), vertical);

  const attrs =
    listing.attributes
      ? (typeof listing.attributes === "string" ? JSON.parse(listing.attributes) : listing.attributes)
      : {};

  sanitizeAndValidateAttributes(attrs, allowed, { requireAllRequired: true });

  const published = await publishListingByIdAndSite(listingId, siteId);
  if (!published) throw new AppError("No se pudo publicar", 409);
}

export async function getPublicListingByIdForSite(siteId: number, listingId: number) {
  const listing = await getListingByIdAndSite(listingId, siteId);
  if (!listing) return null;
  if (listing.status !== "published") return null;
  return listing;
}

export async function getMyListingsWithImagesCount(
  userId: number,
  vertical: string,
  siteId: number,
  opts?: { includeDeleted?: boolean }
) {
  const listings: any[] = await getMyListings(userId, vertical, siteId, opts);

  const ids = listings
    .map((l) => Number(l.id))
    .filter((n) => Number.isFinite(n));

  const counts = await countImagesByListingIdsAndSite(siteId, ids);

  return listings.map((l) => {
    const id = Number(l.id);
    const images_count = Number.isFinite(id) ? (counts.get(id) ?? 0) : 0;
    return { ...l, images_count };
  });
}

function normalizeBool(v: string) {
  const s = v.trim().toLowerCase();
  if (s === "true" || s === "1") return "true";
  if (s === "false" || s === "0") return "false";
  return null;
}

export async function searchPublicListings(args: {
  siteId: number;
  vertical: string;

  q?: string;
  categoryId?: number;
  categorySlug?: string;

  minPrice?: number;
  maxPrice?: number;
  sort: "newest" | "price_asc" | "price_desc" | "relevance";
  page: number;
  pageSize: number;

  dynRaw?: Array<{ name: string; values: string[] }>;
  useFulltext?: boolean;
}) {
  const hasDyn = (args.dynRaw ?? []).length > 0;

  let categoryId: number | undefined;

  if (args.categoryId) {
    const cat = await getCategoryByIdAndVertical(args.categoryId, args.vertical);
    if (!cat) throw new AppError("Categoría no encontrada", 404);
    categoryId = Number(cat.id);
  } else if (args.categorySlug) {
    const cat = await getCategoryBySlugAndVertical(args.categorySlug, args.vertical);
    if (!cat) throw new AppError("Categoría no encontrada", 404);
    categoryId = Number(cat.id);
  } else if (hasDyn) {
    throw new AppError("categoryId (o category) es requerida para filtros dinámicos", 400);
  }

  const allowed = new Map<string, { type: string; options: any | null }>();
  if (categoryId) {
    const fields = await listFieldsByCategory(categoryId, args.vertical);
    for (const f of fields) {
      allowed.set(f.key, { type: f.type, options: f.options ?? null });
    }
  }

  const dyn: any[] = [];
  for (const raw of args.dynRaw ?? []) {
    const m = /^a_([a-zA-Z0-9_]+)(?:_(min|max))?$/.exec(raw.name);
    if (!m) continue;

    const key = m[1]!;
    const kind = m[2] ?? null;

    const def = allowed.get(key);
    if (!def) throw new AppError(`Filtro dinámico no permitido: ${key}`, 400);

    if (!kind) {
      if (def.type === "boolean") {
        const b = normalizeBool(raw.values[0] ?? "");
        if (!b) throw new AppError(`Valor boolean inválido para ${key}`, 400);
        dyn.push({ op: "bool", key, value: b });
      } else {
        const vals = raw.values.map((v) => v.trim()).filter(Boolean).slice(0, 20);
        if (!vals.length) continue;
        dyn.push({ op: "eq", key, values: vals });
      }
    } else {
      if (def.type !== "number") throw new AppError(`Rango solo aplica a number: ${key}`, 400);
      const n = Number(raw.values[0]);
      if (!Number.isFinite(n)) throw new AppError(`Valor numérico inválido para ${key}_${kind}`, 400);
      dyn.push({ op: kind === "min" ? "num_min" : "num_max", key, value: n });
    }
  }

  return searchPublishedPublic({
    siteId: args.siteId,
    vertical: args.vertical,
    categoryId,
    q: args.q,
    minPrice: args.minPrice,
    maxPrice: args.maxPrice,
    sort: args.sort,
    page: args.page,
    pageSize: args.pageSize,
    dyn,
    useFulltext: args.useFulltext,
  });
}

// ===== NEW: archive / restore / soft delete =====

export async function archiveListing(listingId: number, siteId: number) {
  const listing = await getListingByIdAndSite(listingId, siteId);
  if (!listing) throw new AppError("No existe", 404);
  if (listing.status === "deleted") throw new AppError("Publicación eliminada", 410);
  if (listing.status !== "published") throw new AppError("Solo puedes suspender una publicación publicada", 409);

  const ok = await archiveListingByIdAndSite(listingId, siteId);
  if (!ok) throw new AppError("No se pudo suspender", 409);
}

export async function restoreListingToDraft(listingId: number, siteId: number) {
  const listing = await getListingByIdAndSite(listingId, siteId);
  if (!listing) throw new AppError("No existe", 404);
  if (listing.status === "deleted") throw new AppError("Publicación eliminada", 410);
  if (listing.status !== "archived") throw new AppError("Solo puedes reactivar una publicación suspendida", 409);

  const ok = await restoreListingToDraftByIdAndSite(listingId, siteId);
  if (!ok) throw new AppError("No se pudo reactivar", 409);
}

export async function softDeleteListing(args: {
  listingId: number;
  siteId: number;
  deletedBy: number | null;
  reason?: string;
}) {
  const listing = await getListingByIdAndSite(args.listingId, args.siteId);
  if (!listing) throw new AppError("No existe", 404);
  if (listing.status === "deleted") throw new AppError("Ya está eliminada", 409);

  const ok = await softDeleteListingByIdAndSite({
    listingId: args.listingId,
    siteId: args.siteId,
    deletedBy: args.deletedBy ?? null,
    reason: args.reason ?? null,
  });

  if (!ok) throw new AppError("No se pudo eliminar", 409);
}