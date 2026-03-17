import type { RowDataPacket, ResultSetHeader } from "mysql2/promise";
import { getDb } from "@/src/server/config/db";

function parseMaybeJson(v: any) {
  if (v == null) return null;
  if (typeof v === "string") {
    try { return JSON.parse(v); } catch { return v; }
  }
  return v;
}

export async function adminGetCategory(categoryId: number) {
  const db = getDb();
  const [rows] = await db.query<any[]>(
    `SELECT id, name, slug, vertical_slug, is_active
     FROM categories
     WHERE id=?
     LIMIT 1`,
    [categoryId]
  );
  return rows[0] ?? null;
}

export async function adminListAssignedFields(categoryId: number, vertical: string) {
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
      f.is_active,
      cf.is_required,
      cf.sort_order
    FROM category_fields cf
    JOIN fields f ON f.id = cf.field_id
    WHERE cf.category_id = ?
      AND f.vertical_slug = ?
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
    isActive: Boolean(r.is_active),
    isRequired: Boolean(r.is_required),
    sortOrder: Number(r.sort_order),
  }));
}

export async function adminApplyFieldToAllCategoriesInVertical(input: {
  fieldId: number;
  verticalSlug: string;
  isRequired: boolean;
}) {
  const db = getDb();
  await db.execute<ResultSetHeader>(
    `
    INSERT INTO category_fields (category_id, field_id, sort_order, is_required)
    SELECT
      c.id,
      ?,
      COALESCE(mx.max_sort, 0) + 1,
      ?
    FROM categories c
    LEFT JOIN (
      SELECT category_id, MAX(sort_order) AS max_sort
      FROM category_fields
      GROUP BY category_id
    ) mx ON mx.category_id = c.id
    WHERE c.vertical_slug = ?
      AND c.is_active = 1
    ON DUPLICATE KEY UPDATE
      is_required = VALUES(is_required)
    `,
    [input.fieldId, input.isRequired ? 1 : 0, input.verticalSlug]
  );
}

export async function adminUpdateRequired(categoryId: number, fieldId: number, isRequired: boolean) {
  const db = getDb();
  await db.execute(
    `UPDATE category_fields SET is_required=? WHERE category_id=? AND field_id=?`,
    [isRequired ? 1 : 0, categoryId, fieldId]
  );
}

export async function adminReorder(categoryId: number, orderedFieldIds: number[]) {
  const db = getDb();
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    for (let i = 0; i < orderedFieldIds.length; i++) {
      const fieldId = orderedFieldIds[i];
      await conn.execute(
        `UPDATE category_fields SET sort_order=? WHERE category_id=? AND field_id=?`,
        [i + 1, categoryId, fieldId]
      );
    }

    await conn.commit();
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}

export async function adminRemoveFieldFromCategory(categoryId: number, fieldId: number) {
  const db = getDb();
  await db.execute(
    `DELETE FROM category_fields WHERE category_id=? AND field_id=?`,
    [categoryId, fieldId]
  );
}


export async function adminAssignFieldToCategory(input: {
  categoryId: number;
  fieldId: number;
  isRequired: boolean;
}) {
  const db = getDb();
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    // 1) Si ya existe, solo actualiza required
    const [exists] = await conn.query<RowDataPacket[]>(
      `SELECT 1 FROM category_fields WHERE category_id=? AND field_id=? LIMIT 1 FOR UPDATE`,
      [input.categoryId, input.fieldId]
    );

    if (exists.length > 0) {
      await conn.execute(
        `UPDATE category_fields SET is_required=? WHERE category_id=? AND field_id=?`,
        [input.isRequired ? 1 : 0, input.categoryId, input.fieldId]
      );
      await conn.commit();
      return;
    }

    // 2) Si no existe, calcula siguiente sort_order
    const [rows] = await conn.query<RowDataPacket[]>(
      `SELECT COALESCE(MAX(sort_order), 0) AS max_sort
       FROM category_fields
       WHERE category_id=?
       FOR UPDATE`,
      [input.categoryId]
    );

    const nextSort = Number(rows[0]?.max_sort ?? 0) + 1;

    // 3) Inserta
    await conn.execute<ResultSetHeader>(
      `INSERT INTO category_fields (category_id, field_id, sort_order, is_required)
       VALUES (?, ?, ?, ?)`,
      [input.categoryId, input.fieldId, nextSort, input.isRequired ? 1 : 0]
    );

    await conn.commit();
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}