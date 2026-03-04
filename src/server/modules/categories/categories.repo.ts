// app/modules/categories/categories.repo.ts
import { db } from "@/src/server/config/db";

export async function listCategoriesByVertical(vertical: string) {
  const [rows] = await db.query<any[]>(
    "SELECT id, name, slug, vertical_slug FROM categories WHERE vertical_slug=? ORDER BY name",
    [vertical]
  );
  return rows;
}

// ✅ nuevo: valida que el categoryId pertenezca al vertical (multi-tenant safe)
export async function getCategoryByIdAndVertical(categoryId: number, vertical: string) {
  const [rows] = await db.query<any[]>(
    `SELECT id, name, slug, vertical_slug
     FROM categories
     WHERE id=? AND vertical_slug=? AND is_active=1
     LIMIT 1`,
    [categoryId, vertical]
  );

  return rows[0] ?? null;
}


export async function getCategoryBySlugAndVertical(slug: string, vertical: string) {
  const [rows] = await db.query<any[]>(
    `SELECT id, name, slug, vertical_slug
     FROM categories
     WHERE slug=? AND vertical_slug=? AND is_active=1
     LIMIT 1`,
    [slug, vertical]
  );
  return rows[0] ?? null;
}