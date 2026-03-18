import { writeAuditLog } from "@/server/audit";
import { query } from "@/server/db";

export async function markGiftReceiptSent(input: {
  giftId: string;
  actorUserId: string;
  ipAddress?: string | null;
}) {
  const result = await query<{ id: string }>(
    `update public.gifts
     set receipt_sent = true,
         receipt_sent_at = now(),
         receipt_sent_by_user_id = $2
     where id = $1
       and deleted_at is null
     returning id::text`,
    [Number(input.giftId), Number(input.actorUserId)]
  );

  if (!result.rows[0]) {
    throw new Error("Gift not found.");
  }

  await writeAuditLog({
    actorUserId: input.actorUserId,
    action: "gift.receipt_send",
    entityType: "gift",
    entityId: input.giftId,
    status: "success",
    ipAddress: input.ipAddress ?? null
  });
}
