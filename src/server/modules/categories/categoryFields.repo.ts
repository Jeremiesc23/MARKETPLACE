// src/server/modules/categories/categoryFields.repo.ts
import { getDb } from "@/src/server/config/db";

function parseMaybeJson(v: any) {
  if (v == null) return null;
  if (typeof v === "string") {
    try {
      return JSON.parse(v);
    } catch {
      return v;
    }
  }
  return v;
}

export async function getCategoryByIdAndVertical(categoryId: number, vertical: string) {
  const db = getDb();
  const [rows] = await db.query<any[]>(
    `SELECT id, name, slug, vertical_slug
     FROM categories
     WHERE id=? AND vertical_slug=? AND is_active=1
     LIMIT 1`,
    [categoryId, vertical]
  );
  return rows[0] ?? null;
}

export async function listFieldsByCategory(categoryId: number, vertical: string) {
  const db = getDb();
  const [rows] = await db.query<any[]>(
    `
    SELECT
      f.id,
      f.\`key\`,
      f.label,
      f.type,
      f.options,
      f.constraints,
      cf.is_required,
      cf.sort_order
    FROM category_fields cf
    JOIN fields f ON f.id = cf.field_id
    WHERE cf.category_id = ?
      AND f.vertical_slug = ?
      AND f.is_active = 1
    ORDER BY cf.sort_order ASC, f.id ASC
    `,
    [categoryId, vertical]
  );

  return rows.map((r) => ({
    id: Number(r.id),
    key: r.key,
    label: r.label,
    type: r.type,
    options: parseMaybeJson(r.options),
    constraints: parseMaybeJson(r.constraints),
    isRequired: Boolean(r.is_required),
    sortOrder: Number(r.sort_order),
  }));
}