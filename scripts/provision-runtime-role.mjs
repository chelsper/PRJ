import { randomBytes } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { Client } from "pg";

// Explicit operational tool: never invoked by builds or application requests.
const [envFile, targetHost, outputFile] = process.argv.slice(2);
if (!envFile || !targetHost || !outputFile) throw new Error("Usage: provision-runtime-role.mjs owner-env-file exact-neon-host output-env-file");
process.loadEnvFile(envFile);
const ownerUrl = new URL(process.env.DATABASE_URL);
if (!/^ep-[a-z0-9-]+\.us-east-1\.aws\.neon\.tech$/.test(targetHost)) throw new Error("Unexpected target host");
ownerUrl.hostname = targetHost;
ownerUrl.searchParams.set("sslmode", "verify-full");
ownerUrl.searchParams.delete("uselibpqcompat");
const client = new Client({ connectionString: ownerUrl.toString(), connectionTimeoutMillis: 10000 });
const password = randomBytes(32).toString("hex");
try {
  await client.connect();
  await client.query("begin");
  await client.query("set local lock_timeout='5s'");
  const sql = readFileSync("sql/security/app-runtime-role.sql", "utf8").replace(/^begin;$/m, "").replace(/^commit;$/m, "");
  await client.query(sql);
  // Generated hex contains no SQL metacharacters; utility statements lack parameters.
  await client.query(`alter role crm_runtime login password '${password}'`);
  const privileges = await client.query(`select
    has_schema_privilege('crm_runtime','public','CREATE') as schema_create,
    has_table_privilege('crm_runtime','public.audit_log','UPDATE') as audit_update,
    has_table_privilege('crm_runtime','public.audit_log','DELETE') as audit_delete,
    has_sequence_privilege('crm_runtime','public.donor_number_seq','UPDATE') as sequence_reset`);
  if (Object.values(privileges.rows[0]).some(Boolean)) throw new Error("Inherited privileges are unsafe; no role committed");
  await client.query("commit");
  const runtimeUrl = new URL(ownerUrl);
  runtimeUrl.username = "crm_runtime";
  runtimeUrl.password = password;
  // Refuse overwrites so a previous rollback credential cannot be lost.
  writeFileSync(outputFile, `DATABASE_URL=${JSON.stringify(runtimeUrl.toString())}\nAPP_URL=${JSON.stringify(process.env.APP_URL)}\n`, { mode: 0o600, flag: "wx" });
  const runtime = new Client({ connectionString: runtimeUrl.toString(), connectionTimeoutMillis: 10000 });
  try {
    await runtime.connect();
    await runtime.query("begin read only");
    const check = await runtime.query("select rolsuper,rolcreatedb,rolcreaterole,rolbypassrls from pg_roles where rolname=current_user");
    if (Object.values(check.rows[0]).some(Boolean)) throw new Error("Runtime role is overprivileged");
    await runtime.query("select id from public.users limit 0");
    await runtime.query("select id from public.audit_log limit 0");
    await runtime.query("select donor_id from public.donor_giving_totals limit 0");
    await runtime.query("rollback");
  } finally { await runtime.end(); }
  console.log("Restricted runtime login provisioned and read access verified; credential written only to the protected output file.");
} catch (error) {
  await client.query("rollback").catch(() => {});
  console.error("Provisioning failed:", error.code ?? error.message);
  process.exitCode = 1;
} finally { await client.end(); }
