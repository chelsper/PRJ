import { Pool, type PoolClient } from "pg";

import { env } from "@/server/env";

declare global {
  // eslint-disable-next-line no-var
  var __crmPool: Pool | undefined;
}

const pool =
  global.__crmPool ??
  new Pool({
    connectionString: env.DATABASE_URL,
    ssl: env.DATABASE_URL.includes("sslmode=require") ? { rejectUnauthorized: false } : undefined
  });

if (process.env.NODE_ENV !== "production") {
  global.__crmPool = pool;
}

export type QueryParam = string | number | boolean | Date | null;

export async function query<T>(text: string, params: QueryParam[] = []) {
  return pool.query<T>(text, params);
}

export async function transaction<T>(fn: (client: PoolClient) => Promise<T>) {
  const client = await pool.connect();

  try {
    await client.query("begin");
    const result = await fn(client);
    await client.query("commit");
    return result;
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}
