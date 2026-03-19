import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

import { getSessionWithCapability } from "@/server/auth/permissions";
import { writeAuditLog } from "@/server/audit";
import { query } from "@/server/db";
import { env } from "@/server/env";
import { assertRateLimit, recordRateLimitEvent } from "@/server/security/rate-limit";

export async function GET(request: NextRequest) {
  const requestHeaders = await headers();
  const ipAddress = requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
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
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const key = `export:${session.userId}`;

  await assertRateLimit({
    key,
    action: "donor_export",
    maxAttempts: env.RATE_LIMIT_MAX_EXPORTS,
    windowSeconds: env.RATE_LIMIT_WINDOW_SECONDS
  });
  await recordRateLimitEvent({ key, action: "donor_export" });

  const requestUrl = request.nextUrl;
  const report = requestUrl.searchParams.get("report") ?? "donor_recognition_totals";
  const selectedColumns = requestUrl.searchParams.getAll("columns");

  let csv = "";
  let rowCount = 0;
  let fileName = "donors.csv";

  if (report === "donors_this_year") {
    const availableColumns = [
      { key: "donor_name", label: "Donor Name" },
      { key: "soft_credit_donor", label: "Soft Credit Donor" },
      { key: "total_amount_received", label: "Total Amount Received" },
      { key: "total_amount_pledged", label: "Total Amount Pledged" }
    ] as const;
    const columns = selectedColumns.length > 0 ? selectedColumns : availableColumns.map((column) => column.key);
    const result = await query<{
      donor_name: string;
      soft_credit_donor: string | null;
      total_amount_received: number;
      total_amount_pledged: number;
    }>(
      `with current_year_gifts as (
          select
            g.id,
            g.donor_id,
            g.gift_type,
            g.amount_cents
          from public.gifts g
          where g.deleted_at is null
            and extract(year from g.gift_date) = extract(year from current_date)
        )
        select
          coalesce(d.organization_name, concat_ws(' ', d.first_name, d.last_name)) as donor_name,
          nullif(string_agg(
            distinct coalesce(sd.organization_name, concat_ws(' ', sd.first_name, sd.last_name)),
            ', '
          ), '') as soft_credit_donor,
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
        inner join public.donors d on d.id = g.donor_id
        left join public.soft_credits sc on sc.gift_id = g.id
        left join public.donors sd on sd.id = sc.donor_id
        group by d.id
        order by donor_name asc`
    );

    rowCount = result.rows.length;
    fileName = "donors-this-year.csv";
    csv = [
      columns.join(","),
      ...result.rows.map((row) =>
        columns
          .map((column) => {
            const value =
              column === "donor_name"
                ? row.donor_name
                : column === "soft_credit_donor"
                  ? row.soft_credit_donor ?? ""
                  : column === "total_amount_received"
                    ? (row.total_amount_received / 100).toFixed(2)
                    : (row.total_amount_pledged / 100).toFixed(2);
            return `"${String(value).replaceAll('"', '""')}"`;
          })
          .join(",")
      )
    ].join("\n");
  } else {
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

    rowCount = result.rows.length;
    csv = [
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
  }

  await writeAuditLog({
    actorUserId: session.userId,
    action: "export.donors",
    entityType: "report",
    entityId: null,
    status: "success",
    ipAddress,
    metadata: {
      report: "donor_recognition_totals",
      exportVariant: report,
      rowCount
    }
  });

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename=${fileName}`
    }
  });
}
