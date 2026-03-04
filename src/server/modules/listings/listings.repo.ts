
//api/src/server/modules/listings/listings.repo.ts
import { db } from "@/src/server/config/db";
import { countImagesByListingAndSite } from "./listingImages.repo";

export async function categoryExistsInVertical(categoryId: number, vertical: string) {
  const [rows] = await db.query<any[]>(
    "SELECT id FROM categories WHERE id=? AND vertical_slug=? LIMIT 1",
    [categoryId, vertical]
  );
  return rows.length > 0;
}
export async function listPublishedBySite(siteId: number) {
  const [rows] = await db.query<any[]>(
    `
    SELECT
      l.id,
      l.title,
      l.price,
      l.currency,
      l.status,
      l.created_at,
      li.public_url AS cover_url
    FROM listings l
    LEFT JOIN listing_images li
      ON li.listing_id = l.id
     AND li.site_id = l.site_id
     AND li.is_cover = 1
    WHERE l.site_id=? AND l.status='published'
    ORDER BY l.created_at DESC
    `,
    [siteId]
  );
  return rows;
}
export async function insertDraftListing(input: {
  siteId: number;
  userId: number;
  categoryId: number;
  title: string;
  description?: string;
  price?: number;
  currency: string;
  locationText?: string;
}) {
  const [result] = await db.query<any>(
    `INSERT INTO listings (site_id, user_id, category_id, title, description, price, currency, location_text, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'draft')`,
    [
      input.siteId,
      input.userId,
      input.categoryId,
      input.title,
      input.description ?? null,
      input.price ?? null,
      input.currency,
      input.locationText ?? null,
    ]
  );
  return result.insertId as number;
}

export async function getListingOwnerAndStatus(id: number) {
  const [rows] = await db.query<any[]>(
    "SELECT id, site_id, user_id, status FROM listings WHERE id=? LIMIT 1",
    [id]
  );
  return rows[0] ?? null;
}

export async function updateListingByIdAndSite(
  id: number,
  siteId: number,
  patch: Partial<{
    categoryId: number;
    title: string;
    description: string;
    price: number | null;
    currency: string;
    locationText: string | null;

    // ✅ nuevo
    attributes: Record<string, any> | null;
  }>
) {
  const fields: string[] = [];
  const values: any[] = [];

  if (patch.categoryId !== undefined) { fields.push("category_id=?"); values.push(patch.categoryId); }
  if (patch.title !== undefined) { fields.push("title=?"); values.push(patch.title); }
  if (patch.description !== undefined) { fields.push("description=?"); values.push(patch.description); }
  if (patch.price !== undefined) { fields.push("price=?"); values.push(patch.price); }
  if (patch.currency !== undefined) { fields.push("currency=?"); values.push(patch.currency); }
  if (patch.locationText !== undefined) { fields.push("location_text=?"); values.push(patch.locationText); }

  // ✅ nuevo
  if (patch.attributes !== undefined) {
    fields.push("attributes=?");
    values.push(patch.attributes === null ? null : JSON.stringify(patch.attributes));
  }

  if (fields.length === 0) return 0;

  values.push(id, siteId);

  const [res]: any = await db.query(
    `UPDATE listings
        SET ${fields.join(", ")}, updated_at = NOW()
      WHERE id=? AND site_id=?`,
    values
  );

  return (res?.affectedRows ?? 0) as number;
}
export async function setListingStatus(id: number, status: "draft" | "published" | "archived") {
  await db.query("UPDATE listings SET status=? WHERE id=?", [status, id]);
}

export async function listByUserAndVertical(userId: number, vertical: string, siteId: number) {
  const [rows] = await db.query<any[]>(
    `SELECT l.id, l.title, l.price, l.currency, l.status, l.created_at
     FROM listings l
     JOIN categories c ON c.id = l.category_id
     WHERE l.user_id=? AND l.site_id=? AND c.vertical_slug=?
     ORDER BY l.created_at DESC`,
    [userId, siteId, vertical]
  );
  return rows;
}
export async function listPublishedByVertical(vertical: string) {
  const [rows] = await db.query<any[]>(
    `
    SELECT
      l.id,
      l.title,
      l.price,
      l.currency,
      l.status,
      l.created_at,
      li.public_url AS cover_url
    FROM listings l
    JOIN categories c ON c.id = l.category_id
    LEFT JOIN listing_images li
      ON li.listing_id = l.id
     AND li.site_id = l.site_id
     AND li.is_cover = 1
    WHERE l.status='published'
      AND c.vertical_slug=?
    ORDER BY l.created_at DESC
    `,
    [vertical]
  );
  return rows;
}
export async function getListingByIdAndVertical(id: number, vertical: string) {
  const [rows] = await db.query<any[]>(
    `SELECT
        l.id,
        l.user_id, l.site_id,
        l.category_id,
        l.title,
        l.description,
        l.price,
        l.currency,
        l.location_text,
        l.status,
        l.attributes
     FROM listings l
     JOIN categories c ON c.id = l.category_id
     WHERE l.id=? AND c.vertical_slug=?
     LIMIT 1`,
    [id, vertical]
  );
  return rows[0] ?? null;
}
export async function getListingByIdAndSite(listingId: number, siteId: number) {
  const [rows] = await db.query<any[]>(
    `SELECT l.id, l.user_id, l.site_id, l.category_id, l.title, l.description,
            l.price, l.currency, l.location_text, l.status, l.attributes
     FROM listings l
     WHERE l.id=? AND l.site_id=?
     LIMIT 1`,
    [listingId, siteId]
  );

  return rows[0] ?? null;
}

export async function publishListingByIdAndSite(listingId: number, siteId: number) {
  const [res]: any = await db.query(
    `UPDATE listings
       SET status = 'published', updated_at = NOW()
     WHERE id = ? AND site_id = ? AND status = 'draft'`,
    [listingId, siteId]
  );

  return (res?.affectedRows ?? 0) > 0;
}

export async function getPublishedByIdAndVertical(id: number, vertical: string) {
  const [rows] = await db.query<any[]>(
    `SELECT
        l.id,
        l.category_id,
        l.title,
        l.description,
        l.price,
        l.currency,
        l.location_text,
        l.attributes,
        l.status,
        l.created_at
     FROM listings l
     JOIN categories c ON c.id = l.category_id
     WHERE l.id = ?
       AND l.status = 'published'
       AND c.vertical_slug = ?
     LIMIT 1`,
    [id, vertical]
  );

  return rows[0] ?? null;
}

export async function countImagesByListingIdsAndSite(
  siteId: number,
  listingIds: number[]
): Promise<Map<number, number>> {
  const ids = listingIds.filter((n) => Number.isFinite(n));
  if (ids.length === 0) return new Map();

  const placeholders = ids.map(() => "?").join(",");

  const [rows] = await db.query<any[]>(
    `
    SELECT listing_id, COUNT(*) AS images_count
    FROM listing_images
    WHERE site_id = ?
      AND listing_id IN (${placeholders})
    GROUP BY listing_id
    `,
    [siteId, ...ids]
  );

  return new Map<number, number>(
    rows.map((r) => [Number(r.listing_id), Number(r.images_count)])
  );
}

// === PUBLIC SEARCH (published + tenant-safe) ===

function escapeLike(s: string) {
  return s
    .replaceAll("\\", "\\\\")
    .replaceAll("%", "\\%")
    .replaceAll("_", "\\_");
}

function jsonPath(key: string) {
  return `$.\"${key.replaceAll('"', '\\"')}\"`;
}

type PublicSort = "newest" | "price_asc" | "price_desc" | "relevance";

export async function searchPublishedPublic(args: {
  siteId: number;
  vertical: string;
  categoryId?: number;
  q?: string;
  minPrice?: number;
  maxPrice?: number;
  sort: PublicSort;
  page: number;
  pageSize: number;

  dyn?: Array<
    | { op: "eq"; key: string; values: string[] }
    | { op: "num_min"; key: string; value: number }
    | { op: "num_max"; key: string; value: number }
    | { op: "bool"; key: string; value: "true" | "false" }
  >;

  useFulltext?: boolean;
}) {
  const where: string[] = [
    "l.site_id = ?",
    "l.status = 'published'",
    "c.vertical_slug = ?",
  ];
  const whereParams: any[] = [args.siteId, args.vertical];

  if (args.categoryId) {
    where.push("l.category_id = ?");
    whereParams.push(args.categoryId);
  }

  if (args.minPrice != null) {
    where.push("l.price IS NOT NULL AND l.price >= ?");
    whereParams.push(args.minPrice);
  }
  if (args.maxPrice != null) {
    where.push("l.price IS NOT NULL AND l.price <= ?");
    whereParams.push(args.maxPrice);
  }

  // q
  const q = args.q?.trim();
  const useFulltext = Boolean(args.useFulltext);

  const orderParams: any[] = [];
  let orderBy = "l.created_at DESC";

  if (q) {
    if (useFulltext) {
      where.push("MATCH(l.title, l.description) AGAINST(? IN BOOLEAN MODE)");
      whereParams.push(q);

      if (args.sort === "relevance") {
        orderBy =
          "MATCH(l.title, l.description) AGAINST(? IN BOOLEAN MODE) DESC, l.created_at DESC";
        orderParams.push(q);
      }
    } else {
      const like = `%${escapeLike(q)}%`;
      where.push("(l.title LIKE ? ESCAPE '\\\\' OR l.description LIKE ? ESCAPE '\\\\')");
      whereParams.push(like, like);

      // sin FULLTEXT, relevance cae a newest
      if (args.sort === "relevance") orderBy = "l.created_at DESC";
    }
  }

  // dyn (JSON_EXTRACT)
  for (const f of args.dyn ?? []) {
    if (f.op === "eq") {
      const placeholders = f.values.map(() => "?").join(",");
      where.push(`JSON_UNQUOTE(JSON_EXTRACT(l.attributes, ?)) IN (${placeholders})`);
      whereParams.push(jsonPath(f.key), ...f.values);
    } else if (f.op === "num_min") {
      where.push(
        `CAST(JSON_UNQUOTE(JSON_EXTRACT(l.attributes, ?)) AS DECIMAL(20,6)) >= ?`
      );
      whereParams.push(jsonPath(f.key), f.value);
    } else if (f.op === "num_max") {
      where.push(
        `CAST(JSON_UNQUOTE(JSON_EXTRACT(l.attributes, ?)) AS DECIMAL(20,6)) <= ?`
      );
      whereParams.push(jsonPath(f.key), f.value);
    } else if (f.op === "bool") {
      where.push(`LOWER(JSON_UNQUOTE(JSON_EXTRACT(l.attributes, ?))) = ?`);
      whereParams.push(jsonPath(f.key), f.value);
    }
  }

  // sort por precio
  if (args.sort === "price_asc") {
    orderBy = "l.price IS NULL ASC, l.price ASC, l.created_at DESC";
  } else if (args.sort === "price_desc") {
    orderBy = "l.price IS NULL ASC, l.price DESC, l.created_at DESC";
  } else if (args.sort === "newest") {
    orderBy = "l.created_at DESC";
  }
  // relevance ya quedó arriba si aplica

  const offset = (args.page - 1) * args.pageSize;

  // COUNT
  const [countRows] = await db.query<any[]>(
    `
    SELECT COUNT(*) AS total
    FROM listings l
    JOIN categories c ON c.id = l.category_id
    WHERE ${where.join(" AND ")}
    `,
    whereParams
  );
  const total = Number(countRows?.[0]?.total ?? 0);

  // SELECT (cover + images_count correlacionado; rápido con índice (site_id, listing_id))
  const selectParams = [...whereParams, ...orderParams, args.pageSize, offset];

  const [rows] = await db.query<any[]>(
    `
    SELECT
      l.id,
      l.title,
      l.price,
      l.currency,
      l.location_text,
      l.created_at,
      c.id   AS category_id,
      c.slug AS category_slug,
      c.name AS category_name,
      cover.public_url AS cover_url,
      (
        SELECT COUNT(*)
        FROM listing_images li2
        WHERE li2.site_id = l.site_id
          AND li2.listing_id = l.id
      ) AS images_count
    FROM listings l
    JOIN categories c ON c.id = l.category_id
    LEFT JOIN listing_images cover
      ON cover.site_id = l.site_id
     AND cover.listing_id = l.id
     AND cover.is_cover = 1
    WHERE ${where.join(" AND ")}
    ORDER BY ${orderBy}
    LIMIT ?
    OFFSET ?
    `,
    selectParams
  );

  return { total, items: rows };
}