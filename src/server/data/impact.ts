import { query, transaction } from "@/server/db";
import { patientCaseInputSchema, serviceRecordInputSchema } from "@/server/validation/impact";

type Actor = { userId: string; ipAddress?: string | null };

export type ImpactCaseRow = {
  id: string;
  case_number: string;
  program_year: number;
  age_at_intake: number | null;
  age_band: string | null;
  county: string | null;
  zip_code: string | null;
  first_service_date: string | null;
  last_service_date: string | null;
  service_count: number;
};

export type ImpactServiceRow = {
  id: string;
  case_number: string;
  provider_name: string;
  service_type_name: string;
  service_date: string;
  amount_charged_cents: number;
  amount_paid_cents: number;
};

export type ImpactProviderRow = { id: string; name: string };
export type ImpactServiceTypeRow = { id: string; name: string };

export async function listImpactCases(): Promise<ImpactCaseRow[]> {
  const result = await query<ImpactCaseRow>(
    `select
       pc.id::text,
       pc.case_number,
       pc.program_year,
       pc.age_at_intake,
       pc.age_band,
       pc.county,
       pc.zip_code,
       pc.first_service_date::text,
       pc.last_service_date::text,
       count(sr.id)::int as service_count
     from public.patient_cases pc
     left join public.service_records sr on sr.patient_case_id = pc.id
     group by pc.id
     order by pc.created_at desc
     limit 50`
  );

  return result.rows;
}

export async function listImpactServices(): Promise<ImpactServiceRow[]> {
  const result = await query<ImpactServiceRow>(
    `select
       sr.id::text,
       pc.case_number,
       coalesce(nullif(d.organization_name, ''), concat_ws(' ', d.first_name, d.last_name), d.donor_number) as provider_name,
       st.name as service_type_name,
       sr.service_date::text,
       sr.amount_charged_cents,
       sr.amount_paid_cents
     from public.service_records sr
     join public.patient_cases pc on pc.id = sr.patient_case_id
     join public.donors d on d.id = sr.provider_donor_id
     join public.service_types st on st.id = sr.service_type_id
     order by sr.service_date desc, sr.id desc
     limit 50`
  );

  return result.rows;
}

export async function listImpactProviders(): Promise<ImpactProviderRow[]> {
  const result = await query<ImpactProviderRow>(
    `select id::text, organization_name as name
     from public.donors
     where donor_type = 'ORGANIZATION'
       and deleted_at is null
       and organization_name is not null
     order by organization_name asc`
  );

  return result.rows;
}

export async function listImpactServiceTypes(): Promise<ImpactServiceTypeRow[]> {
  const result = await query<ImpactServiceTypeRow>(
    `select id::text, name
     from public.service_types
     where is_active = true
     order by sort_order asc, name asc`
  );

  return result.rows;
}

export async function createPatientCase(input: unknown, actor: Actor) {
  const values = patientCaseInputSchema.parse(input);

  return transaction(async (client) => {
    const result = await client.query<{ id: string; case_number: string }>(
      `insert into public.patient_cases (
         external_patient_ref, program_year, sex, age_at_intake, age_band, race_ethnicity,
         county, zip_code, preferred_language, insurance_status, referral_source,
         referring_clinic, first_service_date, last_service_date, notes, created_by, updated_by
       ) values (
         $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $16
       ) returning id::text, case_number`,
      [
        values.externalPatientRef ?? null, values.programYear, values.sex ?? null, values.ageAtIntake ?? null,
        values.ageBand ?? null, values.raceEthnicity ?? null, values.county ?? null, values.zipCode ?? null,
        values.preferredLanguage ?? null, values.insuranceStatus ?? null, values.referralSource ?? null,
        values.referringClinic ?? null, values.firstServiceDate ?? null, values.lastServiceDate ?? null,
        values.notes ?? null, actor.userId
      ]
    );
    const row = result.rows[0];

    await client.query(
      `insert into public.audit_log (actor_user_id, action, entity_type, entity_id, status, ip_address, metadata)
       values ($1, 'impact.patient_case.create', 'patient_case', $2, 'success', $3, $4::jsonb)`,
      [actor.userId, row.id, actor.ipAddress ?? null, JSON.stringify({ caseNumber: row.case_number, after: values })]
    );

    return row;
  });
}

export async function createServiceRecord(input: unknown, actor: Actor) {
  const values = serviceRecordInputSchema.parse(input);

  return transaction(async (client) => {
    const amountChargedCents = Math.round(values.amountCharged * 100);
    const amountPaidCents = Math.round(values.amountPaid * 100);
    const amountWrittenOffCents = Math.round(values.amountWrittenOff * 100);
    const result = await client.query<{ id: string }>(
      `insert into public.service_records (
         patient_case_id, provider_donor_id, service_type_id, service_date, invoice_date,
         invoice_number, amount_charged_cents, amount_paid_cents, amount_written_off_cents,
         funding_source, notes, created_by, updated_by
       ) values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $12)
       returning id::text`,
      [
        values.patientCaseId, values.providerDonorId, values.serviceTypeId, values.serviceDate,
        values.invoiceDate ?? null, values.invoiceNumber ?? null, amountChargedCents, amountPaidCents,
        amountWrittenOffCents, values.fundingSource ?? null, values.notes ?? null, actor.userId
      ]
    );
    const row = result.rows[0];

    await client.query(
      `update public.patient_cases
       set first_service_date = case when first_service_date is null or first_service_date > $2 then $2 else first_service_date end,
           last_service_date = case when last_service_date is null or last_service_date < $2 then $2 else last_service_date end,
           updated_by = $3
       where id = $1`,
      [values.patientCaseId, values.serviceDate, actor.userId]
    );

    await client.query(
      `insert into public.audit_log (actor_user_id, action, entity_type, entity_id, status, ip_address, metadata)
       values ($1, 'impact.service_record.create', 'service_record', $2, 'success', $3, $4::jsonb)`,
      [actor.userId, row.id, actor.ipAddress ?? null, JSON.stringify({ after: values })]
    );

    return row;
  });
}
