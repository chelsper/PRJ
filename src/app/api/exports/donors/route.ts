import { headers } from "next/headers";
import { NextResponse } from "next/server";

import { getSessionWithCapability } from "@/server/auth/permissions";
import { writeAuditLog } from "@/server/audit";
import { query } from "@/server/db";
import { env } from "@/server/env";
import { assertRateLimit, recordRateLimitEvent } from "@/server/security/rate-limit";

export async function GET() {
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

  const result = await query<{
    donor_name: string;
    primary_email: string | null;
    donor_recognition_cents: number;
    donor_hard_credit_cents: number;
    donor_soft_credit_cents: number;
  }>(
    `select donor_name, primary_email, donor_recognition_cents, donor_hard_credit_cents, donor_soft_credit_cents
     from public.donor_giving_totals
     order by donor_name asc`
  );

  const csv = [
    ["donor_name", "primary_email", "donor_recognition_total", "donor_hard_credit_total", "donor_soft_credit_total"].join(","),
    ...result.rows.map(
      (row: {
        donor_name: string;
        primary_email: string | null;
        donor_recognition_cents: number;
        donor_hard_credit_cents: number;
        donor_soft_credit_cents: number;
      }) =>
        [
          row.donor_name,
          row.primary_email ?? "",
          (row.donor_recognition_cents / 100).toFixed(2),
          (row.donor_hard_credit_cents / 100).toFixed(2),
          (row.donor_soft_credit_cents / 100).toFixed(2)
        ]
        .map((value: string) => `"${String(value).replaceAll('"', '""')}"`)
        .join(",")
    )
  ].join("\n");

  await writeAuditLog({
    actorUserId: session.userId,
    action: "export.donors",
    entityType: "report",
    entityId: null,
    status: "success",
    ipAddress
  });

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": "attachment; filename=donors.csv"
    }
  });
}
