import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

import { writeAuditLog } from "@/server/audit";
import { getSessionWithCapability } from "@/server/auth/permissions";
import {
  donorsThisYearExportColumns,
  type DonorsThisYearExportColumnKey
} from "@/server/data/report-export-columns";
import { query } from "@/server/db";
import { env } from "@/server/env";
import { assertRateLimit, recordRateLimitEvent } from "@/server/security/rate-limit";

type DonorsThisYearExportRow = {
  donor_number: string | null;
  donor_type: string;
  title: string | null;
  gender: string | null;
  first_name: string | null;
  middle_name: string | null;
  last_name: string | null;
  preferred_name: string | null;
  donor_name: string;
  household_name: string | null;
  organization_name: string | null;
  organization_website: string | null;
  organization_email: string | null;
  organization_contact_name: string | null;
  organization_contact_email: string | null;
  organization_contact_phone: string | null;
  primary_email: string | null;
  primary_email_type: string | null;
  alternate_email: string | null;
  alternate_email_type: string | null;
  primary_phone: string | null;
  address_type: string | null;
  street1: string | null;
  street2: string | null;
  city: string | null;
  state_region: string | null;
  postal_code: string | null;
  country: string | null;
  spouse_name: string | null;
  spouse_gender: string | null;
  spouse_preferred_email: string | null;
  spouse_primary_phone: string | null;
  notes: string | null;
  giving_level_display: string | null;
  giving_level_internal: string | null;
  soft_credit_donor: string | null;
  total_amount_received: number;
  total_amount_pledged: number;
};

async function authorizeExport(ipAddress: string | null) {
  const session = await getSessionWithCapability("exports:run");

  if (!session) {
    await writeAuditLog({
      actorUserId: null,
      action: "export.donors",
      entityType: "report",
      entityId: null,
      status: "denied",
      ipAddress
    });

    return null;
  }

  const key = `export:${session.userId}`;

  await assertRateLimit({
    key,
    action: "donor_export",
    maxAttempts: env.RATE_LIMIT_MAX_EXPORTS,
    windowSeconds: env.RATE_LIMIT_WINDOW_SECONDS
  });
  await recordRateLimitEvent({ key, action: "donor_export" });

  return session;
}

async function buildDonorsThisYearCsv(selectedColumns: string[]) {
  const allowedColumns = new Set<string>(donorsThisYearExportColumns.map((column) => column.key));
  const columns =
    selectedColumns.length > 0
      ? selectedColumns.filter((column) => allowedColumns.has(column)) as DonorsThisYearExportColumnKey[]
      : [...donorsThisYearExportColumns.map((column) => column.key)];

  const result = await query<DonorsThisYearExportRow>(
    `with current_year_gifts as (
        select
          g.id,
          g.donor_id,
          g.gift_type,
          g.amount_cents
        from public.gifts g
        where g.deleted_at is null
          and extract(year from g.gift_date) = extract(year from current_date)
      ),
      donor_year_totals as (
        select
          g.donor_id,
          nullif(
            string_agg(
              distinct coalesce(sd.organization_name, concat_ws(' ', sd.first_name, sd.last_name)),
              ', '
            ) filter (
              where sd.id is not null
                and coalesce(sd.organization_name, concat_ws(' ', sd.first_name, sd.last_name)) <> ''
            ),
            ''
          ) as soft_credit_donor,
          coalesce(sum(
            case
              when g.gift_type in ('CASH', 'STOCK_PROPERTY', 'GIFT_IN_KIND', 'PLEDGE_PAYMENT', 'MATCHING_GIFT_PAYMENT')
                then g.amount_cents
              else 0
            end
          ), 0)::int as total_amount_received,
          coalesce(sum(
            case
              when g.gift_type in ('PLEDGE', 'MATCHING_GIFT_PLEDGE')
                then g.amount_cents
              else 0
            end
          ), 0)::int as total_amount_pledged
        from current_year_gifts g
        left join public.soft_credits sc on sc.gift_id = g.id
        left join public.donors sd on sd.id = sc.donor_id
        group by g.donor_id
      )
      select
        d.donor_number,
        d.donor_type,
        d.title,
        d.gender,
        d.first_name,
        d.middle_name,
        d.last_name,
        d.preferred_name,
        coalesce(d.organization_name, concat_ws(' ', d.first_name, d.last_name)) as donor_name,
        case
          when d.donor_type = 'INDIVIDUAL'
            and (
              d.spouse_donor_id is not null
              or d.spouse_first_name is not null
              or d.spouse_last_name is not null
              or d.spouse_preferred_email is not null
              or d.spouse_primary_phone is not null
            )
            and coalesce(nullif(d.preferred_name, ''), nullif(d.first_name, '')) is not null
            and d.last_name is not null
            and coalesce(nullif(sp.preferred_name, ''), nullif(sp.first_name, ''), nullif(d.spouse_first_name, '')) is not null
            and coalesce(sp.last_name, d.spouse_last_name) is not null
          then
            case
              when d.gender = 'MALE' and coalesce(sp.gender, d.spouse_gender) = 'FEMALE' then
                case
                  when coalesce(sp.last_name, d.spouse_last_name) = d.last_name then
                    concat(
                      coalesce(nullif(sp.preferred_name, ''), nullif(sp.first_name, ''), nullif(d.spouse_first_name, '')),
                      ' & ',
                      coalesce(nullif(d.preferred_name, ''), nullif(d.first_name, '')),
                      ' ',
                      d.last_name
                    )
                  else
                    concat(
                      coalesce(nullif(sp.preferred_name, ''), nullif(sp.first_name, ''), nullif(d.spouse_first_name, '')),
                      ' ',
                      coalesce(sp.last_name, d.spouse_last_name),
                      ' & ',
                      coalesce(nullif(d.preferred_name, ''), nullif(d.first_name, '')),
                      ' ',
                      d.last_name
                    )
                end
              when d.gender = 'FEMALE' and coalesce(sp.gender, d.spouse_gender) = 'MALE' then
                case
                  when coalesce(sp.last_name, d.spouse_last_name) = d.last_name then
                    concat(
                      coalesce(nullif(d.preferred_name, ''), nullif(d.first_name, '')),
                      ' & ',
                      coalesce(nullif(sp.preferred_name, ''), nullif(sp.first_name, ''), nullif(d.spouse_first_name, '')),
                      ' ',
                      d.last_name
                    )
                  else
                    concat(
                      coalesce(nullif(d.preferred_name, ''), nullif(d.first_name, '')),
                      ' ',
                      d.last_name,
                      ' & ',
                      coalesce(nullif(sp.preferred_name, ''), nullif(sp.first_name, ''), nullif(d.spouse_first_name, '')),
                      ' ',
                      coalesce(sp.last_name, d.spouse_last_name)
                    )
                end
              else
                case
                  when coalesce(sp.last_name, d.spouse_last_name) = d.last_name then
                    concat(
                      coalesce(nullif(d.preferred_name, ''), nullif(d.first_name, '')),
                      ' & ',
                      coalesce(nullif(sp.preferred_name, ''), nullif(sp.first_name, ''), nullif(d.spouse_first_name, '')),
                      ' ',
                      d.last_name
                    )
                  else
                    concat(
                      coalesce(nullif(d.preferred_name, ''), nullif(d.first_name, '')),
                      ' ',
                      d.last_name,
                      ' & ',
                      coalesce(nullif(sp.preferred_name, ''), nullif(sp.first_name, ''), nullif(d.spouse_first_name, '')),
                      ' ',
                      coalesce(sp.last_name, d.spouse_last_name)
                    )
                end
            end
          else null
        end as household_name,
        d.organization_name,
        d.organization_website::text,
        d.organization_email::text,
        d.organization_contact_name,
        d.organization_contact_email::text,
        d.organization_contact_phone,
        d.primary_email::text,
        d.primary_email_type,
        d.alternate_email::text,
        d.alternate_email_type,
        d.primary_phone,
        a.address_type,
        a.street1,
        a.street2,
        a.city,
        a.state_region,
        a.postal_code,
        a.country,
        coalesce(
          case
            when sp.id is not null then coalesce(sp.organization_name, concat_ws(' ', sp.first_name, sp.last_name))
            when d.spouse_first_name is not null or d.spouse_last_name is not null then concat_ws(' ', d.spouse_first_name, d.spouse_last_name)
            else null
          end,
          null
        ) as spouse_name,
        coalesce(sp.gender, d.spouse_gender) as spouse_gender,
        coalesce(sp.primary_email::text, d.spouse_preferred_email::text) as spouse_preferred_email,
        coalesce(sp.primary_phone, d.spouse_primary_phone) as spouse_primary_phone,
        d.notes,
        gl.giving_level_display,
        gl.giving_level_internal,
        t.soft_credit_donor,
        t.total_amount_received,
        t.total_amount_pledged
      from donor_year_totals t
      inner join public.donors d on d.id = t.donor_id
      left join public.donors sp on sp.id = d.spouse_donor_id
      left join public.donor_addresses a on a.donor_id = d.id and a.is_primary = true
      left join public.donor_current_year_giving_levels gl on gl.donor_id = d.id
      order by donor_name asc`
  );

  const csv = [
    columns
      .map((column) => donorsThisYearExportColumns.find((item) => item.key === column)?.label ?? column)
      .map((value) => `"${String(value).replaceAll('"', '""')}"`)
      .join(","),
    ...result.rows.map((row) =>
      columns
        .map((column) => {
          const rowValues: Record<DonorsThisYearExportColumnKey, string> = {
            donor_number: row.donor_number ?? "",
            donor_type: row.donor_type,
            title: row.title ?? "",
            gender: row.gender ?? "",
            first_name: row.first_name ?? "",
            middle_name: row.middle_name ?? "",
            last_name: row.last_name ?? "",
            preferred_name: row.preferred_name ?? "",
            donor_name: row.donor_name,
            household_name: row.household_name ?? "",
            organization_name: row.organization_name ?? "",
            organization_website: row.organization_website ?? "",
            organization_email: row.organization_email ?? "",
            organization_contact_name: row.organization_contact_name ?? "",
            organization_contact_email: row.organization_contact_email ?? "",
            organization_contact_phone: row.organization_contact_phone ?? "",
            primary_email: row.primary_email ?? "",
            primary_email_type: row.primary_email_type ?? "",
            alternate_email: row.alternate_email ?? "",
            alternate_email_type: row.alternate_email_type ?? "",
            primary_phone: row.primary_phone ?? "",
            address_type: row.address_type ?? "",
            street1: row.street1 ?? "",
            street2: row.street2 ?? "",
            city: row.city ?? "",
            state_region: row.state_region ?? "",
            postal_code: row.postal_code ?? "",
            country: row.country ?? "",
            spouse_name: row.spouse_name ?? "",
            spouse_gender: row.spouse_gender ?? "",
            spouse_preferred_email: row.spouse_preferred_email ?? "",
            spouse_primary_phone: row.spouse_primary_phone ?? "",
            notes: row.notes ?? "",
            giving_level_display: row.giving_level_display ?? "",
            giving_level_internal: row.giving_level_internal ?? "",
            soft_credit_donor: row.soft_credit_donor ?? "",
            total_amount_received: (row.total_amount_received / 100).toFixed(2),
            total_amount_pledged: (row.total_amount_pledged / 100).toFixed(2)
          };

          return `"${String(rowValues[column]).replaceAll('"', '""')}"`;
        })
        .join(",")
    )
  ].join("\n");

  return { csv, rowCount: result.rows.length, fileName: "donors-this-year.csv" };
}

async function buildRecognitionCsv() {
  const result = await query<{
    donor_name: string;
    primary_email: string | null;
    donor_recognition_cents: number;
    donor_hard_credit_cents: number;
    donor_soft_credit_cents: number;
    giving_level_internal: string | null;
    giving_level_display: string | null;
  }>(
    `select
       t.donor_name,
       t.primary_email,
       t.donor_recognition_cents,
       t.donor_hard_credit_cents,
       t.donor_soft_credit_cents,
       gl.giving_level_internal,
       gl.giving_level_display
     from public.donor_giving_totals t
     left join public.donor_current_year_giving_levels gl on gl.donor_id = t.donor_id
     order by donor_name asc`
  );

  const csv = [
    [
      "donor_name",
      "primary_email",
      "donor_recognition_total",
      "donor_hard_credit_total",
      "donor_soft_credit_total",
      "giving_level_display",
      "giving_level_internal"
    ].join(","),
    ...result.rows.map((row) =>
      [
        row.donor_name,
        row.primary_email ?? "",
        (row.donor_recognition_cents / 100).toFixed(2),
        (row.donor_hard_credit_cents / 100).toFixed(2),
        (row.donor_soft_credit_cents / 100).toFixed(2),
        row.giving_level_display ?? "",
        row.giving_level_internal ?? ""
      ]
        .map((value) => `"${String(value).replaceAll('"', '""')}"`)
        .join(",")
    )
  ].join("\n");

  return { csv, rowCount: result.rows.length, fileName: "donors.csv" };
}

async function buildExportResponse({
  report,
  selectedColumns,
  sessionUserId,
  ipAddress
}: {
  report: string;
  selectedColumns: string[];
  sessionUserId: string;
  ipAddress: string | null;
}) {
  const exportResult =
    report === "donors_this_year" ? await buildDonorsThisYearCsv(selectedColumns) : await buildRecognitionCsv();

  await writeAuditLog({
    actorUserId: sessionUserId,
    action: "export.donors",
    entityType: "report",
    entityId: null,
    status: "success",
    ipAddress,
    metadata: {
      report: "donor_recognition_totals",
      exportVariant: report,
      rowCount: exportResult.rowCount
    }
  });

  return new NextResponse(exportResult.csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename=${exportResult.fileName}`,
      "Cache-Control": "no-store"
    }
  });
}

export async function GET(request: NextRequest) {
  const requestHeaders = await headers();
  const ipAddress = requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  const session = await authorizeExport(ipAddress);

  if (!session) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return buildExportResponse({
    report: request.nextUrl.searchParams.get("report") ?? "donor_recognition_totals",
    selectedColumns: request.nextUrl.searchParams.getAll("columns"),
    sessionUserId: session.userId,
    ipAddress
  });
}

export async function POST(request: NextRequest) {
  const requestHeaders = await headers();
  const ipAddress = requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  const session = await authorizeExport(ipAddress);

  if (!session) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const formData = await request.formData();

  return buildExportResponse({
    report: String(formData.get("report") ?? "donor_recognition_totals"),
    selectedColumns: formData.getAll("columns").map((value) => String(value)),
    sessionUserId: session.userId,
    ipAddress
  });
}
