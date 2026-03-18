import { query } from "@/server/db";

export async function writeAuditLog(input: {
  actorUserId: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  status: "success" | "denied" | "failed";
  ipAddress?: string | null;
  metadata?: Record<string, unknown>;
}) {
  await query(
    `insert into public.audit_log (
      actor_user_id,
      action,
      entity_type,
      entity_id,
      status,
      ip_address,
      metadata
    ) values ($1, $2, $3, $4, $5, $6, $7::jsonb)`,
    [
      input.actorUserId,
      input.action,
      input.entityType,
      input.entityId,
      input.status,
      input.ipAddress ?? null,
      JSON.stringify(input.metadata ?? {})
    ]
  );
}
