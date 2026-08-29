import { drizzle as drizzlePg } from "drizzle-orm/node-postgres";
import { drizzle as drizzlePglite } from "drizzle-orm/pglite";
import { PGlite } from "@electric-sql/pglite";
import pg from "pg";
import path from "node:path";
import fs from "node:fs";
import * as schema from "./schema";

const { Pool } = pg;

const rawDbUrl = process.env.DATABASE_URL;
const isPostgresUrl = rawDbUrl && (rawDbUrl.startsWith("postgresql://") || rawDbUrl.startsWith("postgres://"));

let dbInstance: any;
let poolInstance: pg.Pool | null = null;
let pgliteInstance: PGlite | null = null;

const initSql = `
DO $$ BEGIN
  CREATE TYPE role AS ENUM ('ADMIN', 'NORMAL_USER', 'STORE_OWNER');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  address TEXT NOT NULL,
  role role NOT NULL DEFAULT 'NORMAL_USER',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS users_email_unique ON users (email);

CREATE TABLE IF NOT EXISTS stores (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  address TEXT NOT NULL,
  owner_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ratings (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  store_id INTEGER NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS ratings_user_store_unique ON ratings (user_id, store_id);
`;

if (isPostgresUrl) {
  poolInstance = new Pool({ connectionString: rawDbUrl });
  dbInstance = drizzlePg(poolInstance, { schema });
  // Initialize tables in postgres
  poolInstance.query(initSql).catch((err) => {
    console.warn("Schema initialization notice:", err.message);
  });
} else {
  // Use persistent embedded PGlite
  const dbDir = path.resolve(process.cwd(), ".data/storerate-pglite");
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }
  pgliteInstance = new PGlite(dbDir);
  // Execute schema creation
  await pgliteInstance.exec(initSql);
  dbInstance = drizzlePglite(pgliteInstance, { schema });
}

export const pool = poolInstance;
export const pglite = pgliteInstance;
export const db = dbInstance;

export * from "./schema";

