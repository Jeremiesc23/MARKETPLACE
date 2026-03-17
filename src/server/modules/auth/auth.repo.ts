//src/server/modules/auth/auth.repo.ts

import type { ResultSetHeader, RowDataPacket } from "mysql2";
import { db } from "@/src/server/config/db";

export type DbUser = {
  id: number;
  name: string;
  email: string;
  password_hash: string;
  role: "user" | "admin" | "moderator";
  is_active: number;
  force_password_change: number;
  password_changed_at: string | null;
};

export type DbUserPublic = {
  id: number;
  name: string;
  email: string;
  role: "user" | "admin" | "moderator";
  is_active: number;
  force_password_change: number;
  password_changed_at: string | null;
  siteSubdomain: string | null;
};

type UserRow = DbUser & RowDataPacket;
type UserPublicRow = DbUserPublic & RowDataPacket;

export async function findUserByEmail(email: string) {
  const [rows] = await db.query<UserRow[]>(
    `
    SELECT
      id,
      name,
      email,
      password_hash,
      role,
      is_active,
      force_password_change,
      password_changed_at
    FROM users
    WHERE email = ?
    LIMIT 1
    `,
    [email]
  );

  return rows[0] ?? null;
}

export async function findUserById(id: number) {
  const [rows] = await db.query<UserPublicRow[]>(
    `
    SELECT
      u.id,
      u.name,
      u.email,
      u.role,
      u.is_active,
      u.force_password_change,
      u.password_changed_at,
      (
        SELECT s.subdomain
        FROM sites s
        WHERE s.owner_user_id = u.id
          AND s.is_active = 1
        ORDER BY s.id ASC
        LIMIT 1
      ) AS siteSubdomain
    FROM users u
    WHERE u.id = ?
    LIMIT 1
    `,
    [id]
  );

  return rows[0] ?? null;
}

export async function findUserAuthById(id: number) {
  const [rows] = await db.query<UserRow[]>(
    `
    SELECT
      id,
      name,
      email,
      password_hash,
      role,
      is_active,
      force_password_change,
      password_changed_at
    FROM users
    WHERE id = ?
    LIMIT 1
    `,
    [id]
  );

  return rows[0] ?? null;
}

export async function updateUserPassword(userId: number, passwordHash: string) {
  const [res] = await db.execute<ResultSetHeader>(
    `
    UPDATE users
    SET
      password_hash = ?,
      force_password_change = 0,
      password_changed_at = NOW()
    WHERE id = ?
    `,
    [passwordHash, userId]
  );

  return res.affectedRows > 0;
}