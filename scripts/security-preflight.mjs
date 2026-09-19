import { readFileSync } from "node:fs";
import { Client } from "pg";

if (!process.argv[2]) throw new Error("Pass a protected environment file path.");
process.loadEnvFile(process.argv[2]);
const url = new URL(process.env.DATABASE_URL);
url.searchParams.set("sslmode", "verify-full");
const client = new Client({ connectionString: url.toString(), connectionTimeoutMillis: 5000 });
try {
  await client.connect();
  await client.query("begin read only");
  await client.query("set local statement_timeout = '10s'");
  const role = await client.query(`select rolsuper, rolcreaterole, rolcreatedb, rolbypassrls
    from pg_roles where rolname = current_user`);
  console.log(JSON.stringify({ appOrigin: new URL(process.env.APP_URL).origin, role: role.rows[0] }));
  const source = readFileSync("src/app/api/exports/donors/route.ts", "utf8");
  const exportSql = source.match(/`with current_year_gifts[\s\S]*?`/)?.[0].slice(1, -1);
  if (!exportSql) throw new Error("Export SQL not found");
  await client.query(`explain ${exportSql}`);
  console.log("Export SQL validated against database schema (EXPLAIN only).");
  const aggregation = exportSql.slice(0, exportSql.indexOf("      select\n        d.donor_number"))
    .replace("with current_year_gifts", "current_year_gifts")
    .replaceAll("public.gifts", "test_gifts").replaceAll("public.soft_credits", "test_credits").replaceAll("public.donors", "test_donors");
  const fixture = await client.query(`with
    test_gifts(id, donor_id, gift_type, amount_cents, gift_date, deleted_at) as
      (values (1, 1, 'CASH', 10000, current_date, null::timestamptz)),
    test_credits(gift_id, donor_id) as (values (1, 2), (1, 3)),
    test_donors(id, organization_name, first_name, last_name, deleted_at) as
      (values (2, null::text, 'Test', 'One', null::timestamptz), (3, null, 'Test', 'Two', null::timestamptz)),
    ${aggregation} select total_amount_received from donor_year_totals`);
  if (Number(fixture.rows[0]?.total_amount_received) !== 10000) throw new Error("Gift aggregation regression");
  console.log("Synthetic gift with two soft-credit recipients totals once: passed.");
  await client.query("rollback");
} catch (error) {
  console.error("Security preflight failed:", error.code ?? error.name);
  process.exitCode = 1;
} finally {
  await client.end();
}
