import { query, transaction } from "@/server/db";
import { writeAuditLog } from "@/server/audit";
import { donorInputSchema } from "@/server/validation/donors";
import type { PoolClient } from "pg";

type Actor = { userId: string; ipAddress?: string | null };

export type DonorListRow = {
  id: string;
  donor_number: string | null;
  donor_type: "INDIVIDUAL" | "ORGANIZATION";
  full_name: string;
  first_name: string | null;
  last_name: string | null;
  organization_name: string | null;
  primary_email: string | null;
  donor_recognition_cents: string;
  donor_hard_credit_cents: string;
  donor_soft_credit_cents: string;
};

export type DonorConnectionRow = {
  id: string;
  donor_number: string | null;
  donor_type: "INDIVIDUAL" | "ORGANIZATION";
  display_name: string;
};

export type DonorProfileRow = {
  id: string;
  donor_number: string | null;
  donor_type: "INDIVIDUAL" | "ORGANIZATION";
  title: string | null;
  first_name: string | null;
  middle_name: string | null;
  last_name: string | null;
  preferred_name: string | null;
  full_name: string;
  organization_name: string | null;
  organization_contact_donor_id: string | null;
  organization_contact_name: string | null;
  spouse_donor_id: string | null;
  spouse_name: string | null;
  primary_email: string | null;
  primary_email_type: string | null;
  alternate_email: string | null;
  alternate_email_type: string | null;
  primary_phone: string | null;
  giving_level: string | null;
  notes: string | null;
  address_id: string | null;
  address_type: string | null;
  street1: string | null;
  street2: string | null;
  city: string | null;
  state_region: string | null;
  postal_code: string | null;
  country: string | null;
  donor_recognition_cents: string;
  donor_hard_credit_cents: string;
  donor_soft_credit_cents: string;
};

export type DonorAddressRow = {
  id: string;
  address_type: string;
  street1: string;
  street2: string | null;
  city: string;
  state_region: string | null;
  postal_code: string | null;
  country: string;
  is_primary: boolean;
};

export type DonorGiftRow = {
  id: string;
  gift_number: string | null;
  gift_type:
    | "PLEDGE"
    | "PLEDGE_PAYMENT"
    | "CASH"
    | "STOCK_PROPERTY"
    | "GIFT_IN_KIND"
    | "MATCHING_GIFT_PLEDGE"
    | "MATCHING_GIFT_PAYMENT";
  gift_date: string;
  amount_cents: number;
  fund_name: string;
  campaign_name: string | null;
  payment_method: string | null;
  reference_number: string | null;
};

export type DonorSoftCreditRow = {
  soft_credit_id: string;
  gift_id: string;
  gift_number: string | null;
  credit_type: "MANUAL" | "AUTO_SPOUSE";
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
  legal_donor_name: string;
  fund_name: string;
  campaign_name: string | null;
};

const donorFullNameSql = `
  case
    when d.donor_type = 'ORGANIZATION' then coalesce(d.organization_name, 'Unnamed organization')
    else trim(
      concat_ws(
        ' ',
        coalesce(nullif(d.preferred_name, ''), nullif(d.first_name, '')),
        case
          when d.middle_name is not null and d.middle_name <> '' then left(d.middle_name, 1) || '.'
          else null
        end,
        d.last_name
      )
    )
  end
`;

const linkedDonorNameSql = (alias: string) => `
  case
    when ${alias}.donor_type = 'ORGANIZATION' then coalesce(${alias}.organization_name, 'Unnamed organization')
    else trim(
      concat_ws(
        ' ',
        coalesce(nullif(${alias}.preferred_name, ''), nullif(${alias}.first_name, '')),
        case
          when ${alias}.middle_name is not null and ${alias}.middle_name <> '' then left(${alias}.middle_name, 1) || '.'
          else null
        end,
        ${alias}.last_name
      )
    )
  end
`;

async function donorAuditSnapshot(client: PoolClient, donorId: number) {
  const result = await client.query<{ snapshot: Record<string, unknown> | null }>(
    `select jsonb_build_object(
      'id', d.id,
      'donor_number', d.donor_number,
      'donor_type', d.donor_type,
      'title', d.title,
      'first_name', d.first_name,
      'middle_name', d.middle_name,
      'last_name', d.last_name,
      'preferred_name', d.preferred_name,
      'organization_name', d.organization_name,
      'organization_contact_donor_id', d.organization_contact_donor_id,
      'organization_contact_name', d.organization_contact_name,
      'primary_email', d.primary_email,
      'primary_email_type', d.primary_email_type,
      'alternate_email', d.alternate_email,
      'alternate_email_type', d.alternate_email_type,
      'primary_phone', d.primary_phone,
      'spouse_donor_id', d.spouse_donor_id,
      'giving_level', d.giving_level,
      'notes', d.notes,
      'deleted_at', d.deleted_at,
      'primary_address',
        case
          when a.id is null then null
          else jsonb_build_object(
            'id', a.id,
            'address_type', a.address_type,
            'street1', a.street1,
            'street2', a.street2,
            'city', a.city,
            'state_region', a.state_region,
            'postal_code', a.postal_code,
            'country', a.country,
            'is_primary', a.is_primary
          )
        end
    ) as snapshot
    from public.donors d
    left join public.donor_addresses a on a.donor_id = d.id and a.is_primary = true
    where d.id = $1`,
    [donorId]
  );

  return result.rows[0]?.snapshot ?? null;
}

export async function listDonors(search?: string): Promise<DonorListRow[]> {
  const result = await query<DonorListRow>(
    `select
      d.id::text,
      d.donor_number,
      d.donor_type,
      ${donorFullNameSql} as full_name,
      d.first_name,
      d.last_name,
      d.organization_name,
      d.primary_email,
      coalesce(t.donor_recognition_cents, 0)::text as donor_recognition_cents,
      coalesce(t.donor_hard_credit_cents, 0)::text as donor_hard_credit_cents,
      coalesce(t.donor_soft_credit_cents, 0)::text as donor_soft_credit_cents
    from public.donors d
    left join public.donor_giving_totals t on t.donor_id = d.id
    where d.deleted_at is null
      and (
        $1::text is null
        or concat_ws(' ', d.first_name, d.last_name, d.preferred_name, d.organization_name, d.donor_number) ilike '%' || $1 || '%'
      )
    order by d.last_name nulls last, d.organization_name nulls last
    limit 100`,
    [search ?? null]
  );

  return result.rows;
}

export async function listDonorConnections(currentDonorId?: string): Promise<DonorConnectionRow[]> {
  const result = await query<DonorConnectionRow>(
    `select
      d.id::text,
      d.donor_number,
      d.donor_type,
      ${donorFullNameSql} as display_name
    from public.donors d
    where d.deleted_at is null
      and ($1::bigint is null or d.id <> $1)
    order by display_name asc
    limit 300`,
    [currentDonorId ? Number(currentDonorId) : null]
  );

  return result.rows;
}

export async function getDonorProfile(donorId: string): Promise<DonorProfileRow | null> {
  const result = await query<DonorProfileRow>(
    `select
      d.id::text,
      d.donor_number,
      d.donor_type,
      d.title,
      d.first_name,
      d.middle_name,
      d.last_name,
      d.preferred_name,
      ${donorFullNameSql} as full_name,
      d.organization_name,
      d.organization_contact_donor_id::text,
      d.organization_contact_name,
      d.spouse_donor_id::text,
      ${linkedDonorNameSql("sp")} as spouse_name,
      d.primary_email,
      d.primary_email_type,
      d.alternate_email,
      d.alternate_email_type,
      d.primary_phone,
      d.giving_level,
      d.notes,
      a.id::text as address_id,
      a.address_type,
      a.street1,
      a.street2,
      a.city,
      a.state_region,
      a.postal_code,
      a.country,
      coalesce(t.donor_recognition_cents, 0)::text as donor_recognition_cents,
      coalesce(t.donor_hard_credit_cents, 0)::text as donor_hard_credit_cents,
      coalesce(t.donor_soft_credit_cents, 0)::text as donor_soft_credit_cents
    from public.donors d
    left join public.donors sp on sp.id = d.spouse_donor_id
    left join public.donor_addresses a on a.donor_id = d.id and a.is_primary = true
    left join public.donor_giving_totals t on t.donor_id = d.id
    where d.id = $1
      and d.deleted_at is null
    group by d.id, sp.id, a.id, t.donor_recognition_cents, t.donor_hard_credit_cents, t.donor_soft_credit_cents`,
    [Number(donorId)]
  );

  return result.rows[0] ?? null;
}

export async function listDonorGiving(donorId: string): Promise<DonorGiftRow[]> {
  const result = await query<DonorGiftRow>(
    `select
      g.id::text,
      g.gift_number,
      g.gift_type,
      g.gift_date::text,
      g.amount_cents,
      f.name as fund_name,
      c.name as campaign_name,
      g.payment_method,
      g.reference_number
    from public.gifts g
    inner join public.funds f on f.id = g.fund_id
    left join public.campaigns c on c.id = g.campaign_id
    where g.donor_id = $1
      and g.deleted_at is null
    order by g.gift_date desc, g.created_at desc`,
    [Number(donorId)]
  );

  return result.rows;
}

export async function listDonorSoftCredits(donorId: string): Promise<DonorSoftCreditRow[]> {
  const result = await query<DonorSoftCreditRow>(
    `select
      sc.id::text as soft_credit_id,
      g.id::text as gift_id,
      g.gift_number,
      sc.credit_type,
      g.gift_type,
      sc.amount_cents,
      g.gift_date::text,
      case
        when d.donor_type = 'ORGANIZATION' then coalesce(d.organization_name, 'Unnamed organization')
        else trim(
          concat_ws(
            ' ',
            coalesce(nullif(d.preferred_name, ''), nullif(d.first_name, '')),
            case
              when d.middle_name is not null and d.middle_name <> '' then left(d.middle_name, 1) || '.'
              else null
            end,
            d.last_name
          )
        )
      end as legal_donor_name,
      f.name as fund_name,
      c.name as campaign_name
    from public.soft_credits sc
    inner join public.gifts g on g.id = sc.gift_id and g.deleted_at is null
    inner join public.donors d on d.id = g.donor_id
    inner join public.funds f on f.id = g.fund_id
    left join public.campaigns c on c.id = g.campaign_id
    where sc.donor_id = $1
    order by g.gift_date desc, g.created_at desc`,
    [Number(donorId)]
  );

  return result.rows;
}

export async function listDonorAddresses(donorId: string): Promise<DonorAddressRow[]> {
  const result = await query<DonorAddressRow>(
    `select
      id::text,
      address_type,
      street1,
      street2,
      city,
      state_region,
      postal_code,
      country,
      is_primary
    from public.donor_addresses
    where donor_id = $1
    order by is_primary desc, address_type asc, id asc`,
    [Number(donorId)]
  );

  return result.rows;
}

export async function createDonor(input: unknown, actor: Actor) {
  const values = donorInputSchema.parse(input);

  return transaction(async (client) => {
    const inserted = await client.query<{ id: string }>(
      `insert into public.donors (
        donor_type,
        title,
        first_name,
        middle_name,
        last_name,
        preferred_name,
        organization_name,
        organization_contact_donor_id,
        organization_contact_name,
        primary_email,
        primary_email_type,
        alternate_email,
        alternate_email_type,
        primary_phone,
        spouse_donor_id,
        giving_level,
        notes,
        created_by,
        updated_by
      ) values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $18)
      returning id::text`,
      [
        values.donorType,
        values.title ?? null,
        values.firstName ?? null,
        values.middleName ?? null,
        values.lastName ?? null,
        values.preferredName ?? null,
        values.organizationName ?? null,
        values.organizationContactDonorId ?? null,
        values.organizationContactName ?? null,
        values.primaryEmail ?? null,
        values.primaryEmailType ?? null,
        values.alternateEmail ?? null,
        values.alternateEmailType ?? null,
        values.primaryPhone ?? null,
        values.spouseDonorId ?? null,
        values.givingLevel ?? null,
        values.notes ?? null,
        actor.userId
      ]
    );

    const donorId = inserted.rows[0].id;

    if (values.street1 && values.city) {
      await client.query(
        `insert into public.donor_addresses (
          donor_id,
          address_type,
          street1,
          street2,
          city,
          state_region,
          postal_code,
          country,
          is_primary,
          created_by,
          updated_by
        ) values ($1, $2, $3, $4, $5, $6, $7, $8, true, $9, $9)`,
        [
          donorId,
          values.addressType ?? "Primary",
          values.street1,
          values.street2 ?? null,
          values.city,
          values.stateRegion ?? null,
          values.postalCode ?? null,
          values.country ?? "United States",
          actor.userId
        ]
      );
    }

    const after = await donorAuditSnapshot(client, Number(donorId));

    await client.query(
      `insert into public.audit_log (actor_user_id, action, entity_type, entity_id, status, ip_address, metadata)
       values ($1, 'donor.create', 'donor', $2, 'success', $3, $4::jsonb)`,
      [
        actor.userId,
        donorId,
        actor.ipAddress ?? null,
        JSON.stringify({
          donorType: values.donorType,
          before: null,
          after
        })
      ]
    );

    return donorId;
  });
}

export async function updateDonorProfile(donorId: string, input: unknown, actor: Actor) {
  const values = donorInputSchema.parse(input);

  await transaction(async (client) => {
    const before = await donorAuditSnapshot(client, Number(donorId));

    await client.query(
      `update public.donors
       set donor_type = $2,
           title = $3,
           first_name = $4,
           middle_name = $5,
           last_name = $6,
           preferred_name = $7,
           organization_name = $8,
           organization_contact_donor_id = $9,
           organization_contact_name = $10,
           primary_email = $11,
           primary_email_type = $12,
           alternate_email = $13,
           alternate_email_type = $14,
           primary_phone = $15,
           spouse_donor_id = $16,
           giving_level = $17,
           notes = $18,
           updated_by = $19
       where id = $1`,
      [
        Number(donorId),
        values.donorType,
        values.title ?? null,
        values.firstName ?? null,
        values.middleName ?? null,
        values.lastName ?? null,
        values.preferredName ?? null,
        values.organizationName ?? null,
        values.organizationContactDonorId ?? null,
        values.organizationContactName ?? null,
        values.primaryEmail ?? null,
        values.primaryEmailType ?? null,
        values.alternateEmail ?? null,
        values.alternateEmailType ?? null,
        values.primaryPhone ?? null,
        values.spouseDonorId ?? null,
        values.givingLevel ?? null,
        values.notes ?? null,
        actor.userId
      ]
    );

    if (values.street1 && values.city) {
      const existingPrimary = await client.query<{ id: string }>(
        `select id::text
         from public.donor_addresses
         where donor_id = $1
           and is_primary = true
         limit 1`,
        [Number(donorId)]
      );

      if (existingPrimary.rows[0]) {
        await client.query(
          `update public.donor_addresses
           set address_type = $2,
               street1 = $3,
               street2 = $4,
               city = $5,
               state_region = $6,
               postal_code = $7,
               country = $8,
               updated_by = $9
           where id = $1`,
          [
            Number(existingPrimary.rows[0].id),
            values.addressType ?? "Primary",
            values.street1,
            values.street2 ?? null,
            values.city,
            values.stateRegion ?? null,
            values.postalCode ?? null,
            values.country ?? "United States",
            actor.userId
          ]
        );
      } else {
        await client.query(
          `insert into public.donor_addresses (
            donor_id,
            address_type,
            street1,
            street2,
            city,
            state_region,
            postal_code,
            country,
            is_primary,
            created_by,
            updated_by
          ) values ($1, $2, $3, $4, $5, $6, $7, $8, true, $9, $9)`,
          [
            Number(donorId),
            values.addressType ?? "Primary",
            values.street1,
            values.street2 ?? null,
            values.city,
            values.stateRegion ?? null,
            values.postalCode ?? null,
            values.country ?? "United States",
            actor.userId
          ]
        );
      }
    }

    const after = await donorAuditSnapshot(client, Number(donorId));

    await client.query(
      `insert into public.audit_log (actor_user_id, action, entity_type, entity_id, status, ip_address, metadata)
       values ($1, 'donor.update', 'donor', $2, 'success', $3, $4::jsonb)`,
      [
        actor.userId,
        donorId,
        actor.ipAddress ?? null,
        JSON.stringify({
          donorType: values.donorType,
          before,
          after
        })
      ]
    );
  });
}

export async function addDonorAddress(
  donorId: string,
  input: {
    addressType?: string | null;
    street1?: string | null;
    street2?: string | null;
    city?: string | null;
    stateRegion?: string | null;
    postalCode?: string | null;
    country?: string | null;
    isPrimary?: boolean;
  },
  actor: Actor
) {
  await transaction(async (client) => {
    const before = await donorAuditSnapshot(client, Number(donorId));

    if (input.isPrimary) {
      await client.query(
        `update public.donor_addresses
         set is_primary = false,
             updated_by = $2
         where donor_id = $1`,
        [Number(donorId), actor.userId]
      );
    }

    await client.query(
      `insert into public.donor_addresses (
        donor_id,
        address_type,
        street1,
        street2,
        city,
        state_region,
        postal_code,
        country,
        is_primary,
        created_by,
        updated_by
      ) values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $10)`,
      [
        Number(donorId),
        input.addressType ?? "Alternative",
        input.street1 ?? "",
        input.street2 ?? null,
        input.city ?? "",
        input.stateRegion ?? null,
        input.postalCode ?? null,
        input.country ?? "United States",
        input.isPrimary ?? false,
        actor.userId
      ]
    );

    await client.query(
      `insert into public.audit_log (actor_user_id, action, entity_type, entity_id, status, ip_address, metadata)
       values ($1, 'donor.address.create', 'donor', $2, 'success', $3, $4::jsonb)`,
      [
        actor.userId,
        donorId,
        actor.ipAddress ?? null,
        JSON.stringify({
          before,
          after: await donorAuditSnapshot(client, Number(donorId))
        })
      ]
    );
  });
}

export async function softDeleteDonor(donorId: string, actor: Actor) {
  const before = await query<{ snapshot: Record<string, unknown> | null }>(
    `select jsonb_build_object(
      'id', d.id,
      'donor_number', d.donor_number,
      'full_name', ${donorFullNameSql},
      'deleted_at', d.deleted_at
    ) as snapshot
    from public.donors d
    where d.id = $1`,
    [Number(donorId)]
  );

  await query(
    `update public.donors
     set deleted_at = now(),
         updated_at = now(),
         updated_by = $2
     where id = $1 and deleted_at is null`,
    [donorId, actor.userId]
  );

  await writeAuditLog({
    actorUserId: actor.userId,
    action: "donor.delete",
    entityType: "donor",
    entityId: donorId,
    status: "success",
    ipAddress: actor.ipAddress ?? null,
    metadata: {
      before: before.rows[0]?.snapshot ?? null,
      after: {
        deleted_at: "soft_deleted"
      }
    }
  });
}
