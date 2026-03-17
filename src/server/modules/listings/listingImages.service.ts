// src/server/modules/listings/listingImages.service.ts
import { randomUUID } from "node:crypto";
import { AppError } from "@/src/server/shared/errors";
import { getDb } from "@/src/server/config/db";
import { getListingByIdAndSite } from "./listings.repo";

import {
  listImagesByListingAndSite,
  countImagesByListingAndSite,
  insertListingImage,
  listPublishedImagesByListingAndSite,
  getImageByIdAndListingAndSite,
  deleteImageByIdAndListingAndSite,
  resequenceSortOrders,
  getFirstImageIdBySortOrder,
  listImageIdsByListingAndSite,
  reorderImagesByIds,
  setCoverForListingAndSite,
} from "./listingImages.repo";

import {
  buildPublicUrl,
  createV4UploadSignedUrl,
  objectExists,
  deleteObject,
} from "@/src/server/shared/gcs";

const ALLOWED_IMAGE_MIMES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_IMAGES_PER_LISTING = 12;

function extFromMime(contentType: string) {
  switch (contentType) {
    case "image/jpeg":
      return "jpg";
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    default:
      throw new AppError("Tipo de archivo no permitido", 400);
  }
}

function assertListingImageObjectKey(objectKey: string, siteId: number, listingId: number) {
  const prefix = `sites/${siteId}/listings/${listingId}/images/`;

  if (
    !objectKey ||
    !objectKey.startsWith(prefix) ||
    objectKey.startsWith("/") ||
    objectKey.includes("..") ||
    objectKey.includes("\n") ||
    objectKey.includes("\r")
  ) {
    throw new AppError("objectKey inválido", 400);
  }
}

export async function createListingImagePresign(args: {
  listingId: number;
  siteId: number;
  contentType: string;
}) {
  const listing = await getListingByIdAndSite(args.listingId, args.siteId);
  if (!listing) throw new AppError("Listing no encontrado", 404);

  // ✅ límite (defensa 1)
  const total = await countImagesByListingAndSite(args.listingId, args.siteId);
  if (total >= MAX_IMAGES_PER_LISTING) {
    throw new AppError(`Máximo ${MAX_IMAGES_PER_LISTING} imágenes por listing`, 409);
  }

  if (!ALLOWED_IMAGE_MIMES.has(args.contentType)) {
    throw new AppError("Tipo de imagen no permitido", 400);
  }

  const ext = extFromMime(args.contentType);
  const objectKey = `sites/${args.siteId}/listings/${args.listingId}/images/${randomUUID()}.${ext}`;

  const { uploadUrl } = await createV4UploadSignedUrl({
    objectKey,
    contentType: args.contentType,
  });

  // ✅ URL pública siempre derivada server-side
  const publicUrl = buildPublicUrl(objectKey);

  return {
    uploadUrl,
    objectKey,
    publicUrl, // (si tu UI lo usa, ok)
    contentType: args.contentType,
  };
}

export async function createListingImageRecord(args: {
  listingId: number;
  siteId: number;
  objectKey: string;
  contentType?: string | null;
  sizeBytes?: number | null;
}) {
  const listing = await getListingByIdAndSite(args.listingId, args.siteId);
  if (!listing) throw new AppError("Listing no encontrado", 404);

  assertListingImageObjectKey(args.objectKey, args.siteId, args.listingId);

  // ✅ Verifica que el archivo exista antes de abrir TX
  const exists = await objectExists(args.objectKey);
  if (!exists) throw new AppError("El archivo no existe en el bucket", 409);

  const conn = await getDb().getConnection();
  try {
    await conn.beginTransaction();

    // 🔒 lock de todas las imágenes del listing (evita carrera en sort_order / max)
    const existingIds = await listImageIdsByListingAndSite(args.listingId, args.siteId, conn);
    const total = existingIds.length;

    // ✅ límite (defensa 2)
    if (total >= MAX_IMAGES_PER_LISTING) {
      throw new AppError(`Máximo ${MAX_IMAGES_PER_LISTING} imágenes por listing`, 409);
    }

    const imageId = await insertListingImage(
      {
        listingId: args.listingId,
        siteId: args.siteId,
        objectKey: args.objectKey,
        publicUrl: buildPublicUrl(args.objectKey), // 🔒 siempre server-side
        contentType: args.contentType ?? null,
        sizeBytes: args.sizeBytes ?? null,
        sortOrder: total,
        isCover: total === 0, // primera imagen = cover
      },
      conn
    );

    await conn.commit();
    return { imageId };
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}

export async function getListingImagesForSite(listingId: number, siteId: number) {
  const listing = await getListingByIdAndSite(listingId, siteId);
  if (!listing) throw new AppError("Listing no encontrado", 404);

  return await listImagesByListingAndSite(listingId, siteId);
}

/** Público: solo imágenes si listing está published */
export async function getPublicListingImages(args: { listingId: number; siteId: number }) {
  const images = await listPublishedImagesByListingAndSite(args.listingId, args.siteId);
  const cover = images.find((i) => i.is_cover === 1) ?? images[0] ?? null;
  const gallery = cover ? images.filter((i) => i.id !== cover.id) : images;
  return { cover, gallery, images };
}

/** Dashboard: DELETE (DB + reorden + cover) + borrar objeto en GCS */
export async function deleteListingImage(args: {
  listingId: number;
  siteId: number;
  imageId: number;
}) {
  const listing = await getListingByIdAndSite(args.listingId, args.siteId);
  if (!listing) throw new AppError("Listing no encontrado", 404);

  const conn = await getDb().getConnection();
  let objectKeyToDelete: string | null = null;

  try {
    await conn.beginTransaction();

    // 🔒 lock imágenes del listing (serializa con reorder/setCover/confirm)
    const existingIds = await listImageIdsByListingAndSite(args.listingId, args.siteId, conn);

    // 🔒 hardening: no permitir borrar la última imagen si el listing está published
    if (String((listing as any).status) === "published" && existingIds.length <= 1) {
      throw new AppError("No puedes borrar la última imagen de un listing publicado", 409);
    }

    const img = await getImageByIdAndListingAndSite(
      args.imageId,
      args.listingId,
      args.siteId,
      conn
    );
    if (!img) throw new AppError("Imagen no existe", 404);

    objectKeyToDelete = String(img.object_key);
    const wasCover = Number(img.is_cover) === 1;

    await deleteImageByIdAndListingAndSite(args.imageId, args.listingId, args.siteId, conn);

    // ✅ re-sequence en TX
    await resequenceSortOrders(args.listingId, args.siteId, conn);

    // ✅ si borraste cover, asigna nuevo cover (atómico)
    if (wasCover) {
      const newCoverId = await getFirstImageIdBySortOrder(args.listingId, args.siteId, conn);
      if (newCoverId != null) {
        await setCoverForListingAndSite(newCoverId, args.listingId, args.siteId, conn);
      }
    }

    await conn.commit();
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }

  // ✅ Borrado en GCS DESPUÉS del commit
  if (objectKeyToDelete) {
    try {
      await deleteObject(objectKeyToDelete);
    } catch (e) {
      console.error("GCS delete failed:", e);
    }
  }

  return { ok: true };
}

/** Dashboard: set cover (transacción + 1 statement atómico) */
export async function setListingImageCover(args: {
  listingId: number;
  siteId: number;
  imageId: number;
}) {
  const listing = await getListingByIdAndSite(args.listingId, args.siteId);
  if (!listing) throw new AppError("Listing no encontrado", 404);

  const conn = await getDb().getConnection();
  try {
    await conn.beginTransaction();

    // 🔒 lock imágenes del listing
    await listImageIdsByListingAndSite(args.listingId, args.siteId, conn);

    const img = await getImageByIdAndListingAndSite(
      args.imageId,
      args.listingId,
      args.siteId,
      conn
    );
    if (!img) throw new AppError("Imagen no existe", 404);

    await setCoverForListingAndSite(args.imageId, args.listingId, args.siteId, conn);

    await conn.commit();
    return { ok: true };
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}

export async function reorderListingImages(args: {
  listingId: number;
  siteId: number;
  orderedIds: number[];
}) {
  const listing = await getListingByIdAndSite(args.listingId, args.siteId);
  if (!listing) throw new AppError("Listing no encontrado", 404);

  const ordered = (args.orderedIds ?? [])
    .map((n) => Number(n))
    .filter((n) => Number.isFinite(n));

  if (ordered.length === 0) throw new AppError("Orden inválido", 400);

  const conn = await getDb().getConnection();
  try {
    await conn.beginTransaction();

    // 🔒 lock + snapshot de IDs (en repo: FOR UPDATE cuando hay conn)
    const existingIds = await listImageIdsByListingAndSite(args.listingId, args.siteId, conn);

    // Validación fuerte: mismos IDs exactos
    const a = [...existingIds].sort((x, y) => x - y);
    const b = [...ordered].sort((x, y) => x - y);

    if (a.length !== b.length) throw new AppError("Orden inválido", 400);
    for (let i = 0; i < a.length; i++) {
      if (a[i] !== b[i]) throw new AppError("Orden inválido", 400);
    }

    await reorderImagesByIds(args.listingId, args.siteId, ordered, conn);

    await conn.commit();
    return { ok: true };
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}