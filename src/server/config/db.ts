// src/server/config/db.ts
import mysql from "mysql2/promise";

let pool: mysql.Pool | null = null;

function getDbConfig() {
  const { DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME } = process.env;

  if (!DB_HOST || !DB_USER || !DB_PASSWORD || !DB_NAME) {
    throw new Error(
      "Missing DB env vars. Check DB_HOST, DB_USER, DB_PASSWORD, DB_NAME"
    );
  }

  return {
    host: DB_HOST,
    port: DB_PORT ? Number(DB_PORT) : 3306,
    user: DB_USER,
    password: DB_PASSWORD,
    database: DB_NAME,
  };
}

export function getDb() {
  if (!pool) {
    const config = getDbConfig();

    pool = mysql.createPool({
      ...config,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
    });
  }

  return pool;
}