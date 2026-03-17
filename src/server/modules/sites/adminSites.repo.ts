//adminSites.repo.ts
import type { Pool, ResultSetHeader, RowDataPacket } from "mysql2/promise";
import { db } from "@/src/server/config/db";

export type AdminSiteRow = {
  id: number;
  subdomain: string;
  vertical_slug: string;
  name: string | null;
  is_active: number;
  created_at: string | null;
  contact_phone: string | null;
  whatsapp_phone: string | null;
  facebook_url: string | null;
  instagram_username: string | null;
  owner: {
    id: number;
    name: string;
    email: string;
    role: "user" | "admin" | "moderator";
    is_active: number;
    force_password_change: number;
  };
};

function getPool(): Pool {
  return db as unknown as Pool;
}

export async function adminListSites(): Promise<AdminSiteRow[]> {
  const pool = getPool();
  const [rows] = await pool.query<RowDataPacket[]>(
    `
    SELECT
      s.id,
      s.subdomain,
      s.vertical_slug,
      s.name,
      s.is_active,
      s.created_at,
      s.contact_phone,
      s.whatsapp_phone,
      s.facebook_url,
      s.instagram_username,
      u.id AS owner_id,
      u.name AS owner_name,
      u.email AS owner_email,
      u.role AS owner_role,
      u.is_active AS owner_is_active,
      u.force_password_change AS owner_force_password_change
    FROM sites s
    JOIN users u ON u.id = s.owner_user_id
    ORDER BY s.id DESC
    `
  );

  return rows.map((r) => ({
    id: Number(r.id),
    subdomain: String(r.subdomain),
    vertical_slug: String(r.vertical_slug),
    name: r.name === null ? null : String(r.name),
    is_active: Number(r.is_active),
    created_at: r.created_at === null ? null : String(r.created_at),
    contact_phone: r.contact_phone === null ? null : String(r.contact_phone),
    whatsapp_phone: r.whatsapp_phone === null ? null : String(r.whatsapp_phone),
    facebook_url: r.facebook_url === null ? null : String(r.facebook_url),
    instagram_username:
      r.instagram_username === null ? null : String(r.instagram_username),
    owner: {
      id: Number(r.owner_id),
      name: String(r.owner_name),
      email: String(r.owner_email),
      role: r.owner_role as AdminSiteRow["owner"]["role"],
      is_active: Number(r.owner_is_active),
      force_password_change: Number(r.owner_force_password_change ?? 0),
    },
  }));
}

export async function adminGetSiteById(siteId: number): Promise<AdminSiteRow | null> {
  const pool = getPool();
  const [rows] = await pool.query<RowDataPacket[]>(
    `
    SELECT
      s.id,
      s.subdomain,
      s.vertical_slug,
      s.name,
      s.is_active,
      s.created_at,
      s.contact_phone,
      s.whatsapp_phone,
      s.facebook_url,
      s.instagram_username,
      u.id AS owner_id,
      u.name AS owner_name,
      u.email AS owner_email,
      u.role AS owner_role,
      u.is_active AS owner_is_active,
      u.force_password_change AS owner_force_password_change
    FROM sites s
    JOIN users u ON u.id = s.owner_user_id
    WHERE s.id = ?
    LIMIT 1
    `,
    [siteId]
  );

  const r = rows[0];
  if (!r) return null;

  return {
    id: Number(r.id),
    subdomain: String(r.subdomain),
    vertical_slug: String(r.vertical_slug),
    name: r.name === null ? null : String(r.name),
    is_active: Number(r.is_active),
    created_at: r.created_at === null ? null : String(r.created_at),
    contact_phone: r.contact_phone === null ? null : String(r.contact_phone),
    whatsapp_phone: r.whatsapp_phone === null ? null : String(r.whatsapp_phone),
    facebook_url: r.facebook_url === null ? null : String(r.facebook_url),
    instagram_username:
      r.instagram_username === null ? null : String(r.instagram_username),
    owner: {
      id: Number(r.owner_id),
      name: String(r.owner_name),
      email: String(r.owner_email),
      role: r.owner_role as AdminSiteRow["owner"]["role"],
      is_active: Number(r.owner_is_active),
      force_password_change: Number(r.owner_force_password_change ?? 0),
    },
  };
}

export async function adminCreateUserAndSite(input: {
  ownerName: string;
  ownerEmail: string;
  ownerPasswordHash: string;
  siteName: string;
  subdomain: string;
  verticalSlug: string;
  contactPhone?: string;
  whatsappPhone?: string;
  facebookUrl?: string;
  instagramUsername?: string;
}): Promise<{ siteId: number; ownerUserId: number }> {
  const pool = getPool();
  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();

    const [userRes] = await conn.execute<ResultSetHeader>(
      `
      INSERT INTO users (
        name,
        email,
        password_hash,
        role,
        is_active,
        force_password_change,
        password_changed_at
      )
      VALUES (?, ?, ?, 'user', 1, 1, NULL)
      `,
      [input.ownerName, input.ownerEmail, input.ownerPasswordHash]
    );

    const ownerUserId = Number(userRes.insertId);

    const [siteRes] = await conn.execute<ResultSetHeader>(
      `
      INSERT INTO sites (
        subdomain,
        owner_user_id,
        vertical_slug,
        name,
        is_active,
        contact_phone,
        whatsapp_phone,
        facebook_url,
        instagram_username
      )
      VALUES (?, ?, ?, ?, 1, ?, ?, ?, ?)
      `,
      [
        input.subdomain,
        ownerUserId,
        input.verticalSlug,
        input.siteName,
        input.contactPhone ?? null,
        input.whatsappPhone ?? null,
        input.facebookUrl ?? null,
        input.instagramUsername ?? null,
      ]
    );

    const siteId = Number(siteRes.insertId);

    await conn.commit();
    return { siteId, ownerUserId };
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}

export async function adminUpdateSite(
  siteId: number,
  patch: {
    name?: string;
    subdomain?: string;
    verticalSlug?: string;
    isActive?: boolean;
    contactPhone?: string;
    whatsappPhone?: string;
    facebookUrl?: string;
    instagramUsername?: string;
  }
): Promise<void> {
  const pool = getPool();

  const fields: string[] = [];
  const values: any[] = [];

  if (patch.name !== undefined) {
    fields.push("name = ?");
    values.push(patch.name);
  }
  if (patch.subdomain !== undefined) {
    fields.push("subdomain = ?");
    values.push(patch.subdomain);
  }
  if (patch.verticalSlug !== undefined) {
    fields.push("vertical_slug = ?");
    values.push(patch.verticalSlug);
  }
  if (patch.isActive !== undefined) {
    fields.push("is_active = ?");
    values.push(patch.isActive ? 1 : 0);
  }
  if (patch.contactPhone !== undefined) {
    fields.push("contact_phone = ?");
    values.push(patch.contactPhone || null);
  }
  if (patch.whatsappPhone !== undefined) {
    fields.push("whatsapp_phone = ?");
    values.push(patch.whatsappPhone || null);
  }
  if (patch.facebookUrl !== undefined) {
    fields.push("facebook_url = ?");
    values.push(patch.facebookUrl || null);
  }
  if (patch.instagramUsername !== undefined) {
    fields.push("instagram_username = ?");
    values.push(patch.instagramUsername || null);
  }

  if (fields.length === 0) return;

  values.push(siteId);

  await pool.execute(`UPDATE sites SET ${fields.join(", ")} WHERE id = ?`, values);
}

export async function adminResetSiteOwnerPassword(siteId: number, ownerPasswordHash: string) {
  const pool = getPool();

  const site = await adminGetSiteById(siteId);
  if (!site) {
    const err = new Error("Sitio no encontrado");
    (err as any).status = 404;
    throw err;
  }

  const [res] = await pool.execute<ResultSetHeader>(
    `
    UPDATE users
    SET
      password_hash = ?,
      force_password_change = 1,
      password_changed_at = NULL
    WHERE id = ?
    `,
    [ownerPasswordHash, site.owner.id]
  );

  if (res.affectedRows === 0) {
    const err = new Error("No se pudo restablecer la password");
    (err as any).status = 500;
    throw err;
  }

  return {
    ownerUserId: site.owner.id,
    ownerEmail: site.owner.email,
  };
}