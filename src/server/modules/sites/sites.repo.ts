//src/server/modules/sites/sites.repo.ts
import { getDb } from "@/src/server/config/db";

export async function getSiteBySubdomain(subdomain: string) {
  const db = getDb();
  const [rows] = await db.query<any[]>(
    `SELECT
      id,
      subdomain,
      owner_user_id,
      vertical_slug,
      name,
      is_active,
      contact_phone,
      whatsapp_phone,
      facebook_url,
      instagram_username
     FROM sites
     WHERE subdomain = ?
     LIMIT 1`,
    [subdomain]
  );

  const row = rows[0];
  if (!row) return null;

  return {
    ...row,
    vertical: row.vertical_slug,
  };
}