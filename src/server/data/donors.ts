import { query, transaction } from "@/server/db";
import { writeAuditLog } from "@/server/audit";
import { donorInputSchema } from "@/server/validation/donors";
import type { PoolClient } from "pg";

type Actor = { userId: string; ipAddress?: string | null };
type PromoteSpouseActor = Actor & { softCreditHistory?: boolean };
type OrganizationContactType =
  | "MAIN_CONTACT"
  | "ADDITIONAL_CONTACT"
  | "STEWARDSHIP_CONTACT"
  | "ACKNOWLEDGMENT_CONTACT";

async function allocateDonorNumber(client: PoolClient) {
  while (true) {
    const nextNumberResult = await client.query<{ donor_number: string }>(
      `select nextval('donor_number_seq')::text as donor_number`
    );
    const donorNumber = nextNumberResult.rows[0]?.donor_number;

    if (!donorNumber) {
      throw new Error("Unable to allocate donor number.");
    }

    const existing = await client.query<{ id: string }>(
      `select id::text
       from public.donors
       where donor_number = $1
       limit 1`,
      [donorNumber]
    );

    if (!existing.rows[0]) {
      return donorNumber;
    }
  }
}

type ParsedDonorInput = ReturnType<typeof donorInputSchema.parse>;

async function insertDonorRecord(
  client: PoolClient,
  values: ParsedDonorInput,
  actor: Actor,
  donorNumberOverride?: string | null
) {
  const donorNumber = donorNumberOverride?.trim() || (await allocateDonorNumber(client));

  if (donorNumberOverride?.trim()) {
    const existing = await client.query<{ id: string }>(
      `select id::text
       from public.donors
       where donor_number = $1
       limit 1`,
      [donorNumber]
    );

    if (existing.rows[0]) {
      throw new Error(`A constituent with ID ${donorNumber} already exists.`);
    }
  }

  const inserted = await client.query<{ id: string }>(
    `insert into public.donors (
      donor_number,
      donor_type,
      title,
      gender,
      first_name,
      middle_name,
      last_name,
      preferred_name,
      organization_name,
      organization_website,
      organization_email,
      organization_contact_donor_id,
      organization_contact_title,
      organization_contact_first_name,
      organization_contact_middle_name,
      organization_contact_last_name,
      organization_contact_name,
      organization_contact_email,
      organization_contact_phone,
      primary_email,
      primary_email_type,
      alternate_email,
      alternate_email_type,
      primary_phone,
      spouse_donor_id,
      spouse_gender,
      spouse_title,
      spouse_first_name,
      spouse_middle_name,
      spouse_last_name,
      spouse_preferred_email,
      spouse_alternate_email,
      spouse_primary_phone,
      spouse_same_address,
      notes,
      created_by,
      updated_by
    ) values (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19,
      $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34, $35, $36, $36
    )
    returning id::text`,
    [
      donorNumber,
      values.donorType,
      values.title ?? null,
      values.gender ?? null,
      values.firstName ?? null,
      values.middleName ?? null,
      values.lastName ?? null,
      values.preferredName ?? null,
      values.organizationName ?? null,
      values.organizationWebsite ?? null,
      values.organizationEmail ?? null,
      values.organizationContactDonorId ?? null,
      values.organizationContactTitle ?? null,
      values.organizationContactFirstName ?? null,
      values.organizationContactMiddleName ?? null,
      values.organizationContactLastName ?? null,
      values.organizationContactName ?? null,
      values.organizationContactEmail ?? null,
      values.organizationContactPhone ?? null,
      values.primaryEmail ?? null,
      values.primaryEmailType ?? null,
      values.alternateEmail ?? null,
      values.alternateEmailType ?? null,
      values.primaryPhone ?? null,
      values.spouseDonorId ?? null,
      values.spouseGender ?? null,
      values.spouseTitle ?? null,
      values.spouseFirstName ?? null,
      values.spouseMiddleName ?? null,
      values.spouseLastName ?? null,
      values.spousePreferredEmail ?? null,
      values.spouseAlternateEmail ?? null,
      values.spousePrimaryPhone ?? null,
      values.spouseSameAddress ?? false,
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
}

async function ensureOrganizationRelationshipLink(
  client: PoolClient,
  donorId: number,
  organizationDonorId: number,
  actor: Actor,
  relationshipType: "EMPLOYER" | "FOUNDATION" | "DONOR_ADVISED_FUND" | "OTHER" = "OTHER",
  notes?: string | null,
  options?: {
    role?: string | null;
    isContact?: boolean;
    contactType?: OrganizationContactType | null;
  }
) {
  const existing = await client.query<{ id: string }>(
    `select id::text
     from public.donor_organization_relationships
     where donor_id = $1
       and organization_donor_id = $2
     limit 1`,
    [donorId, organizationDonorId]
  );

  if (existing.rows[0]) {
    await client.query(
      `update public.donor_organization_relationships
       set relationship_type = $2,
           role = coalesce(role, $3),
           is_contact = coalesce($4, is_contact),
           contact_type = coalesce(contact_type, $5),
           notes = coalesce(notes, $6),
           updated_by = $7
       where id = $1`,
      [
        Number(existing.rows[0].id),
        relationshipType,
        options?.role ?? null,
        options?.isContact ?? null,
        options?.contactType ?? null,
        notes ?? null,
        actor.userId
      ]
    );
    return;
  }

  await client.query(
    `insert into public.donor_organization_relationships (
      donor_id,
      organization_donor_id,
      relationship_type,
      role,
      is_contact,
      contact_type,
      notes,
      created_by,
      updated_by
    ) values ($1, $2, $3, $4, $5, $6, $7, $7)`,
    [
      donorId,
      organizationDonorId,
      relationshipType,
      options?.role ?? null,
      options?.isContact ?? false,
      options?.contactType ?? null,
      notes ?? null,
      actor.userId
    ]
  );
}

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

export type PotentialDuplicateDonorRow = DonorListRow & {
  matched_fields: string[];
  match_score: number;
};

export type DonorConnectionRow = {
  id: string;
  donor_number: string | null;
  donor_type: "INDIVIDUAL" | "ORGANIZATION";
  display_name: string;
  title: string | null;
  first_name: string | null;
  middle_name: string | null;
  last_name: string | null;
  primary_email: string | null;
  primary_phone: string | null;
};

export type DonorProfileRow = {
  id: string;
  donor_number: string | null;
  donor_type: "INDIVIDUAL" | "ORGANIZATION";
  title: string | null;
  gender: string | null;
  first_name: string | null;
  middle_name: string | null;
  last_name: string | null;
  preferred_name: string | null;
  full_name: string;
  organization_name: string | null;
  organization_website: string | null;
  organization_email: string | null;
  organization_contact_donor_id: string | null;
  organization_contact_title: string | null;
  organization_contact_first_name: string | null;
  organization_contact_middle_name: string | null;
  organization_contact_last_name: string | null;
  organization_contact_name: string | null;
  organization_contact_email: string | null;
  organization_contact_phone: string | null;
  spouse_donor_id: string | null;
  spouse_name: string | null;
  spouse_donor_number: string | null;
  spouse_primary_email_record: string | null;
  spouse_gender: string | null;
  spouse_preferred_name_record: string | null;
  spouse_first_name_record: string | null;
  spouse_last_name_record: string | null;
  spouse_title: string | null;
  spouse_first_name: string | null;
  spouse_middle_name: string | null;
  spouse_last_name: string | null;
  spouse_preferred_email: string | null;
  spouse_alternate_email: string | null;
  spouse_primary_phone: string | null;
  spouse_same_address: boolean;
  primary_email: string | null;
  primary_email_type: string | null;
  alternate_email: string | null;
  alternate_email_type: string | null;
  primary_phone: string | null;
  giving_level_internal: string | null;
  giving_level_display: string | null;
  current_year_recognition_cents: string;
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

export type DonorOrganizationRelationshipRow = {
  id: string;
  relationship_type: "EMPLOYER" | "FOUNDATION" | "DONOR_ADVISED_FUND" | "OTHER";
  organization_donor_id: string | null;
  organization_name: string | null;
  organization_display_name: string;
  organization_donor_number: string | null;
  role: string | null;
  is_contact: boolean;
  contact_type: OrganizationContactType | null;
  contact_name: string | null;
  primary_email: string | null;
  alternate_email: string | null;
  primary_phone: string | null;
  address_type: string | null;
  street1: string | null;
  street2: string | null;
  city: string | null;
  state_region: string | null;
  postal_code: string | null;
  country: string | null;
  notes: string | null;
};

export type OrganizationContactRow = {
  id: string;
  contact_type: OrganizationContactType;
  contact_donor_id: string | null;
  linked_display_name: string | null;
  linked_donor_number: string | null;
  title: string | null;
  first_name: string | null;
  middle_name: string | null;
  last_name: string | null;
  email: string | null;
  primary_phone: string | null;
};

export type OrganizationRelationshipMemberRow = {
  relationship_id: string;
  donor_id: string;
  donor_number: string | null;
  donor_name: string;
  relationship_type: DonorOrganizationRelationshipRow["relationship_type"];
  role: string | null;
  is_contact: boolean;
  contact_type: OrganizationContactRow["contact_type"] | null;
  primary_email: string | null;
  primary_phone: string | null;
};

export type DonorNoteRow = {
  id: string;
  category: string;
  note_body: string;
  created_at: string;
  author_email: string | null;
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
  receipt_amount_cents: number | null;
  fund_name: string;
  campaign_name: string | null;
  payment_method: string | null;
  reference_number: string | null;
  receipt_sent: boolean;
  receipt_sent_at: string | null;
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

export type DonorLatestGiftRow = {
  id: string;
  gift_number: string | null;
  gift_type: DonorGiftRow["gift_type"];
  gift_date: string;
  amount_cents: number;
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
      'gender', d.gender,
      'first_name', d.first_name,
      'middle_name', d.middle_name,
      'last_name', d.last_name,
      'preferred_name', d.preferred_name,
      'organization_name', d.organization_name,
      'organization_website', d.organization_website,
      'organization_email', d.organization_email,
      'organization_contact_donor_id', d.organization_contact_donor_id,
      'organization_contact_title', d.organization_contact_title,
      'organization_contact_first_name', d.organization_contact_first_name,
      'organization_contact_middle_name', d.organization_contact_middle_name,
      'organization_contact_last_name', d.organization_contact_last_name,
      'organization_contact_name', d.organization_contact_name,
      'organization_contact_email', d.organization_contact_email,
      'organization_contact_phone', d.organization_contact_phone,
      'primary_email', d.primary_email,
      'primary_email_type', d.primary_email_type,
      'alternate_email', d.alternate_email,
      'alternate_email_type', d.alternate_email_type,
      'primary_phone', d.primary_phone,
      'spouse_donor_id', d.spouse_donor_id,
      'spouse_gender', d.spouse_gender,
      'spouse_title', d.spouse_title,
      'spouse_first_name', d.spouse_first_name,
      'spouse_middle_name', d.spouse_middle_name,
      'spouse_last_name', d.spouse_last_name,
      'spouse_preferred_email', d.spouse_preferred_email,
      'spouse_alternate_email', d.spouse_alternate_email,
      'spouse_primary_phone', d.spouse_primary_phone,
      'spouse_same_address', d.spouse_same_address,
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

async function donorOrganizationRelationshipsSnapshot(client: PoolClient, donorId: number) {
  const result = await client.query<{ snapshot: Record<string, unknown>[] }>(
    `select coalesce(
      jsonb_agg(
        jsonb_build_object(
          'id', r.id,
          'organization_donor_id', r.organization_donor_id,
          'organization_name', r.organization_name,
          'relationship_type', r.relationship_type,
          'role', r.role,
          'is_contact', r.is_contact,
          'contact_type', r.contact_type,
          'address_type', r.address_type,
          'street1', r.street1,
          'street2', r.street2,
          'city', r.city,
          'state_region', r.state_region,
          'postal_code', r.postal_code,
          'country', r.country,
          'notes', r.notes
        )
        order by r.id
      ),
      '[]'::jsonb
    ) as snapshot
    from public.donor_organization_relationships r
    where r.donor_id = $1`,
    [donorId]
  );

  return result.rows[0]?.snapshot ?? [];
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
        or concat_ws(
          ' ',
          d.first_name,
          d.last_name,
          d.preferred_name,
          d.organization_name,
          d.donor_number,
          d.primary_email,
          d.alternate_email
        ) ilike '%' || $1 || '%'
      )
    order by d.last_name nulls last, d.organization_name nulls last
    limit 100`,
    [search ?? null]
  );

  return result.rows;
}

export async function listRecentlyAccessedDonors(search?: string): Promise<DonorListRow[]> {
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
    inner join (
      select
        entity_id,
        max(occurred_at) as last_accessed_at
      from public.audit_log
      where action = 'donor.view'
        and entity_type = 'donor'
        and status = 'success'
        and entity_id is not null
      group by entity_id
    ) accessed on accessed.entity_id = d.id::text
    left join public.donor_giving_totals t on t.donor_id = d.id
    where d.deleted_at is null
      and (
        $1::text is null
        or concat_ws(
          ' ',
          d.first_name,
          d.last_name,
          d.preferred_name,
          d.organization_name,
          d.donor_number,
          d.primary_email,
          d.alternate_email
        ) ilike '%' || $1 || '%'
      )
    order by accessed.last_accessed_at desc, d.last_name nulls last, d.organization_name nulls last
    limit 100`,
    [search ?? null]
  );

  return result.rows;
}

export async function findPotentialDuplicateDonors(input: unknown): Promise<PotentialDuplicateDonorRow[]> {
  const values = donorInputSchema.parse(input);
  const firstName = values.firstName?.trim().toLowerCase() ?? null;
  const lastName = values.lastName?.trim().toLowerCase() ?? null;
  const organizationName = values.organizationName?.trim().toLowerCase() ?? null;
  const primaryEmail = values.primaryEmail?.trim().toLowerCase() ?? null;
  const primaryPhone = values.primaryPhone?.trim() ?? null;

  const result = await query<DonorListRow & { alternate_email: string | null; primary_phone: string | null }>(
    `select
      d.id::text,
      d.donor_number,
      d.donor_type,
      ${donorFullNameSql} as full_name,
      d.first_name,
      d.last_name,
      d.organization_name,
      d.primary_email,
      d.alternate_email::text,
      d.primary_phone,
      coalesce(t.donor_recognition_cents, 0)::text as donor_recognition_cents,
      coalesce(t.donor_hard_credit_cents, 0)::text as donor_hard_credit_cents,
      coalesce(t.donor_soft_credit_cents, 0)::text as donor_soft_credit_cents
    from public.donors d
    left join public.donor_giving_totals t on t.donor_id = d.id
    where d.deleted_at is null
      and (
        ($1::text is not null and lower(coalesce(d.first_name, '')) = $1)
        or ($2::text is not null and lower(coalesce(d.last_name, '')) = $2)
        or ($3::text is not null and lower(coalesce(d.organization_name, '')) = $3)
        or ($4::text is not null and (
          lower(coalesce(d.primary_email::text, '')) = $4
          or lower(coalesce(d.alternate_email::text, '')) = $4
        ))
        or ($5::text is not null and coalesce(d.primary_phone, '') = $5)
      )
    order by d.last_name nulls last, d.organization_name nulls last
    limit 20`,
    [firstName, lastName, organizationName, primaryEmail, primaryPhone]
  );

  return result.rows
    .map((row) => {
      const matchedFields: string[] = [];

      if (firstName && row.first_name?.trim().toLowerCase() === firstName) {
        matchedFields.push("First name");
      }

      if (lastName && row.last_name?.trim().toLowerCase() === lastName) {
        matchedFields.push("Last name");
      }

      if (organizationName && row.organization_name?.trim().toLowerCase() === organizationName) {
        matchedFields.push("Organization name");
      }

      if (
        primaryEmail &&
        [row.primary_email, row.alternate_email]
          .filter(Boolean)
          .some((email) => email?.trim().toLowerCase() === primaryEmail)
      ) {
        matchedFields.push("Email");
      }

      if (primaryPhone && row.primary_phone?.trim() === primaryPhone) {
        matchedFields.push("Phone");
      }

      return {
        ...row,
        matched_fields: matchedFields,
        match_score: matchedFields.length
      };
    })
    .filter((row) => row.match_score >= 2)
    .sort((left, right) => right.match_score - left.match_score || left.full_name.localeCompare(right.full_name));
}

export async function searchDonorLookupRows(search: string): Promise<DonorConnectionRow[]> {
  const trimmed = search.trim();
  const fuzzySearch = trimmed.replace(/\s+/g, "%");

  if (trimmed.length < 2) {
    return [];
  }

  const result = await query<DonorConnectionRow>(
    `select
      d.id::text,
      d.donor_number,
      d.donor_type,
      ${donorFullNameSql} as display_name,
      d.title,
      d.first_name,
      d.middle_name,
      d.last_name,
      d.primary_email::text
      ,
      d.primary_phone
    from public.donors d
    where d.deleted_at is null
      and (
        ${donorFullNameSql} ilike '%' || $1 || '%'
        or concat_ws(
          ' ',
          coalesce(d.first_name, ''),
          coalesce(d.preferred_name, ''),
          coalesce(d.middle_name, ''),
          coalesce(d.last_name, ''),
          coalesce(d.organization_name, ''),
          coalesce(d.primary_email::text, ''),
          coalesce(d.alternate_email::text, ''),
          coalesce(d.donor_number, '')
        ) ilike '%' || $2 || '%'
        or coalesce(d.organization_name, '') ilike '%' || $1 || '%'
        or coalesce(d.first_name, '') ilike '%' || $1 || '%'
        or coalesce(d.last_name, '') ilike '%' || $1 || '%'
        or coalesce(d.preferred_name, '') ilike '%' || $1 || '%'
        or coalesce(d.primary_email::text, '') ilike '%' || $1 || '%'
        or coalesce(d.alternate_email::text, '') ilike '%' || $1 || '%'
        or coalesce(d.donor_number, '') ilike '%' || $1 || '%'
      )
    order by
      case
        when ${donorFullNameSql} ilike $1 || '%' then 0
        when coalesce(d.organization_name, '') ilike $1 || '%' then 1
        when coalesce(d.last_name, '') ilike $1 || '%' then 2
        else 3
      end,
      display_name asc
    limit 20`,
    [trimmed, fuzzySearch]
  );

  return result.rows;
}

export async function getDonorLookupRowsByIds(donorIds: string[]): Promise<DonorListRow[]> {
  const numericIds = [...new Set(donorIds.map((donorId: string) => Number(donorId)).filter(Number.isFinite))];

  if (numericIds.length === 0) {
    return [];
  }

  const placeholders = numericIds.map((_: number, index: number) => `$${index + 1}`).join(", ");

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
      and d.id in (${placeholders})
    order by d.last_name nulls last, d.organization_name nulls last`,
    numericIds
  );

  return result.rows;
}

export async function listDonorConnections(currentDonorId?: string): Promise<DonorConnectionRow[]> {
  const result = await query<DonorConnectionRow>(
    `select
      d.id::text,
      d.donor_number,
      d.donor_type,
      ${donorFullNameSql} as display_name,
      d.title,
      d.first_name,
      d.middle_name,
      d.last_name,
      d.primary_email::text
      ,
      d.primary_phone
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
      d.gender,
      d.first_name,
      d.middle_name,
      d.last_name,
      d.preferred_name,
      ${donorFullNameSql} as full_name,
      d.organization_name,
      d.organization_website,
      d.organization_email::text,
      d.organization_contact_donor_id::text,
      d.organization_contact_title,
      d.organization_contact_first_name,
      d.organization_contact_middle_name,
      d.organization_contact_last_name,
      d.organization_contact_name,
      d.organization_contact_email::text,
      d.organization_contact_phone,
      d.spouse_donor_id::text,
      ${linkedDonorNameSql("sp")} as spouse_name,
      sp.donor_number as spouse_donor_number,
      sp.primary_email::text as spouse_primary_email_record,
      coalesce(sp.gender, d.spouse_gender) as spouse_gender,
      sp.preferred_name as spouse_preferred_name_record,
      sp.first_name as spouse_first_name_record,
      sp.last_name as spouse_last_name_record,
      d.spouse_title,
      d.spouse_first_name,
      d.spouse_middle_name,
      d.spouse_last_name,
      d.spouse_preferred_email::text,
      d.spouse_alternate_email::text,
      d.spouse_primary_phone,
      d.spouse_same_address,
      d.primary_email,
      d.primary_email_type,
      d.alternate_email,
      d.alternate_email_type,
      d.primary_phone,
      gl.giving_level_internal,
      gl.giving_level_display,
      coalesce(gl.current_year_recognition_cents, 0)::text as current_year_recognition_cents,
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
    left join public.donor_current_year_giving_levels gl on gl.donor_id = d.id
    where d.id = $1
      and d.deleted_at is null
    group by d.id, sp.id, a.id, t.donor_recognition_cents, t.donor_hard_credit_cents, t.donor_soft_credit_cents, gl.giving_level_internal, gl.giving_level_display, gl.current_year_recognition_cents`,
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
      g.receipt_amount_cents,
      f.name as fund_name,
      c.name as campaign_name,
      g.payment_method,
      g.reference_number,
      g.receipt_sent,
      g.receipt_sent_at::text
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

export async function listDonorOrganizationRelationships(
  donorId: string
): Promise<DonorOrganizationRelationshipRow[]> {
  const result = await query<DonorOrganizationRelationshipRow>(
    `select
      r.id::text,
      r.relationship_type,
      r.organization_donor_id::text,
      r.organization_name,
      coalesce(${linkedDonorNameSql("org")}, r.organization_name, 'Unnamed organization') as organization_display_name,
      org.donor_number as organization_donor_number,
      r.role,
      r.is_contact,
      r.contact_type,
      r.contact_name,
      r.primary_email::text,
      r.alternate_email::text,
      r.primary_phone,
      r.address_type,
      r.street1,
      r.street2,
      r.city,
      r.state_region,
      r.postal_code,
      r.country,
      r.notes
    from public.donor_organization_relationships r
    left join public.donors org on org.id = r.organization_donor_id
    where r.donor_id = $1
    order by r.created_at asc, r.id asc`,
    [Number(donorId)]
  );

  return result.rows;
}

export async function listOrganizationRelationshipMembers(
  organizationDonorId: string
): Promise<OrganizationRelationshipMemberRow[]> {
  const result = await query<OrganizationRelationshipMemberRow>(
    `select
      r.id::text as relationship_id,
      d.id::text as donor_id,
      d.donor_number,
      ${linkedDonorNameSql("d")} as donor_name,
      r.relationship_type,
      r.role,
      r.is_contact,
      r.contact_type,
      d.primary_email::text,
      d.primary_phone
    from public.donor_organization_relationships r
    inner join public.donors d on d.id = r.donor_id
    where r.organization_donor_id = $1
      and d.deleted_at is null
    order by r.is_contact desc, r.relationship_type asc, d.last_name nulls last, d.organization_name nulls last, d.id asc`,
    [Number(organizationDonorId)]
  );

  return result.rows;
}

export async function listOrganizationContacts(donorId: string): Promise<OrganizationContactRow[]> {
  const result = await query<OrganizationContactRow>(
    `select
      c.id::text,
      c.contact_type,
      c.contact_donor_id::text,
      ${linkedDonorNameSql("linked")} as linked_display_name,
      linked.donor_number as linked_donor_number,
      c.title,
      c.first_name,
      c.middle_name,
      c.last_name,
      c.email::text,
      c.primary_phone
    from public.donor_organization_contacts c
    left join public.donors linked on linked.id = c.contact_donor_id
    where c.donor_id = $1
    order by c.contact_type asc, c.created_at asc, c.id asc`,
    [Number(donorId)]
  );

  return result.rows;
}

export async function listDonorNotes(donorId: string): Promise<DonorNoteRow[]> {
  const result = await query<DonorNoteRow>(
    `select
      n.id::text,
      n.category,
      n.note_body,
      n.created_at::text,
      u.email as author_email
    from public.notes n
    left join public.users u on u.id = n.created_by
    where n.donor_id = $1
    order by n.created_at desc, n.id desc`,
    [Number(donorId)]
  );

  return result.rows;
}

export async function getDonorLatestGift(donorId: string): Promise<DonorLatestGiftRow | null> {
  const result = await query<DonorLatestGiftRow>(
    `select
      g.id::text,
      g.gift_number,
      g.gift_type,
      g.gift_date::text,
      g.amount_cents
    from public.gifts g
    where g.donor_id = $1
      and g.deleted_at is null
    order by g.gift_date desc, g.created_at desc
    limit 1`,
    [Number(donorId)]
  );

  return result.rows[0] ?? null;
}

export async function createDonor(input: unknown, actor: Actor) {
  const values = donorInputSchema.parse(input);

  return transaction(async (client) => insertDonorRecord(client, values, actor));
}

export async function importConstituentRecords(
  rows: Array<Record<string, string>>,
  mapping: Record<string, string>,
  actor: Actor
) {
  function normalizedValue(row: Record<string, string>, targetField: string) {
    const sourceHeader = Object.entries(mapping).find(([, mappedField]) => mappedField === targetField)?.[0];
    return sourceHeader ? row[sourceHeader]?.trim() ?? "" : "";
  }

  function normalizedDonorType(rawValue: string, organizationName: string) {
    const normalized = rawValue.trim().toLowerCase();

    if (["organization", "org", "business", "company", "foundation"].includes(normalized)) {
      return "ORGANIZATION" as const;
    }

    if (["individual", "person", "people", "constituent"].includes(normalized)) {
      return "INDIVIDUAL" as const;
    }

    return organizationName ? ("ORGANIZATION" as const) : ("INDIVIDUAL" as const);
  }

  const results: string[] = [];
  let createdCount = 0;
  let skippedCount = 0;

  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index];
    const donorNumber = normalizedValue(row, "donor_number");
    const organizationName = normalizedValue(row, "organization_name");
    const donorType = normalizedDonorType(normalizedValue(row, "donor_type"), organizationName);

    const input = {
      donorType,
      title: normalizedValue(row, "title") || undefined,
      gender: normalizedValue(row, "gender") || undefined,
      firstName: normalizedValue(row, "first_name") || undefined,
      middleName: normalizedValue(row, "middle_name") || undefined,
      lastName: normalizedValue(row, "last_name") || undefined,
      preferredName: normalizedValue(row, "preferred_name") || undefined,
      organizationName: organizationName || undefined,
      primaryEmail: normalizedValue(row, "primary_email") || undefined,
      primaryEmailType: normalizedValue(row, "primary_email_type") || undefined,
      alternateEmail: normalizedValue(row, "alternate_email") || undefined,
      alternateEmailType: normalizedValue(row, "alternate_email_type") || undefined,
      primaryPhone: normalizedValue(row, "primary_phone") || undefined,
      addressType: normalizedValue(row, "address_type") || undefined,
      street1: normalizedValue(row, "street1") || undefined,
      street2: normalizedValue(row, "street2") || undefined,
      city: normalizedValue(row, "city") || undefined,
      stateRegion: normalizedValue(row, "state_region") || undefined,
      postalCode: normalizedValue(row, "postal_code") || undefined,
      country: normalizedValue(row, "country") || undefined,
      notes: normalizedValue(row, "notes") || undefined
    };

    try {
      if (donorNumber) {
        const existingByNumber = await query<{ id: string }>(
          `select id::text
           from public.donors
           where donor_number = $1
           limit 1`,
          [donorNumber]
        );

        if (existingByNumber.rows[0]) {
          skippedCount += 1;
          results.push(`Row ${index + 1}: skipped because constituent ID ${donorNumber} already exists.`);
          continue;
        }
      }

      const duplicates = await findPotentialDuplicateDonors(input);

      if (duplicates.length > 0) {
        skippedCount += 1;
        results.push(
          `Row ${index + 1}: skipped as a possible duplicate of ${duplicates[0].full_name} (${duplicates[0].matched_fields.join(", ")}).`
        );
        continue;
      }

      await transaction(async (client) => {
        const parsed = donorInputSchema.parse(input);
        await insertDonorRecord(client, parsed, actor, donorNumber || null);
      });

      createdCount += 1;
    } catch (error) {
      skippedCount += 1;
      results.push(`Row ${index + 1}: ${(error as Error).message}`);
    }
  }

  return {
    success: createdCount > 0,
    message:
      createdCount > 0
        ? `Constituent import completed. ${createdCount} record${createdCount === 1 ? "" : "s"} created.`
        : "No constituent records were created.",
    createdCount,
    skippedCount,
    errors: results
  };
}

export async function updateDonorProfile(donorId: string, input: unknown, actor: Actor) {
  const values = donorInputSchema.parse(input);

  await transaction(async (client) => {
    const currentDonorResult = await client.query<{
      donor_type: "INDIVIDUAL" | "ORGANIZATION";
      spouse_donor_id: string | null;
    }>(
      `select donor_type
              , spouse_donor_id::text
       from public.donors
       where id = $1`,
      [Number(donorId)]
    );

    const currentDonor = currentDonorResult.rows[0];

    if (!currentDonor) {
      throw new Error("Donor not found.");
    }

    if (currentDonor.donor_type !== values.donorType) {
      throw new Error("Donor type cannot be changed on an existing profile.");
    }

    const before = await donorAuditSnapshot(client, Number(donorId));
    const previousSpouseDonorId = currentDonor.spouse_donor_id ? Number(currentDonor.spouse_donor_id) : null;
    const nextSpouseDonorId = values.spouseDonorId ? Number(values.spouseDonorId) : null;

    await client.query(
      `update public.donors
       set donor_type = $2,
           title = $3,
           gender = $4,
           first_name = $5,
           middle_name = $6,
           last_name = $7,
           preferred_name = $8,
           organization_name = $9,
           organization_website = $10,
           organization_email = $11,
           organization_contact_donor_id = $12,
           organization_contact_title = $13,
           organization_contact_first_name = $14,
           organization_contact_middle_name = $15,
           organization_contact_last_name = $16,
           organization_contact_name = $17,
           organization_contact_email = $18,
           organization_contact_phone = $19,
           primary_email = $20,
           primary_email_type = $21,
           alternate_email = $22,
           alternate_email_type = $23,
           primary_phone = $24,
           spouse_donor_id = $25,
           spouse_gender = $26,
           spouse_title = $27,
           spouse_first_name = $28,
           spouse_middle_name = $29,
           spouse_last_name = $30,
           spouse_preferred_email = $31,
           spouse_alternate_email = $32,
           spouse_primary_phone = $33,
           spouse_same_address = $34,
           notes = $35,
           updated_by = $36
       where id = $1`,
      [
        Number(donorId),
        values.donorType,
        values.title ?? null,
        values.gender ?? null,
        values.firstName ?? null,
        values.middleName ?? null,
        values.lastName ?? null,
        values.preferredName ?? null,
        values.organizationName ?? null,
        values.organizationWebsite ?? null,
        values.organizationEmail ?? null,
        values.organizationContactDonorId ?? null,
        values.organizationContactTitle ?? null,
        values.organizationContactFirstName ?? null,
        values.organizationContactMiddleName ?? null,
        values.organizationContactLastName ?? null,
        values.organizationContactName ?? null,
        values.organizationContactEmail ?? null,
        values.organizationContactPhone ?? null,
        values.primaryEmail ?? null,
        values.primaryEmailType ?? null,
        values.alternateEmail ?? null,
        values.alternateEmailType ?? null,
        values.primaryPhone ?? null,
        values.spouseDonorId ?? null,
        values.spouseGender ?? null,
        values.spouseTitle ?? null,
        values.spouseFirstName ?? null,
        values.spouseMiddleName ?? null,
        values.spouseLastName ?? null,
        values.spousePreferredEmail ?? null,
        values.spouseAlternateEmail ?? null,
        values.spousePrimaryPhone ?? null,
        values.spouseSameAddress ?? false,
        values.notes ?? null,
        actor.userId
      ]
    );

    if (currentDonor.donor_type === "INDIVIDUAL") {
      if (previousSpouseDonorId && previousSpouseDonorId !== nextSpouseDonorId) {
        await client.query(
          `update public.donors
           set spouse_donor_id = null,
               updated_by = $3
           where id = $1
             and spouse_donor_id = $2`,
          [previousSpouseDonorId, Number(donorId), actor.userId]
        );
      }

      if (nextSpouseDonorId) {
        await client.query(
          `update public.donors
           set spouse_donor_id = $2,
               updated_by = $3
           where id = $1`,
          [nextSpouseDonorId, Number(donorId), actor.userId]
        );
      }
    }

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

      if (currentDonor.donor_type === "INDIVIDUAL" && nextSpouseDonorId && values.syncSpousePrimaryAddress) {
        await copyPrimaryAddressToDonor(client, Number(donorId), nextSpouseDonorId, actor.userId);
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

export async function updateOrganizationDetails(
  donorId: string,
  input: unknown,
  actor: Actor
) {
  const values = donorInputSchema.parse(input);

  await transaction(async (client) => {
    const before = await donorAuditSnapshot(client, Number(donorId));
    let organizationContactDonorId = values.organizationContactDonorId ?? null;

    if (
      !organizationContactDonorId &&
      values.createOrganizationContactAsDonor &&
      values.organizationContactFirstName &&
      values.organizationContactLastName
    ) {
      const donorNumber = await allocateDonorNumber(client);
      const inserted = await client.query<{ id: string }>(
        `insert into public.donors (
          donor_number,
          donor_type,
          title,
          first_name,
          middle_name,
          last_name,
          primary_email,
          primary_phone,
          created_by,
          updated_by
        ) values ($1, 'INDIVIDUAL', $2, $3, $4, $5, $6, $7, $8, $8)
        returning id::text`,
        [
          donorNumber,
          values.organizationContactTitle ?? null,
          values.organizationContactFirstName,
          values.organizationContactMiddleName ?? null,
          values.organizationContactLastName,
          values.organizationContactEmail ?? null,
          values.organizationContactPhone ?? null,
          actor.userId
        ]
      );

      organizationContactDonorId = Number(inserted.rows[0].id);
    }

    await client.query(
      `update public.donors
       set donor_type = 'ORGANIZATION',
           organization_name = $2,
           organization_website = $3,
           organization_email = $4,
           organization_contact_donor_id = $5,
           organization_contact_title = $6,
           organization_contact_first_name = $7,
           organization_contact_middle_name = $8,
           organization_contact_last_name = $9,
           organization_contact_name = $10,
           organization_contact_email = $11,
           organization_contact_phone = $12,
           updated_by = $13
       where id = $1`,
      [
        Number(donorId),
        values.organizationName ?? null,
        values.organizationWebsite ?? null,
        values.organizationEmail ?? null,
        organizationContactDonorId,
        values.organizationContactTitle ?? null,
        values.organizationContactFirstName ?? null,
        values.organizationContactMiddleName ?? null,
        values.organizationContactLastName ?? null,
        values.organizationContactName ?? null,
        values.organizationContactEmail ?? null,
        values.organizationContactPhone ?? null,
        actor.userId
      ]
    );

    if (organizationContactDonorId) {
      await ensureOrganizationRelationshipLink(
        client,
        Number(organizationContactDonorId),
        Number(donorId),
        actor,
        "OTHER",
        "Organization main contact"
      );
    }

    const after = await donorAuditSnapshot(client, Number(donorId));

    await client.query(
      `insert into public.audit_log (actor_user_id, action, entity_type, entity_id, status, ip_address, metadata)
       values ($1, 'donor.organization.update', 'donor', $2, 'success', $3, $4::jsonb)`,
      [
        actor.userId,
        donorId,
        actor.ipAddress ?? null,
        JSON.stringify({
          before,
          after,
          createdOrganizationContactDonorId:
            organizationContactDonorId && !values.organizationContactDonorId ? String(organizationContactDonorId) : null
        })
      ]
    );
  });
}

async function copyPrimaryAddressToDonor(client: PoolClient, sourceDonorId: number, targetDonorId: number, userId: string) {
  const sourceAddress = await client.query<{
    address_type: string;
    street1: string;
    street2: string | null;
    city: string;
    state_region: string | null;
    postal_code: string | null;
    country: string;
  }>(
    `select
      address_type,
      street1,
      street2,
      city,
      state_region,
      postal_code,
      country
    from public.donor_addresses
    where donor_id = $1
      and is_primary = true
    limit 1`,
    [sourceDonorId]
  );

  if (!sourceAddress.rows[0]) {
    return;
  }

  const source = sourceAddress.rows[0];
  const targetPrimary = await client.query<{
    id: string;
    address_type: string;
    street1: string;
    street2: string | null;
    city: string;
    state_region: string | null;
    postal_code: string | null;
    country: string;
  }>(
    `select
      id::text,
      address_type,
      street1,
      street2,
      city,
      state_region,
      postal_code,
      country
    from public.donor_addresses
    where donor_id = $1
      and is_primary = true
    limit 1`,
    [targetDonorId]
  );

  const targetPrimaryRow = targetPrimary.rows[0];
  const matchesSource =
    targetPrimaryRow &&
    targetPrimaryRow.street1 === source.street1 &&
    (targetPrimaryRow.street2 ?? null) === (source.street2 ?? null) &&
    targetPrimaryRow.city === source.city &&
    (targetPrimaryRow.state_region ?? null) === (source.state_region ?? null) &&
    (targetPrimaryRow.postal_code ?? null) === (source.postal_code ?? null) &&
    targetPrimaryRow.country === source.country;

  if (matchesSource && targetPrimaryRow) {
    await client.query(
      `update public.donor_addresses
       set address_type = $2,
           is_primary = true,
           updated_by = $3
       where id = $1`,
      [Number(targetPrimaryRow.id), source.address_type, userId]
    );
    return;
  }

  if (targetPrimaryRow) {
    await client.query(
      `update public.donor_addresses
       set is_primary = false,
           address_type = 'PREVIOUS',
           updated_by = $2
       where id = $1`,
      [Number(targetPrimaryRow.id), userId]
    );
  }

  const existingMatch = await client.query<{ id: string }>(
    `select id::text
     from public.donor_addresses
     where donor_id = $1
       and street1 = $2
       and coalesce(street2, '') = coalesce($3, '')
       and city = $4
       and coalesce(state_region, '') = coalesce($5, '')
       and coalesce(postal_code, '') = coalesce($6, '')
       and country = $7
     limit 1`,
    [targetDonorId, source.street1, source.street2 ?? null, source.city, source.state_region ?? null, source.postal_code ?? null, source.country]
  );

  if (existingMatch.rows[0]) {
    await client.query(
      `update public.donor_addresses
       set address_type = $2,
           is_primary = true,
           updated_by = $3
       where id = $1`,
      [Number(existingMatch.rows[0].id), source.address_type, userId]
    );
    return;
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
    ) values ($1, $2, $3, $4, $5, $6, $7, $8, true, $9, $9)`,
    [
      targetDonorId,
      source.address_type,
      source.street1,
      source.street2,
      source.city,
      source.state_region,
      source.postal_code,
      source.country,
      userId
    ]
  );
}

export async function promoteSpouseToDonor(donorId: string, actor: PromoteSpouseActor) {
  return transaction(async (client) => {
    const source = await client.query<{
      spouse_donor_id: string | null;
      spouse_gender: string | null;
      spouse_title: string | null;
      spouse_first_name: string | null;
      spouse_middle_name: string | null;
      spouse_last_name: string | null;
      spouse_preferred_email: string | null;
      spouse_alternate_email: string | null;
      spouse_primary_phone: string | null;
      spouse_same_address: boolean;
    }>(
      `select
        spouse_donor_id::text,
        spouse_gender,
        spouse_title,
        spouse_first_name,
        spouse_middle_name,
        spouse_last_name,
        spouse_preferred_email::text,
        spouse_alternate_email::text,
        spouse_primary_phone,
        spouse_same_address
      from public.donors
      where id = $1`,
      [Number(donorId)]
    );

    const row = source.rows[0];

    if (!row) {
      throw new Error("Donor not found.");
    }

    if (row.spouse_donor_id) {
      return row.spouse_donor_id;
    }

    if (!row.spouse_first_name || !row.spouse_last_name) {
      throw new Error("Spouse first and last name are required before promotion.");
    }

    const donorNumber = await allocateDonorNumber(client);
    const inserted = await client.query<{ id: string }>(
      `insert into public.donors (
        donor_number,
        donor_type,
        gender,
        title,
        first_name,
        middle_name,
        last_name,
        primary_email,
        alternate_email,
        primary_phone,
        created_by,
        updated_by
      ) values ($1, 'INDIVIDUAL', $2, $3, $4, $5, $6, $7, $8, $9, $10, $10)
      returning id::text`,
      [
        donorNumber,
        row.spouse_gender,
        row.spouse_title,
        row.spouse_first_name,
        row.spouse_middle_name,
        row.spouse_last_name,
        row.spouse_preferred_email,
        row.spouse_alternate_email,
        row.spouse_primary_phone,
        actor.userId
      ]
    );

    const spouseId = inserted.rows[0].id;

    if (row.spouse_same_address) {
      await copyPrimaryAddressToDonor(client, Number(donorId), Number(spouseId), actor.userId);
    }

    await client.query(
      `update public.donors
       set spouse_donor_id = $2,
           updated_by = $3
       where id in ($1, $2)`,
      [Number(donorId), Number(spouseId), actor.userId]
    );

    let softCreditedGiftCount = 0;

    if (actor.softCreditHistory) {
      const insertedSoftCredits = await client.query<{ count: string }>(
        `with inserted as (
          insert into public.soft_credits (
            gift_id,
            donor_id,
            amount_cents,
            credit_type,
            created_by,
            updated_by
          )
          select
            g.id,
            $2,
            g.amount_cents,
            'MANUAL',
            $3,
            $3
          from public.gifts g
          where g.donor_id = $1
            and g.deleted_at is null
            and not exists (
              select 1
              from public.soft_credits sc
              where sc.gift_id = g.id
                and sc.donor_id = $2
            )
          returning 1
        )
        select count(*)::text as count
        from inserted`,
        [Number(donorId), Number(spouseId), actor.userId]
      );

      softCreditedGiftCount = Number(insertedSoftCredits.rows[0]?.count ?? 0);
    }

    await client.query(
      `insert into public.audit_log (actor_user_id, action, entity_type, entity_id, status, ip_address, metadata)
       values ($1, 'donor.spouse.promote', 'donor', $2, 'success', $3, $4::jsonb)`,
      [
        actor.userId,
        donorId,
        actor.ipAddress ?? null,
        JSON.stringify({
          spouseDonorId: spouseId,
          softCreditHistory: Boolean(actor.softCreditHistory),
          softCreditedGiftCount
        })
      ]
    );

    return spouseId;
  });
}

export async function promoteOrganizationRelationshipToDonor(
  donorId: string,
  relationshipId: string,
  actor: Actor
) {
  return transaction(async (client) => {
    const relationship = await client.query<{
      organization_donor_id: string | null;
      organization_name: string | null;
      role: string | null;
      is_contact: boolean;
      contact_type: OrganizationContactType | null;
      contact_name: string | null;
      primary_email: string | null;
      alternate_email: string | null;
      primary_phone: string | null;
      address_type: string | null;
      street1: string | null;
      street2: string | null;
      city: string | null;
      state_region: string | null;
      postal_code: string | null;
      country: string | null;
    }>(
      `select
        organization_donor_id::text,
        organization_name,
        role,
        is_contact,
        contact_type,
        contact_name,
        primary_email::text,
        alternate_email::text,
        primary_phone,
        address_type,
        street1,
        street2,
        city,
        state_region,
        postal_code,
        country
      from public.donor_organization_relationships
      where id = $1
        and donor_id = $2`,
      [Number(relationshipId), Number(donorId)]
    );

    const row = relationship.rows[0];

    if (!row) {
      throw new Error("Organization relationship not found.");
    }

    if (row.organization_donor_id) {
      return row.organization_donor_id;
    }

    if (!row.organization_name) {
      throw new Error("Organization name is required before promotion.");
    }

    const donorNumber = await allocateDonorNumber(client);
    const inserted = await client.query<{ id: string }>(
      `insert into public.donors (
        donor_number,
        donor_type,
        organization_name,
        organization_contact_name,
        primary_email,
        alternate_email,
        primary_phone,
        created_by,
        updated_by
      ) values ($1, 'ORGANIZATION', $2, $3, $4, $5, $6, $7, $7)
      returning id::text`,
      [
        donorNumber,
        row.organization_name,
        row.contact_name,
        row.primary_email,
        row.alternate_email,
        row.primary_phone,
        actor.userId
      ]
    );

    const organizationId = inserted.rows[0].id;

    if (row.street1 && row.city) {
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
          Number(organizationId),
          row.address_type ?? "Primary",
          row.street1,
          row.street2,
          row.city,
          row.state_region,
          row.postal_code,
          row.country ?? "United States",
          actor.userId
        ]
      );
    }

    await client.query(
      `update public.donor_organization_relationships
       set organization_donor_id = $2,
           updated_by = $3
       where id = $1`,
      [Number(relationshipId), Number(organizationId), actor.userId]
    );

    if (row.is_contact) {
      await client.query(
        `insert into public.donor_organization_contacts (
          donor_id,
          contact_type,
          contact_donor_id,
          first_name,
          last_name,
          email,
          primary_phone,
          created_by,
          updated_by
        )
        select
          $1,
          $2,
          d.id,
          d.first_name,
          d.last_name,
          d.primary_email,
          d.primary_phone,
          $3,
          $3
        from public.donors d
        where d.id = $4
          and not exists (
            select 1
            from public.donor_organization_contacts c
            where c.donor_id = $1
              and c.contact_donor_id = $4
              and c.contact_type = $2
          )`,
        [Number(organizationId), row.contact_type ?? "ADDITIONAL_CONTACT", actor.userId, Number(donorId)]
      );
    }

    await client.query(
      `insert into public.audit_log (actor_user_id, action, entity_type, entity_id, status, ip_address, metadata)
       values ($1, 'donor.relationship.promote', 'donor', $2, 'success', $3, $4::jsonb)`,
      [
        actor.userId,
        donorId,
        actor.ipAddress ?? null,
        JSON.stringify({ relationshipId, organizationDonorId: organizationId })
      ]
    );

    return organizationId;
  });
}

export async function addDonorOrganizationRelationship(
  donorId: string,
  input: {
    relationshipType?: string | null;
    organizationDonorId?: string | null;
    organizationName?: string | null;
    role?: string | null;
    isContact?: boolean | null;
    contactType?: OrganizationContactRow["contact_type"] | null;
    contactName?: string | null;
    primaryEmail?: string | null;
    alternateEmail?: string | null;
    primaryPhone?: string | null;
    addressType?: string | null;
    street1?: string | null;
    street2?: string | null;
    city?: string | null;
    stateRegion?: string | null;
    postalCode?: string | null;
    country?: string | null;
    notes?: string | null;
  },
  actor: Actor
) {
  if (!input.organizationDonorId?.trim() && !input.organizationName?.trim()) {
    throw new Error("An organization relationship needs an existing organization or a name.");
  }

  if (input.organizationName?.trim() && (!input.street1?.trim() || !input.city?.trim())) {
    throw new Error("New organization drafts require an address with at least street and city.");
  }

  await transaction(async (client) => {
    const before = await donorOrganizationRelationshipsSnapshot(client, Number(donorId));

    await client.query(
      `insert into public.donor_organization_relationships (
        donor_id,
        organization_donor_id,
        organization_name,
        relationship_type,
        role,
        is_contact,
        contact_type,
        contact_name,
        primary_email,
        alternate_email,
        primary_phone,
        address_type,
        street1,
        street2,
        city,
        state_region,
        postal_code,
        country,
        notes,
        created_by,
        updated_by
      ) values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $18)`,
      [
        Number(donorId),
        input.organizationDonorId ? Number(input.organizationDonorId) : null,
        input.organizationName?.trim() || null,
        input.relationshipType ?? "OTHER",
        input.role?.trim() || null,
        Boolean(input.isContact),
        input.isContact ? input.contactType ?? "ADDITIONAL_CONTACT" : null,
        input.contactName?.trim() || null,
        input.primaryEmail?.trim() || null,
        input.alternateEmail?.trim() || null,
        input.primaryPhone?.trim() || null,
        input.addressType?.trim() || "Primary",
        input.street1?.trim() || null,
        input.street2?.trim() || null,
        input.city?.trim() || null,
        input.stateRegion?.trim() || null,
        input.postalCode?.trim() || null,
        input.country?.trim() || "United States",
        input.notes?.trim() || null,
        actor.userId
      ]
    );

    if (input.organizationDonorId?.trim() && input.isContact) {
      await client.query(
        `insert into public.donor_organization_contacts (
          donor_id,
          contact_type,
          contact_donor_id,
          first_name,
          middle_name,
          last_name,
          email,
          primary_phone,
          created_by,
          updated_by
        )
        select
          $1,
          $2,
          d.id,
          d.first_name,
          d.middle_name,
          d.last_name,
          d.primary_email,
          d.primary_phone,
          $3,
          $3
        from public.donors d
        where d.id = $4
          and not exists (
            select 1
            from public.donor_organization_contacts c
            where c.donor_id = $1
              and c.contact_donor_id = $4
              and c.contact_type = $2
          )`,
        [
          Number(input.organizationDonorId),
          input.contactType ?? "ADDITIONAL_CONTACT",
          actor.userId,
          Number(donorId)
        ]
      );
    }

    await client.query(
      `insert into public.audit_log (actor_user_id, action, entity_type, entity_id, status, ip_address, metadata)
       values ($1, 'donor.relationship.create', 'donor', $2, 'success', $3, $4::jsonb)`,
      [
        actor.userId,
        donorId,
        actor.ipAddress ?? null,
        JSON.stringify({
          before,
          after: await donorOrganizationRelationshipsSnapshot(client, Number(donorId))
        })
      ]
    );
  });
}

export async function addOrganizationContact(
  donorId: string,
  input: {
    contactType?: OrganizationContactType | null;
    contactDonorId?: string | null;
    title?: string | null;
    firstName?: string | null;
    middleName?: string | null;
    lastName?: string | null;
    email?: string | null;
    primaryPhone?: string | null;
    createAsDonor?: boolean;
  },
  actor: Actor
) {
  if (!input.contactDonorId?.trim() && !input.firstName?.trim() && !input.lastName?.trim()) {
    throw new Error("An organization contact needs an existing donor or contact name.");
  }

  await transaction(async (client) => {
    let contactDonorId = input.contactDonorId?.trim() ? Number(input.contactDonorId) : null;

    if (!contactDonorId && input.createAsDonor && input.firstName?.trim() && input.lastName?.trim()) {
      const donorNumber = await allocateDonorNumber(client);
      const inserted = await client.query<{ id: string }>(
        `insert into public.donors (
          donor_number,
          donor_type,
          title,
          first_name,
          middle_name,
          last_name,
          primary_email,
          primary_phone,
          created_by,
          updated_by
        ) values ($1, 'INDIVIDUAL', $2, $3, $4, $5, $6, $7, $8, $8)
        returning id::text`,
        [
          donorNumber,
          input.title?.trim() || null,
          input.firstName.trim(),
          input.middleName?.trim() || null,
          input.lastName.trim(),
          input.email?.trim() || null,
          input.primaryPhone?.trim() || null,
          actor.userId
        ]
      );

      contactDonorId = Number(inserted.rows[0].id);
    }

    await client.query(
      `insert into public.donor_organization_contacts (
        donor_id,
        contact_type,
        contact_donor_id,
        title,
        first_name,
        middle_name,
        last_name,
        email,
        primary_phone,
        created_by,
        updated_by
      ) values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $10)`,
      [
        Number(donorId),
        input.contactType ?? "ADDITIONAL_CONTACT",
        contactDonorId,
        input.title?.trim() || null,
        input.firstName?.trim() || null,
        input.middleName?.trim() || null,
        input.lastName?.trim() || null,
        input.email?.trim() || null,
        input.primaryPhone?.trim() || null,
        actor.userId
      ]
    );

    if (contactDonorId) {
      await ensureOrganizationRelationshipLink(
        client,
        contactDonorId,
        Number(donorId),
        actor,
        "OTHER",
        `Organization ${(input.contactType ?? "ADDITIONAL_CONTACT").replaceAll("_", " ").toLowerCase()}`,
        {
          isContact: true,
          contactType: input.contactType ?? "ADDITIONAL_CONTACT"
        }
      );
    }

    await writeAuditLog({
      actorUserId: actor.userId,
      action: "donor.organization_contact.create",
      entityType: "donor",
      entityId: donorId,
      status: "success",
      ipAddress: actor.ipAddress ?? null,
      metadata: contactDonorId && !input.contactDonorId?.trim() ? { createdContactDonorId: String(contactDonorId) } : {}
    });
  });
}

export async function deleteOrganizationContact(donorId: string, contactId: string, actor: Actor) {
  await query(
    `delete from public.donor_organization_contacts
     where id = $1
       and donor_id = $2`,
    [Number(contactId), Number(donorId)]
  );

  await writeAuditLog({
    actorUserId: actor.userId,
    action: "donor.organization_contact.delete",
    entityType: "donor",
    entityId: donorId,
    status: "success",
    ipAddress: actor.ipAddress ?? null
  });
}

export async function deleteDonorOrganizationRelationship(
  donorId: string,
  relationshipId: string,
  actor: Actor
) {
  await transaction(async (client) => {
    const before = await donorOrganizationRelationshipsSnapshot(client, Number(donorId));

    await client.query(
      `delete from public.donor_organization_relationships
       where id = $1
         and donor_id = $2`,
      [Number(relationshipId), Number(donorId)]
    );

    await client.query(
      `insert into public.audit_log (actor_user_id, action, entity_type, entity_id, status, ip_address, metadata)
       values ($1, 'donor.relationship.delete', 'donor', $2, 'success', $3, $4::jsonb)`,
      [
        actor.userId,
        donorId,
        actor.ipAddress ?? null,
        JSON.stringify({
          before,
          after: await donorOrganizationRelationshipsSnapshot(client, Number(donorId))
        })
      ]
    );
  });
}

export async function addDonorNote(
  donorId: string,
  input: {
    category?: string | null;
    noteBody?: string | null;
  },
  actor: Actor
) {
  if (!input.noteBody?.trim()) {
    throw new Error("Note body is required.");
  }

  await transaction(async (client) => {
    const inserted = await client.query<{ id: string }>(
      `insert into public.notes (
        donor_id,
        category,
        note_body,
        created_by,
        updated_by
      ) values ($1, $2, $3, $4, $4)
      returning id::text`,
      [
        Number(donorId),
        input.category?.trim() || "GENERAL",
        input.noteBody?.trim() || "",
        actor.userId
      ]
    );

    await client.query(
      `insert into public.audit_log (actor_user_id, action, entity_type, entity_id, status, ip_address, metadata)
       values ($1, 'donor.note.create', 'donor', $2, 'success', $3, $4::jsonb)`,
      [
        actor.userId,
        donorId,
        actor.ipAddress ?? null,
        JSON.stringify({
          noteId: inserted.rows[0]?.id ?? null,
          category: input.category?.trim() || "GENERAL"
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
    syncSpousePrimaryAddress?: boolean;
  },
  actor: Actor
) {
  await transaction(async (client) => {
    const before = await donorAuditSnapshot(client, Number(donorId));
    const donorContext = await client.query<{ spouse_donor_id: string | null; donor_type: "INDIVIDUAL" | "ORGANIZATION" }>(
      `select spouse_donor_id::text, donor_type
       from public.donors
       where id = $1`,
      [Number(donorId)]
    );
    const spouseDonorId =
      donorContext.rows[0]?.donor_type === "INDIVIDUAL" && donorContext.rows[0]?.spouse_donor_id
        ? Number(donorContext.rows[0].spouse_donor_id)
        : null;

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

    if (input.isPrimary && input.syncSpousePrimaryAddress && spouseDonorId) {
      await copyPrimaryAddressToDonor(client, Number(donorId), spouseDonorId, actor.userId);
    }

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

export async function setPrimaryDonorAddress(
  addressId: string,
  donorId: string,
  actor: Actor & { syncSpousePrimaryAddress?: boolean }
) {
  await transaction(async (client) => {
    const before = await donorAuditSnapshot(client, Number(donorId));
    const donorContext = await client.query<{ spouse_donor_id: string | null; donor_type: "INDIVIDUAL" | "ORGANIZATION" }>(
      `select spouse_donor_id::text, donor_type
       from public.donors
       where id = $1`,
      [Number(donorId)]
    );

    await client.query(
      `update public.donor_addresses
       set is_primary = false,
           updated_by = $2
       where donor_id = $1`,
      [Number(donorId), actor.userId]
    );

    await client.query(
      `update public.donor_addresses
       set is_primary = true,
           updated_by = $3
       where id = $1
         and donor_id = $2`,
      [Number(addressId), Number(donorId), actor.userId]
    );

    const spouseDonorId =
      donorContext.rows[0]?.donor_type === "INDIVIDUAL" && donorContext.rows[0]?.spouse_donor_id
        ? Number(donorContext.rows[0].spouse_donor_id)
        : null;

    if (actor.syncSpousePrimaryAddress && spouseDonorId) {
      await copyPrimaryAddressToDonor(client, Number(donorId), spouseDonorId, actor.userId);
    }

    const after = await donorAuditSnapshot(client, Number(donorId));

    await client.query(
      `insert into public.audit_log (actor_user_id, action, entity_type, entity_id, status, ip_address, metadata)
       values ($1, 'donor.address.primary', 'donor', $2, 'success', $3, $4::jsonb)`,
      [
        actor.userId,
        Number(donorId),
        actor.ipAddress ?? null,
        JSON.stringify({
          addressId,
          before,
          after
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
