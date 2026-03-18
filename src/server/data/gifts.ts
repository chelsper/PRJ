import type { PoolClient } from "pg";

import { transaction, query } from "@/server/db";
import { giftInputSchema } from "@/server/validation/gifts";

type Actor = { userId: string; ipAddress?: string | null };

export type RecentGiftRow = {
  id: string;
  gift_number?: string | null;
  donor_id?: string;
  donor_name: string;
  gift_type:
    | "PLEDGE"
    | "PLEDGE_PAYMENT"
    | "CASH"
    | "STOCK_PROPERTY"
    | "GIFT_IN_KIND"
    | "MATCHING_GIFT_PLEDGE"
    | "MATCHING_GIFT_PAYMENT";
  amount_cents: number;
  gift_date: string;
  fund_name: string;
  campaign_name: string | null;
};

export type GiftDetailRow = {
  id: string;
  gift_number: string | null;
  donor_id: string;
  fund_id: string;
  campaign_id: string | null;
  soft_credit_donor_id: string | null;
  gift_type:
    | "PLEDGE"
    | "PLEDGE_PAYMENT"
    | "CASH"
    | "STOCK_PROPERTY"
    | "GIFT_IN_KIND"
    | "MATCHING_GIFT_PLEDGE"
    | "MATCHING_GIFT_PAYMENT";
  amount_cents: number;
  gift_date: string;
  payment_method: "ACH" | "CARD" | "CHECK" | "CASH" | "WIRE" | "OTHER" | null;
  reference_number: string | null;
  notes: string | null;
};

async function giftAuditSnapshot(client: PoolClient, giftId: number) {
  const result = await client.query<{ snapshot: Record<string, unknown> | null }>(
    `select jsonb_build_object(
      'id', g.id,
      'gift_number', g.gift_number,
      'donor_id', g.donor_id,
      'fund_id', g.fund_id,
      'campaign_id', g.campaign_id,
      'gift_type', g.gift_type,
      'amount_cents', g.amount_cents,
      'gift_date', g.gift_date,
      'payment_method', g.payment_method,
      'reference_number', g.reference_number,
      'notes', g.notes,
      'deleted_at', g.deleted_at,
      'soft_credits',
        coalesce((
          select jsonb_agg(
            jsonb_build_object(
              'donor_id', sc.donor_id,
              'credit_type', sc.credit_type,
              'amount_cents', sc.amount_cents
            )
            order by sc.id
          )
          from public.soft_credits sc
          where sc.gift_id = g.id
        ), '[]'::jsonb)
    ) as snapshot
    from public.gifts g
    where g.id = $1`,
    [giftId]
  );

  return result.rows[0]?.snapshot ?? null;
}

async function syncSoftCredits(
  client: PoolClient,
  input: {
    giftId: string;
    donorId: number;
    amountCents: number;
    manualSoftCreditDonorId?: number | null;
    actorUserId: string;
  }
) {
  const spouseResult = await client.query<{ spouse_donor_id: string | null }>(
    `select spouse_donor_id::text
     from public.donors
     where id = $1`,
    [input.donorId]
  );

  const spouseDonorId = spouseResult.rows[0]?.spouse_donor_id ? Number(spouseResult.rows[0].spouse_donor_id) : null;

  await client.query(`delete from public.soft_credits where gift_id = $1`, [Number(input.giftId)]);

  const creditTargets = new Map<number, "AUTO_SPOUSE" | "MANUAL">();

  if (spouseDonorId && spouseDonorId !== input.donorId) {
    creditTargets.set(spouseDonorId, "AUTO_SPOUSE");
  }

  if (input.manualSoftCreditDonorId && input.manualSoftCreditDonorId !== input.donorId) {
    creditTargets.set(input.manualSoftCreditDonorId, "MANUAL");
  }

  for (const [donorId, creditType] of creditTargets.entries()) {
    await client.query(
      `insert into public.soft_credits (
        gift_id,
        donor_id,
        credit_type,
        amount_cents,
        created_by,
        updated_by
      ) values ($1, $2, $3, $4, $5, $5)`,
      [Number(input.giftId), donorId, creditType, input.amountCents, input.actorUserId]
    );
  }
}

export async function listRecentGifts(): Promise<RecentGiftRow[]> {
  const result = await query<RecentGiftRow>(
    `select
      g.id::text,
      g.gift_number,
      coalesce(d.organization_name, concat_ws(' ', d.first_name, d.last_name)) as donor_name,
      g.gift_type,
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
      g.gift_number,
      g.donor_id::text,
      g.fund_id::text,
      g.campaign_id::text,
      sc.donor_id::text as soft_credit_donor_id,
      g.gift_type,
      g.amount_cents,
      g.gift_date::text,
      g.payment_method,
      g.reference_number,
      g.notes
    from public.gifts g
    left join public.soft_credits sc on sc.gift_id = g.id and sc.credit_type = 'MANUAL'
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
        gift_type,
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
        values.giftType,
        Math.round(values.amount * 100),
        values.giftDate,
        values.paymentMethod ?? null,
        values.referenceNumber ?? null,
        values.notes ?? null,
        actor.userId
      ]
    );

    await syncSoftCredits(client, {
      giftId: inserted.rows[0].id,
      donorId: values.donorId,
      amountCents: Math.round(values.amount * 100),
      manualSoftCreditDonorId: values.softCreditDonorId ?? null,
      actorUserId: actor.userId
    });

    const after = await giftAuditSnapshot(client, Number(inserted.rows[0].id));

    await client.query(
      `insert into public.audit_log (actor_user_id, action, entity_type, entity_id, status, ip_address, metadata)
       values ($1, 'gift.create', 'gift', $2, 'success', $3, $4::jsonb)`,
      [
        actor.userId,
        inserted.rows[0].id,
        actor.ipAddress ?? null,
        JSON.stringify({
          before: null,
          after
        })
      ]
    );

    return inserted.rows[0].id;
  });
}

export async function updateGift(giftId: string, input: unknown, actor: Actor) {
  const values = giftInputSchema.parse(input);

  await transaction(async (client) => {
    const before = await giftAuditSnapshot(client, Number(giftId));

    await client.query(
      `update public.gifts
       set donor_id = $2,
           fund_id = $3,
           campaign_id = $4,
           gift_type = $5,
           amount_cents = $6,
           gift_date = $7,
           payment_method = $8,
           reference_number = $9,
           notes = $10,
           updated_by = $11
       where id = $1`,
      [
        Number(giftId),
        values.donorId,
        values.fundId,
        values.campaignId ?? null,
        values.giftType,
        Math.round(values.amount * 100),
        values.giftDate,
        values.paymentMethod ?? null,
        values.referenceNumber ?? null,
        values.notes ?? null,
        actor.userId
      ]
    );

    await syncSoftCredits(client, {
      giftId,
      donorId: values.donorId,
      amountCents: Math.round(values.amount * 100),
      manualSoftCreditDonorId: values.softCreditDonorId ?? null,
      actorUserId: actor.userId
    });

    const after = await giftAuditSnapshot(client, Number(giftId));

    await client.query(
      `insert into public.audit_log (actor_user_id, action, entity_type, entity_id, status, ip_address, metadata)
       values ($1, 'gift.update', 'gift', $2, 'success', $3, $4::jsonb)`,
      [
        actor.userId,
        giftId,
        actor.ipAddress ?? null,
        JSON.stringify({
          before,
          after
        })
      ]
    );
  });
}
