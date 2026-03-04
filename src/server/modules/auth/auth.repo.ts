import type { RowDataPacket } from "mysql2";
import { db } from "@/src/server/config/db";

export type DbUser = {
  id: number;
  name: string;
  email: string;
  password_hash: string;
  role: "user" | "admin" | "moderator";
  is_active: number;
};

// Row types compatible with mysql2
type UserRow = DbUser & RowDataPacket;
type UserPublicRow = Omit<DbUser, "password_hash"> & RowDataPacket;

export async function findUserByEmail(email: string) {
  const [rows] = await db.query<UserRow[]>(
    "SELECT id, name, email, password_hash, role, is_active FROM users WHERE email=? LIMIT 1",
    [email]
  );
  return rows[0] ?? null;
}

export async function findUserById(id: number) {
  const [rows] = await db.query<UserPublicRow[]>(
    "SELECT id, name, email, role, is_active FROM users WHERE id=? LIMIT 1",
    [id]
  );
  return rows[0] ?? null;
}
