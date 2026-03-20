import { Pool, type PoolClient, type QueryResultRow } from "pg";

import { env } from "@/server/env";

declare global {
  // eslint-disable-next-line no-var
  var __crmPool: Pool | undefined;
}

function normalizeDatabaseUrl(databaseUrl: string) {
  try {
    const parsed = new URL(databaseUrl);
    const sslmode = parsed.searchParams.get("sslmode");

    if (sslmode === "require" || sslmode === "prefer" || sslmode === "verify-ca") {
      parsed.searchParams.set("sslmode", "verify-full");
    }

    return parsed.toString();
  } catch {
    return databaseUrl.replace(/sslmode=(require|prefer|verify-ca)/g, "sslmode=verify-full");
  }
}

const normalizedDatabaseUrl = normalizeDatabaseUrl(env.DATABASE_URL);

const pool =
  global.__crmPool ??
  new Pool({
    connectionString: normalizedDatabaseUrl
  });

if (process.env.NODE_ENV !== "production") {
  global.__crmPool = pool;
}

export type QueryParam = string | number | boolean | Date | null;

export async function query<T extends QueryResultRow>(text: string, params: QueryParam[] = []) {
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
