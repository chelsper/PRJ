import { readFileSync } from "node:fs";
import { parseEnv } from "node:util";
import { Client } from "pg";

const files = process.argv.slice(2);
if (files.length !== 2) throw new Error("Pass production and restored-branch protected env files");
const urls = files.map((file) => new URL(parseEnv(readFileSync(file,"utf8")).DATABASE_URL));
if (urls[0].hostname === urls[1].hostname) throw new Error("Recovery must use a separate host");
const summaries = [];
for (const url of urls) {
  url.searchParams.set("sslmode", "verify-full");
  const client = new Client({connectionString:url.toString(),connectionTimeoutMillis:10000});
  try {
    await client.connect();
    await client.query("begin read only");
    await client.query("set local statement_timeout='15s'");
    const result = await client.query(`select
      (select count(*)::text from public.donors) as donors,
      (select count(*)::text from public.gifts) as gifts,
      (select coalesce(sum(amount_cents),0)::text from public.gifts) as gift_total,
      (select count(*)::text from public.patient_cases) as cases,
      (select count(*)::text from public.users) as users,
      (select count(*)::text from public.gifts g left join public.donors d on d.id=g.donor_id where d.id is null) as orphan_gifts`);
    summaries.push(result.rows[0]);
    await client.query("rollback");
  } finally { await client.end(); }
}
const comparison = Object.fromEntries(Object.keys(summaries[0]).map((key) => [key, summaries[0][key] === summaries[1][key]]));
console.log(JSON.stringify({ matching:comparison, restoredGiftForeignKeysValid:summaries[1].orphan_gifts === "0" }));
if (Object.values(comparison).some((match) => !match) || summaries[1].orphan_gifts !== "0") process.exitCode=1;
