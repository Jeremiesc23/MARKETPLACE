// src/server/modules/listings/listingImages.repo.ts
import { db } from "@/src/server/config/db";
import type { Pool, PoolConnection } from "mysql2/promise";

type Queryable = Pick<Pool, "query"> | Pick<PoolConnection, "query">;
const q = (conn?: Queryable) => conn ?? db;

export async function listImagesByListingAndSite(
  listingId: number,
  siteId: number,
  conn?: Queryable
) {
  const [rows] = await q(conn).query<any[]>(
    `SELECT id, listing_id, site_id, object_key, public_url, content_type, size_bytes,
            sort_order, is_cover, created_at
     FROM listing_images
     WHERE listing_id = ? AND site_id = ?
     ORDER BY is_cover DESC, sort_order ASC, id ASC`,
    [listingId, siteId]
  );

  return rows;
}

export async function countImagesByListingAndSite(
  listingId: number,
  siteId: number,
  conn?: Queryable
) {
  const [rows] = await q(conn).query<any[]>(
    `SELECT COUNT(*) AS total
     FROM listing_images
     WHERE listing_id = ? AND site_id = ?`,
    [listingId, siteId]
  );

  return Number(rows[0]?.total ?? 0);
}

export async function insertListingImage(
  input: {
    listingId: number;
    siteId: number;
    objectKey: string;
    publicUrl: string;
    contentType?: string | null;
    sizeBytes?: number | null;
    sortOrder: number;
    isCover: boolean;
  },
  conn?: Queryable
) {
  const [res]: any = await q(conn).query(
    `INSERT INTO listing_images
      (listing_id, site_id, object_key, public_url, content_type, size_bytes, sort_order, is_cover)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      input.listingId,
      input.siteId,
      input.objectKey,
      input.publicUrl,
      input.contentType ?? null,
      input.sizeBytes ?? null,
      input.sortOrder,
      input.isCover ? 1 : 0,
    ]
  );

  return Number(res?.insertId);
}

/** Public-safe: solo devuelve imágenes si el listing está published */
export async function listPublishedImagesByListingAndSite(
  listingId: number,
  siteId: number,
  conn?: Queryable
) {
  const [rows] = await q(conn).query<any[]>(
    `
    SELECT li.id, li.public_url, li.sort_order, li.is_cover
    FROM listing_images li
    JOIN listings l
      ON l.id = li.listing_id
     AND l.site_id = li.site_id
    WHERE li.listing_id = ? AND li.site_id = ?
      AND l.status = 'published'
    ORDER BY li.is_cover DESC, li.sort_order ASC, li.id ASC
    `,
    [listingId, siteId]
  );
  return rows;
}

/** Helpers TX-friendly */
export async function getImageByIdAndListingAndSite(
  imageId: number,
  listingId: number,
  siteId: number,
  conn?: Queryable
) {
  const lock = !!conn; // si estás en TX, bloquea fila
  const [rows] = await q(conn).query<any[]>(
    `
    SELECT id, listing_id, site_id, object_key, public_url, sort_order, is_cover
    FROM listing_images
    WHERE id = ? AND listing_id = ? AND site_id = ?
    LIMIT 1
    ${lock ? "FOR UPDATE" : ""}
    `,
    [imageId, listingId, siteId]
  );
  return rows[0] ?? null;
}

/** Lock “todas las imágenes del listing” (evita carreras reorder/delete/cover) */
export async function listImageIdsByListingAndSite(
  listingId: number,
  siteId: number,
  conn?: Queryable
) {
  const lock = !!conn;
  const [rows] = await q(conn).query<any[]>(
    `
    SELECT id
    FROM listing_images
    WHERE listing_id = ? AND site_id = ?
    ORDER BY sort_order ASC, id ASC
    ${lock ? "FOR UPDATE" : ""}
    `,
    [listingId, siteId]
  );
  return rows.map((r) => Number(r.id));
}

export async function deleteImageByIdAndListingAndSite(
  imageId: number,
  listingId: number,
  siteId: number,
  conn?: Queryable
) {
  await q(conn).query(
    `DELETE FROM listing_images WHERE id = ? AND listing_id = ? AND site_id = ?`,
    [imageId, listingId, siteId]
  );
}

/** Set cover atómico: 1 statement (futuro-proof si luego pones UNIQUE de cover) */
export async function setCoverForListingAndSite(
  imageId: number,
  listingId: number,
  siteId: number,
  conn?: Queryable
) {
  const [res]: any = await q(conn).query(
    `
    UPDATE listing_images
    SET is_cover = CASE WHEN id = ? THEN 1 ELSE 0 END
    WHERE listing_id = ? AND site_id = ?
    `,
    [imageId, listingId, siteId]
  );
  return Number(res?.affectedRows ?? 0);
}

/** Aún útil en otros casos */
export async function clearCoverByListingAndSite(
  listingId: number,
  siteId: number,
  conn?: Queryable
) {
  await q(conn).query(
    `UPDATE listing_images SET is_cover = 0 WHERE listing_id = ? AND site_id = ?`,
    [listingId, siteId]
  );
}

export async function setCoverByIdAndListingAndSite(
  imageId: number,
  listingId: number,
  siteId: number,
  conn?: Queryable
) {
  const [res]: any = await q(conn).query(
    `UPDATE listing_images SET is_cover = 1 WHERE id = ? AND listing_id = ? AND site_id = ?`,
    [imageId, listingId, siteId]
  );
  return Number(res?.affectedRows ?? 0);
}

export async function getFirstImageIdBySortOrder(
  listingId: number,
  siteId: number,
  conn?: Queryable
) {
  const lock = !!conn;
  const [rows] = await q(conn).query<any[]>(
    `
    SELECT id
    FROM listing_images
    WHERE listing_id = ? AND site_id = ?
    ORDER BY sort_order ASC, id ASC
    LIMIT 1
    ${lock ? "FOR UPDATE" : ""}
    `,
    [listingId, siteId]
  );
  return rows[0] ? Number(rows[0].id) : null;
}

/** Resequence en 1 statement (menos roundtrips, mismo efecto) */
export async function resequenceSortOrders(
  listingId: number,
  siteId: number,
  conn?: Queryable
) {
  await q(conn).query(
    `
    WITH ordered AS (
      SELECT
        id,
        (ROW_NUMBER() OVER (ORDER BY sort_order ASC, id ASC) - 1) AS new_sort
      FROM listing_images
      WHERE listing_id = ? AND site_id = ?
    )
    UPDATE listing_images li
    JOIN ordered o ON o.id = li.id
    SET li.sort_order = o.new_sort
    WHERE li.listing_id = ? AND li.site_id = ?
    `,
    [listingId, siteId, listingId, siteId]
  );
}

export async function reorderImagesByIds(
  listingId: number,
  siteId: number,
  orderedIds: number[],
  conn?: Queryable
) {
  if (orderedIds.length === 0) return;

  const whenThen = orderedIds.map(() => "WHEN ? THEN ?").join(" ");
  const inPlaceholders = orderedIds.map(() => "?").join(",");

  const sql = `
    UPDATE listing_images
    SET sort_order = CASE id
      ${whenThen}
      ELSE sort_order
    END
    WHERE listing_id = ? AND site_id = ?
      AND id IN (${inPlaceholders})
  `;

  const params: any[] = [];
  for (let i = 0; i < orderedIds.length; i++) {
    params.push(orderedIds[i], i);
  }

  params.push(listingId, siteId, ...orderedIds);
  await q(conn).query(sql, params);
}