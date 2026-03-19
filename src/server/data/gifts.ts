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
  appeal_name: string | null;
  parent_pledge_gift_id: string | null;
};

export type GiftDetailRow = {
  id: string;
  gift_number: string | null;
  donor_id: string;
  fund_id: string;
  campaign_id: string | null;
  appeal_id: string | null;
  soft_credit_donor_id: string | null;
  parent_pledge_gift_id: string | null;
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
  pledge_start_date: string | null;
  expected_fulfillment_date: string | null;
  installment_count: number | null;
  installment_frequency: "MONTHLY" | "QUARTERLY" | "ANNUAL" | "CUSTOM" | null;
  pledge_status: "ACTIVE" | "PARTIALLY_PAID" | "FULFILLED" | "WRITTEN_OFF" | "CANCELLED" | null;
  balance_remaining_cents: number | null;
  payment_method: "ACH" | "CARD" | "CHECK" | "CASH" | "WIRE" | "OTHER" | null;
  receipt_amount_cents: number | null;
  fair_market_value_cents: number | null;
  check_date: string | null;
  reference_number: string | null;
  notes: string | null;
};

export type PledgeOptionRow = {
  id: string;
  gift_number: string | null;
  donor_id: string;
  donor_name: string;
  gift_type: "PLEDGE" | "MATCHING_GIFT_PLEDGE";
  gift_date: string;
  amount_cents: number;
  balance_remaining_cents: number;
  pledge_status: "ACTIVE" | "PARTIALLY_PAID" | "FULFILLED" | "WRITTEN_OFF" | "CANCELLED";
};

export type InstallmentRow = {
  id: string;
  installment_number: number;
  due_date: string;
  amount_cents: number;
};

async function giftAuditSnapshot(client: PoolClient, giftId: number) {
  const result = await client.query<{ snapshot: Record<string, unknown> | null }>(
    `select jsonb_build_object(
      'id', g.id,
      'gift_number', g.gift_number,
      'donor_id', g.donor_id,
      'fund_id', g.fund_id,
      'campaign_id', g.campaign_id,
      'appeal_id', g.appeal_id,
      'parent_pledge_gift_id', g.parent_pledge_gift_id,
      'gift_type', g.gift_type,
      'amount_cents', g.amount_cents,
      'gift_date', g.gift_date,
      'pledge_start_date', g.pledge_start_date,
      'expected_fulfillment_date', g.expected_fulfillment_date,
      'installment_count', g.installment_count,
      'installment_frequency', g.installment_frequency,
      'pledge_status', g.pledge_status,
      'payment_method', g.payment_method,
      'receipt_amount_cents', g.receipt_amount_cents,
      'fair_market_value_cents', g.fair_market_value_cents,
      'check_date', g.check_date,
      'reference_number', g.reference_number,
      'notes', g.notes,
      'deleted_at', g.deleted_at,
      'installments',
        coalesce((
          select jsonb_agg(
            jsonb_build_object(
              'installment_number', pi.installment_number,
              'due_date', pi.due_date,
              'amount_cents', pi.amount_cents
            )
            order by pi.installment_number
          )
          from public.pledge_installments pi
          where pi.pledge_gift_id = g.id
        ), '[]'::jsonb),
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

function isPledgeType(giftType: GiftDetailRow["gift_type"] | ReturnType<typeof giftInputSchema.parse>["giftType"]) {
  return giftType === "PLEDGE" || giftType === "MATCHING_GIFT_PLEDGE";
}

function isPaymentType(giftType: GiftDetailRow["gift_type"] | ReturnType<typeof giftInputSchema.parse>["giftType"]) {
  return giftType === "PLEDGE_PAYMENT" || giftType === "MATCHING_GIFT_PAYMENT";
}

function computeDueDate(startDate: Date, frequency: "MONTHLY" | "QUARTERLY" | "ANNUAL" | "CUSTOM", index: number) {
  const dueDate = new Date(startDate);

  if (frequency === "MONTHLY") {
    dueDate.setMonth(dueDate.getMonth() + index);
  } else if (frequency === "QUARTERLY") {
    dueDate.setMonth(dueDate.getMonth() + index * 3);
  } else if (frequency === "ANNUAL") {
    dueDate.setFullYear(dueDate.getFullYear() + index);
  } else {
    dueDate.setMonth(dueDate.getMonth() + index);
  }

  return dueDate.toISOString().slice(0, 10);
}

async function syncPledgeInstallments(
  client: PoolClient,
  input: {
    giftId: string;
    giftType: GiftDetailRow["gift_type"];
    amountCents: number;
    pledgeStartDate?: string | null;
    installmentCount?: number | null;
    installmentFrequency?: "MONTHLY" | "QUARTERLY" | "ANNUAL" | "CUSTOM" | null;
    installmentSchedule?: Array<{ dueDate: string; amount: number }> | null;
    actorUserId: string;
  }
) {
  await client.query(`delete from public.pledge_installments where pledge_gift_id = $1`, [Number(input.giftId)]);

  if (!isPledgeType(input.giftType)) {
    return;
  }

  if (input.installmentSchedule?.length) {
    for (const [index, row] of input.installmentSchedule.entries()) {
      await client.query(
        `insert into public.pledge_installments (
          pledge_gift_id,
          installment_number,
          due_date,
          amount_cents,
          created_by,
          updated_by
        ) values ($1, $2, $3, $4, $5, $5)`,
        [Number(input.giftId), index + 1, row.dueDate, Math.round(row.amount * 100), input.actorUserId]
      );
    }

    return;
  }

  if (!input.installmentCount || input.installmentCount < 1) {
    return;
  }

  const startDate = new Date(input.pledgeStartDate ?? new Date().toISOString().slice(0, 10));
  const baseAmount = Math.floor(input.amountCents / input.installmentCount);
  let remainder = input.amountCents - baseAmount * input.installmentCount;

  for (let index = 0; index < input.installmentCount; index += 1) {
    const amountCents = baseAmount + (remainder > 0 ? 1 : 0);
    remainder = Math.max(0, remainder - 1);

    await client.query(
      `insert into public.pledge_installments (
        pledge_gift_id,
        installment_number,
        due_date,
        amount_cents,
        created_by,
        updated_by
      ) values ($1, $2, $3, $4, $5, $5)`,
      [
        Number(input.giftId),
        index + 1,
        computeDueDate(startDate, input.installmentFrequency ?? "CUSTOM", index),
        amountCents,
        input.actorUserId
      ]
    );
  }
}

async function validateParentPledge(
  client: PoolClient,
  input: {
    donorId: number;
    giftType: GiftDetailRow["gift_type"];
    parentPledgeGiftId?: number | null;
  }
) {
  if (!isPaymentType(input.giftType)) {
    return null;
  }

  if (!input.parentPledgeGiftId) {
    throw new Error("Payment gifts must link to a parent pledge.");
  }

  const result = await client.query<{
    id: string;
    donor_id: string;
    gift_type: "PLEDGE" | "MATCHING_GIFT_PLEDGE";
  }>(
    `select id::text, donor_id::text, gift_type
     from public.gifts
     where id = $1
       and deleted_at is null`,
    [input.parentPledgeGiftId]
  );

  const parent = result.rows[0];

  if (!parent) {
    throw new Error("Parent pledge not found.");
  }

  if (input.giftType === "PLEDGE_PAYMENT" && parent.gift_type !== "PLEDGE") {
    throw new Error("Pledge payments must link to a parent Pledge.");
  }

  if (input.giftType === "MATCHING_GIFT_PAYMENT" && parent.gift_type !== "MATCHING_GIFT_PLEDGE") {
    throw new Error("Matching Gift Payments must link to a parent Matching Gift Pledge.");
  }

  if (Number(parent.donor_id) !== input.donorId) {
    throw new Error("Parent pledge donor must match the payment donor.");
  }

  return Number(parent.id);
}

async function refreshPledgeStatus(client: PoolClient, pledgeGiftId: number) {
  const result = await client.query<{
    gift_type: "PLEDGE" | "MATCHING_GIFT_PLEDGE";
    amount_cents: number;
    current_status: "ACTIVE" | "PARTIALLY_PAID" | "FULFILLED" | "WRITTEN_OFF" | "CANCELLED" | null;
    paid_cents: number;
  }>(
    `select
      g.gift_type,
      g.amount_cents,
      g.pledge_status as current_status,
      coalesce(sum(p.amount_cents), 0)::int as paid_cents
     from public.gifts g
     left join public.gifts p
       on p.parent_pledge_gift_id = g.id
      and p.deleted_at is null
      and (
        (g.gift_type = 'PLEDGE' and p.gift_type = 'PLEDGE_PAYMENT')
        or
        (g.gift_type = 'MATCHING_GIFT_PLEDGE' and p.gift_type = 'MATCHING_GIFT_PAYMENT')
      )
     where g.id = $1
     group by g.id`,
    [pledgeGiftId]
  );

  const pledge = result.rows[0];

  if (!pledge) {
    return;
  }

  let nextStatus: "ACTIVE" | "PARTIALLY_PAID" | "FULFILLED" | "WRITTEN_OFF" | "CANCELLED" =
    pledge.current_status === "WRITTEN_OFF" || pledge.current_status === "CANCELLED"
      ? pledge.current_status
      : "ACTIVE";

  if (nextStatus !== "WRITTEN_OFF" && nextStatus !== "CANCELLED") {
    if (pledge.paid_cents <= 0) {
      nextStatus = "ACTIVE";
    } else if (pledge.paid_cents < pledge.amount_cents) {
      nextStatus = "PARTIALLY_PAID";
    } else {
      nextStatus = "FULFILLED";
    }
  }

  await client.query(
    `update public.gifts
     set pledge_status = $2
     where id = $1`,
    [pledgeGiftId, nextStatus]
  );
}

export async function listPledgeOptions(donorId?: string): Promise<PledgeOptionRow[]> {
  const result = await query<PledgeOptionRow>(
    `select
      g.id::text,
      g.gift_number,
      g.donor_id::text,
      coalesce(d.organization_name, concat_ws(' ', d.first_name, d.last_name)) as donor_name,
      g.gift_type,
      g.gift_date::text,
      g.amount_cents,
      coalesce(g.amount_cents - sum(
        case
          when g.gift_type = 'PLEDGE' and p.gift_type = 'PLEDGE_PAYMENT' then p.amount_cents
          when g.gift_type = 'MATCHING_GIFT_PLEDGE' and p.gift_type = 'MATCHING_GIFT_PAYMENT' then p.amount_cents
          else 0
        end
      ), g.amount_cents)::int as balance_remaining_cents,
      coalesce(g.pledge_status, 'ACTIVE') as pledge_status
     from public.gifts g
     inner join public.donors d on d.id = g.donor_id
     left join public.gifts p on p.parent_pledge_gift_id = g.id and p.deleted_at is null
     where g.deleted_at is null
       and g.gift_type in ('PLEDGE', 'MATCHING_GIFT_PLEDGE')
       and ($1::bigint is null or g.donor_id = $1)
     group by g.id, d.id
     order by g.gift_date desc, g.created_at desc`,
    [donorId ? Number(donorId) : null]
  );

  return result.rows;
}

export async function listPledgeInstallments(giftId: string): Promise<InstallmentRow[]> {
  const result = await query<InstallmentRow>(
    `select
      id::text,
      installment_number,
      due_date::text,
      amount_cents
     from public.pledge_installments
     where pledge_gift_id = $1
     order by installment_number asc`,
    [Number(giftId)]
  );

  return result.rows;
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
      g.donor_id::text,
      coalesce(d.organization_name, concat_ws(' ', d.first_name, d.last_name)) as donor_name,
      g.gift_type,
      g.amount_cents,
      g.gift_date::text,
      f.name as fund_name,
      c.name as campaign_name,
      a.name as appeal_name
    from public.gifts g
    inner join public.donors d on d.id = g.donor_id
    inner join public.funds f on f.id = g.fund_id
    left join public.campaigns c on c.id = g.campaign_id
    left join public.appeals a on a.id = g.appeal_id
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
      g.appeal_id::text,
      sc.donor_id::text as soft_credit_donor_id,
      g.parent_pledge_gift_id::text,
      g.gift_type,
      g.amount_cents,
      g.gift_date::text,
      g.pledge_start_date::text,
      g.expected_fulfillment_date::text,
      g.installment_count,
      g.installment_frequency,
      case
        when g.gift_type in ('PLEDGE', 'MATCHING_GIFT_PLEDGE') then
          coalesce(g.pledge_status, 'ACTIVE')
        else null
      end as pledge_status,
      case
        when g.gift_type in ('PLEDGE', 'MATCHING_GIFT_PLEDGE') then
          g.amount_cents - coalesce((
            select sum(p.amount_cents)
            from public.gifts p
            where p.parent_pledge_gift_id = g.id
              and p.deleted_at is null
              and (
                (g.gift_type = 'PLEDGE' and p.gift_type = 'PLEDGE_PAYMENT')
                or
                (g.gift_type = 'MATCHING_GIFT_PLEDGE' and p.gift_type = 'MATCHING_GIFT_PAYMENT')
              )
          ), 0)
        else null
      end::int as balance_remaining_cents,
      g.payment_method,
      g.receipt_amount_cents,
      g.fair_market_value_cents,
      g.check_date::text,
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
    const amountCents = Math.round(values.amount * 100);
    const parentPledgeGiftId = await validateParentPledge(client, {
      donorId: values.donorId,
      giftType: values.giftType,
      parentPledgeGiftId: values.parentPledgeGiftId ?? null
    });

    const inserted = await client.query<{ id: string }>(
      `insert into public.gifts (
        donor_id,
        fund_id,
        campaign_id,
        appeal_id,
        parent_pledge_gift_id,
        gift_type,
        amount_cents,
        gift_date,
        pledge_start_date,
        expected_fulfillment_date,
        installment_count,
        installment_frequency,
        pledge_status,
        payment_method,
        receipt_amount_cents,
        fair_market_value_cents,
        check_date,
        reference_number,
        notes,
        created_by,
        updated_by
      ) values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $20)
      returning id::text`,
      [
        values.donorId,
        values.fundId,
        values.campaignId ?? null,
        values.appealId ?? null,
        parentPledgeGiftId,
        values.giftType,
        amountCents,
        values.giftDate,
        isPledgeType(values.giftType) ? values.pledgeStartDate ?? values.giftDate : null,
        isPledgeType(values.giftType) ? values.expectedFulfillmentDate ?? null : null,
        isPledgeType(values.giftType) ? values.installmentSchedule?.length ?? values.installmentCount ?? null : null,
        isPledgeType(values.giftType) ? values.installmentFrequency ?? null : null,
        isPledgeType(values.giftType) ? "ACTIVE" : null,
        values.paymentMethod ?? null,
        Math.round((values.receiptAmount ?? values.amount) * 100),
        values.giftType === "GIFT_IN_KIND" ? Math.round((values.fairMarketValue ?? values.amount) * 100) : null,
        values.paymentMethod === "CHECK" ? values.checkDate ?? values.giftDate : null,
        values.referenceNumber ?? null,
        values.notes ?? null,
        actor.userId
      ]
    );

    await syncPledgeInstallments(client, {
      giftId: inserted.rows[0].id,
      giftType: values.giftType,
      amountCents,
      pledgeStartDate: values.pledgeStartDate ?? values.giftDate,
      installmentCount: values.installmentCount ?? null,
      installmentFrequency: values.installmentFrequency ?? null,
      installmentSchedule: values.installmentSchedule ?? null,
      actorUserId: actor.userId
    });

    await syncSoftCredits(client, {
      giftId: inserted.rows[0].id,
      donorId: values.donorId,
      amountCents,
      manualSoftCreditDonorId: values.softCreditDonorId ?? null,
      actorUserId: actor.userId
    });

    if (parentPledgeGiftId) {
      await refreshPledgeStatus(client, parentPledgeGiftId);
    }

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
    const previousParentPledgeGiftId = before?.parent_pledge_gift_id;
    const nextParentPledgeGiftId = await validateParentPledge(client, {
      donorId: values.donorId,
      giftType: values.giftType,
      parentPledgeGiftId: values.parentPledgeGiftId ?? null
    });

    await client.query(
      `update public.gifts
       set donor_id = $2,
           fund_id = $3,
           campaign_id = $4,
           appeal_id = $5,
           parent_pledge_gift_id = $6,
           gift_type = $7::varchar(30),
           amount_cents = $8,
           gift_date = $9,
           pledge_start_date = $10,
           expected_fulfillment_date = $11,
           installment_count = $12,
           installment_frequency = $13,
           pledge_status = case
             when $7::text in ('PLEDGE', 'MATCHING_GIFT_PLEDGE') and pledge_status in ('WRITTEN_OFF', 'CANCELLED') then pledge_status
             when $7::text in ('PLEDGE', 'MATCHING_GIFT_PLEDGE') then coalesce(pledge_status, 'ACTIVE')
             else null
           end,
           payment_method = $14,
           receipt_amount_cents = $15,
           fair_market_value_cents = $16,
           check_date = $17,
           reference_number = $18,
           notes = $19,
           updated_by = $20
       where id = $1`,
      [
        Number(giftId),
        values.donorId,
        values.fundId,
        values.campaignId ?? null,
        values.appealId ?? null,
        nextParentPledgeGiftId,
        values.giftType,
        Math.round(values.amount * 100),
        values.giftDate,
        isPledgeType(values.giftType) ? values.pledgeStartDate ?? values.giftDate : null,
        isPledgeType(values.giftType) ? values.expectedFulfillmentDate ?? null : null,
        isPledgeType(values.giftType) ? values.installmentSchedule?.length ?? values.installmentCount ?? null : null,
        isPledgeType(values.giftType) ? values.installmentFrequency ?? null : null,
        values.paymentMethod ?? null,
        Math.round((values.receiptAmount ?? values.amount) * 100),
        values.giftType === "GIFT_IN_KIND" ? Math.round((values.fairMarketValue ?? values.amount) * 100) : null,
        values.paymentMethod === "CHECK" ? values.checkDate ?? values.giftDate : null,
        values.referenceNumber ?? null,
        values.notes ?? null,
        actor.userId
      ]
    );

    await syncPledgeInstallments(client, {
      giftId,
      giftType: values.giftType,
      amountCents: Math.round(values.amount * 100),
      pledgeStartDate: values.pledgeStartDate ?? values.giftDate,
      installmentCount: values.installmentCount ?? null,
      installmentFrequency: values.installmentFrequency ?? null,
      installmentSchedule: values.installmentSchedule ?? null,
      actorUserId: actor.userId
    });

    await syncSoftCredits(client, {
      giftId,
      donorId: values.donorId,
      amountCents: Math.round(values.amount * 100),
      manualSoftCreditDonorId: values.softCreditDonorId ?? null,
      actorUserId: actor.userId
    });

    if (previousParentPledgeGiftId) {
      await refreshPledgeStatus(client, Number(previousParentPledgeGiftId));
    }

    if (nextParentPledgeGiftId) {
      await refreshPledgeStatus(client, nextParentPledgeGiftId);
    }

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
