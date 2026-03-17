import type { ResultSetHeader, RowDataPacket } from "mysql2/promise";
import { getDb } from "@/src/server/config/db";

export type AdminCategoryRow = {
  id: number;
  name: string;
  slug: string;
  vertical_slug: string;
  is_active: number;
  created_at: string | null;
};

type CategoryRowPacket = RowDataPacket & {
  id: number;
  name: string;
  slug: string;
  vertical_slug: string;
  is_active: number;
  created_at: Date | string | null;
};

function mapCategoryRow(row: CategoryRowPacket): AdminCategoryRow {
  return {
    id: Number(row.id),
    name: String(row.name),
    slug: String(row.slug),
    vertical_slug: String(row.vertical_slug),
    is_active: Number(row.is_active),
    created_at: row.created_at ? String(row.created_at) : null,
  };
}

export async function adminListCategoriesByVertical(
  verticalSlug: string
): Promise<AdminCategoryRow[]> {
  const db = getDb();
  const [rows] = await db.query<CategoryRowPacket[]>(
    `
    SELECT id, name, slug, vertical_slug, is_active, created_at
    FROM categories
    WHERE vertical_slug = ?
    ORDER BY name ASC, id DESC
    `,
    [verticalSlug]
  );

  return rows.map(mapCategoryRow);
}

export async function adminGetCategoryById(
  categoryId: number
): Promise<AdminCategoryRow | null> {
  const db = getDb();
  const [rows] = await db.query<CategoryRowPacket[]>(
    `
    SELECT id, name, slug, vertical_slug, is_active, created_at
    FROM categories
    WHERE id = ?
    LIMIT 1
    `,
    [categoryId]
  );

  const row = rows[0];
  return row ? mapCategoryRow(row) : null;
}

export async function adminCreateCategory(input: {
  verticalSlug: string;
  name: string;
  slug: string;
  isActive: boolean;
}): Promise<{ id: number }> {
  const db = getDb();
  const [res] = await db.execute<ResultSetHeader>(
    `
    INSERT INTO categories (name, slug, is_active, vertical_slug)
    VALUES (?, ?, ?, ?)
    `,
    [input.name, input.slug, input.isActive ? 1 : 0, input.verticalSlug]
  );

  return { id: Number(res.insertId) };
}

export async function adminUpdateCategory(
  categoryId: number,
  patch: {
    verticalSlug?: string;
    name?: string;
    slug?: string;
    isActive?: boolean;
  }
): Promise<void> {
  const sets: string[] = [];
  const values: Array<string | number> = [];

  if (patch.name !== undefined) {
    sets.push("name = ?");
    values.push(patch.name);
  }

  if (patch.slug !== undefined) {
    sets.push("slug = ?");
    values.push(patch.slug);
  }

  if (patch.verticalSlug !== undefined) {
    sets.push("vertical_slug = ?");
    values.push(patch.verticalSlug);
  }

  if (patch.isActive !== undefined) {
    sets.push("is_active = ?");
    values.push(patch.isActive ? 1 : 0);
  }

  if (sets.length === 0) return;

  values.push(categoryId);

  const db = getDb();
  await db.execute(
    `UPDATE categories SET ${sets.join(", ")} WHERE id = ?`,
    values
  );
}