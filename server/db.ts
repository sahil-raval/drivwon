import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "@shared/schema";

const databaseUrl = process.env.DATABASE_URL;
export const pool = databaseUrl
  ? new Pool({ connectionString: databaseUrl, max: 10, idleTimeoutMillis: 30_000 })
  : null;
export const db = pool ? drizzle(pool, { schema }) : null;
