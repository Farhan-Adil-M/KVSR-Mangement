import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import * as schema from "./schema";

function getDatabaseUrl() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL is not defined. Please set it in your environment variables."
    );
  }
  return url;
}

const sql = neon(getDatabaseUrl());
export const db = drizzle(sql, { schema });
/** Raw tagged-template client for complex aggregate queries. */
export const rawSql = sql;
