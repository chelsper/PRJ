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

    if (process.env.NODE_ENV === "production" || sslmode === "require" || sslmode === "prefer" || sslmode === "verify-ca") {
      parsed.searchParams.set("sslmode", "verify-full");
      parsed.searchParams.delete("uselibpqcompat");
    }

    return parsed.toString();
  } catch {
    if (process.env.NODE_ENV === "production") throw new Error("Invalid database connection configuration.");
    return databaseUrl.replace(/sslmode=(require|prefer|verify-ca)/g, "sslmode=verify-full");
  }
}

const normalizedDatabaseUrl = normalizeDatabaseUrl(env.DATABASE_URL);

const pool =
  global.__crmPool ??
  new Pool({
    connectionString: normalizedDatabaseUrl,
    max: 10,
    connectionTimeoutMillis: 10000,
    idleTimeoutMillis: 30000
  });

if (process.env.NODE_ENV !== "production") {
  global.__crmPool = pool;
}

export type QueryParam = string | number | boolean | Date | null;

export async function query<T extends QueryResultRow>(text: string, params: QueryParam[] = []) {
  return transaction((client) => client.query<T>(text, params));
}

export async function transaction<T>(fn: (client: PoolClient) => Promise<T>) {
  const client = await pool.connect();

  try {
    await client.query("begin");
    // Transaction-local settings work with Neon's transaction pooler.
    await client.query("set local statement_timeout = '30s'");
    await client.query("set local lock_timeout = '5s'");
    await client.query("set local idle_in_transaction_session_timeout = '15s'");
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
