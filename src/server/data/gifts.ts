import { transaction, query } from "@/server/db";
import { giftInputSchema } from "@/server/validation/gifts";

type Actor = { userId: string; ipAddress?: string | null };

export type RecentGiftRow = {
  id: string;
  donor_id?: string;
  donor_name: string;
  amount_cents: number;
  gift_date: string;
  fund_name: string;
  campaign_name: string | null;
};

export type GiftDetailRow = {
  id: string;
  donor_id: string;
  fund_id: string;
  campaign_id: string | null;
  amount_cents: number;
  gift_date: string;
  payment_method: "ACH" | "CARD" | "CHECK" | "CASH" | "WIRE" | "OTHER";
  reference_number: string | null;
  notes: string | null;
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
    from public.gifts g
    inner join public.donors d on d.id = g.donor_id
    inner join public.funds f on f.id = g.fund_id
    left join public.campaigns c on c.id = g.campaign_id
    where g.deleted_at is null
    order by g.gift_date desc, g.created_at desc
    limit 100`
  );

  return result.rows;
}

export async function getGiftById(giftId: string): Promise<GiftDetailRow | null> {
  const result = await query<GiftDetailRow>(
    `select
      g.id::text,
      g.donor_id::text,
      g.fund_id::text,
      g.campaign_id::text,
      g.amount_cents,
      g.gift_date::text,
      g.payment_method,
      g.reference_number,
      g.notes
    from public.gifts g
    where g.id = $1
      and g.deleted_at is null`,
    [Number(giftId)]
  );

  return result.rows[0] ?? null;
}

export async function createGift(input: unknown, actor: Actor) {
  const values = giftInputSchema.parse(input);

  return transaction(async (client) => {
    const inserted = await client.query<{ id: string }>(
      `insert into public.gifts (
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
      `insert into public.audit_log (actor_user_id, action, entity_type, entity_id, status, ip_address)
       values ($1, 'gift.create', 'gift', $2, 'success', $3)`,
      [actor.userId, inserted.rows[0].id, actor.ipAddress ?? null]
    );

    return inserted.rows[0].id;
  });
}

export async function updateGift(giftId: string, input: unknown, actor: Actor) {
  const values = giftInputSchema.parse(input);

  await transaction(async (client) => {
    await client.query(
      `update public.gifts
       set donor_id = $2,
           fund_id = $3,
           campaign_id = $4,
           amount_cents = $5,
           gift_date = $6,
           payment_method = $7,
           reference_number = $8,
           notes = $9,
           updated_by = $10
       where id = $1`,
      [
        Number(giftId),
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
      `insert into public.audit_log (actor_user_id, action, entity_type, entity_id, status, ip_address)
       values ($1, 'gift.update', 'gift', $2, 'success', $3)`,
      [actor.userId, giftId, actor.ipAddress ?? null]
    );
  });
}
