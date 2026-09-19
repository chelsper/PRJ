import { createHash } from "node:crypto";
import { transaction } from "@/server/db";

export function importFingerprint(rows: Record<string, string>[], mapping: Record<string, string>) {
  const entries = Object.entries(mapping).filter(([, target]) => target).sort((a, b) => a[1].localeCompare(b[1]));
  const canonical = rows.map(row => JSON.stringify(entries.map(([source, target]) => [target, row[source]?.trim() ?? ""]))).sort();
  return createHash("sha256").update(JSON.stringify(canonical)).digest("hex");
}

export async function reserveImport(input: { fingerprint: string; batchId: string; userId: string; fileName: string; rowCount: number; ipAddress: string | null }) {
  return transaction(async client => {
    await client.query("select pg_advisory_xact_lock(hashtextextended($1, 0))", [`import:${input.fingerprint}`]);
    const existing = await client.query(
      `select entity_id from public.audit_log where action = 'import.constituents.started'
       and metadata->>'fingerprint' = $1 limit 1`, [input.fingerprint]
    );
    if (existing.rows.length) return false;
    await client.query(
      `insert into public.audit_log(actor_user_id, action, entity_type, entity_id, status, ip_address, metadata)
       values ($1, 'import.constituents.started', 'import', $2, 'success', $3, $4::jsonb)`,
      [Number(input.userId), input.batchId, input.ipAddress, JSON.stringify({ batchId: input.batchId, fingerprint: input.fingerprint, fileName: input.fileName, rowCount: input.rowCount })]
    );
    return true;
  });
}
