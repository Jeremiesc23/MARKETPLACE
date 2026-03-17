import type { ResultSetHeader, RowDataPacket } from "mysql2/promise";
import { getDb } from "@/src/server/config/db";

export type AdminFieldRow = {
  id: number;
  vertical_slug: string;
  key: string;
  label: string;
  type: "text" | "number" | "boolean" | "select";
  options: any | null;
  constraints: any | null;
  is_active: number;
  created_at: string | null;
};

type FieldPacket = RowDataPacket & {
  id: number;
  vertical_slug: string;
  key: string;
  label: string;
  type: "text" | "number" | "boolean" | "select";
  options: any;
  constraints: any;
  is_active: number;
  created_at: Date | string | null;
};

function parseMaybeJson(v: any) {
  if (v == null) return null;
  if (typeof v === "string") {
    try { return JSON.parse(v); } catch { return v; }
  }
  return v;
}

function mapField(r: FieldPacket): AdminFieldRow {
  return {
    id: Number(r.id),
    vertical_slug: String(r.vertical_slug),
    key: String(r.key),
    label: String(r.label),
    type: r.type,
    options: parseMaybeJson(r.options),
    constraints: parseMaybeJson(r.constraints),
    is_active: Number(r.is_active),
    created_at: r.created_at ? String(r.created_at) : null,
  };
}

export async function adminListFieldsByVertical(verticalSlug: string) {
  const db = getDb();
  const [rows] = await db.query<FieldPacket[]>(
    `
    SELECT id, vertical_slug, \`key\` AS \`key\`, label, type, options, constraints, is_active, created_at
    FROM fields
    WHERE vertical_slug=?
    ORDER BY id DESC
    `,
    [verticalSlug]
  );
  return rows.map(mapField);
}

export async function adminGetFieldById(fieldId: number) {
  const db = getDb();
  const [rows] = await db.query<FieldPacket[]>(
    `
    SELECT id, vertical_slug, \`key\` AS \`key\`, label, type, options, constraints, is_active, created_at
    FROM fields
    WHERE id=?
    LIMIT 1
    `,
    [fieldId]
  );
  return rows[0] ? mapField(rows[0]) : null;
}

export async function adminCreateField(input: {
  verticalSlug: string;
  key: string;
  label: string;
  type: "text" | "number" | "boolean" | "select";
  options: any | null;
  constraints: any | null;
  isActive: boolean;
}) {
  const db = getDb();
  const [res] = await db.execute<ResultSetHeader>(
    `
    INSERT INTO fields (vertical_slug, \`key\`, label, type, options, constraints, is_active)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    `,
    [
      input.verticalSlug,
      input.key,
      input.label,
      input.type,
      input.options == null ? null : JSON.stringify(input.options),
      input.constraints == null ? null : JSON.stringify(input.constraints),
      input.isActive ? 1 : 0,
    ]
  );

  return { id: Number(res.insertId) };
}

export async function adminUpdateField(fieldId: number, patch: {
  label?: string;
  type?: "text" | "number" | "boolean" | "select";
  options?: any | null;
  constraints?: any | null;
  isActive?: boolean;
}) {
  const sets: string[] = [];
  const vals: any[] = [];

  if (patch.label !== undefined) { sets.push("label=?"); vals.push(patch.label); }
  if (patch.type !== undefined) { sets.push("type=?"); vals.push(patch.type); }
  if (patch.options !== undefined) { sets.push("options=?"); vals.push(patch.options == null ? null : JSON.stringify(patch.options)); }
  if (patch.constraints !== undefined) { sets.push("constraints=?"); vals.push(patch.constraints == null ? null : JSON.stringify(patch.constraints)); }
  if (patch.isActive !== undefined) { sets.push("is_active=?"); vals.push(patch.isActive ? 1 : 0); }

  if (sets.length === 0) return;

  vals.push(fieldId);
  const db = getDb();
  await db.execute(`UPDATE fields SET ${sets.join(", ")} WHERE id=?`, vals);
}