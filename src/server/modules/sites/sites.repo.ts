import { db } from "@/src/server/config/db";
export async function getSiteBySubdomain(subdomain: string) {
  const [rows] = await db.query<any[]>(
    `SELECT id, subdomain, owner_user_id, vertical_slug, is_active
     FROM sites
     WHERE subdomain=?
     LIMIT 1`,
    [subdomain]
  );

  const row = rows[0];
  if (!row) return null;

  // ✅ compat: el resto de tu código usa site.vertical
  return { ...row, vertical: row.vertical_slug };
}