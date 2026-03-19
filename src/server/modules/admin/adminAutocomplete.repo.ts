import type { RowDataPacket } from "mysql2/promise";

import { getDb } from "@/src/server/config/db";

export type AdminVerticalSuggestionRow = {
  value: string;
};

type VerticalRowPacket = RowDataPacket & {
  value: string;
};

export async function adminSearchVerticalSuggestions(
  query: string,
  limit: number
): Promise<AdminVerticalSuggestionRow[]> {
  const db = getDb();
  const normalizedQuery = query.trim().toLowerCase();
  const likeQuery = `%${normalizedQuery}%`;
  const prefixQuery = `${normalizedQuery}%`;

  const [rows] = await db.query<VerticalRowPacket[]>(
    `
    SELECT value
    FROM (
      SELECT vertical_slug AS value FROM sites
      UNION
      SELECT vertical_slug AS value FROM categories
      UNION
      SELECT vertical_slug AS value FROM fields
    ) AS verticals
    WHERE LOWER(value) LIKE ?
    ORDER BY
      CASE
        WHEN LOWER(value) = ? THEN 0
        WHEN LOWER(value) LIKE ? THEN 1
        ELSE 2
      END,
      CHAR_LENGTH(value) ASC,
      value ASC
    LIMIT ?
    `,
    [likeQuery, normalizedQuery, prefixQuery, limit]
  );

  return rows.map((row) => ({ value: String(row.value) }));
}
