import { transaction, query } from "@/server/db";
import { giftInputSchema } from "@/server/validation/gifts";

type Actor = { userId: string; ipAddress?: string | null };

export type RecentGiftRow = {
  id: string;
  donor_name: string;
  amount_cents: number;
  gift_date: string;
  fund_name: string;
  campaign_name: string | null;
};

export async function listRecentGifts(): Promise<RecentGiftRow[]> {
  const result = await query<RecentGiftRow>(
    `select
      g.id::text,
      coalesce(d.organization_name, concat_ws(' ', d.first_name, d.last_name)) as donor_name,
      g.amount_cents,
      g.gift_date::text,
      f.name as fund_name,
      c.name as campaign_name
    from gifts g
    inner join donors d on d.id = g.donor_id
    inner join funds f on f.id = g.fund_id
    left join campaigns c on c.id = g.campaign_id
    where g.deleted_at is null
    order by g.gift_date desc, g.created_at desc
    limit 100`
  );

  return result.rows;
}

export async function createGift(input: unknown, actor: Actor) {
  const values = giftInputSchema.parse(input);

  return transaction(async (client) => {
    const inserted = await client.query<{ id: string }>(
      `insert into gifts (
        donor_id,
        fund_id,
        campaign_id,
        amount_cents,
        gift_date,
        payment_method,
        reference_number,
        notes,
        created_by,
        updated_by
      ) values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $9)
      returning id::text`,
      [
        values.donorId,
        values.fundId,
        values.campaignId ?? null,
        Math.round(values.amount * 100),
        values.giftDate,
        values.paymentMethod,
        values.referenceNumber ?? null,
        values.notes ?? null,
        actor.userId
      ]
    );

    await client.query(
      `insert into audit_log (actor_user_id, action, entity_type, entity_id, status, ip_address)
       values ($1, 'gift.create', 'gift', $2, 'success', $3)`,
      [actor.userId, inserted.rows[0].id, actor.ipAddress ?? null]
    );

    return inserted.rows[0].id;
  });
}
