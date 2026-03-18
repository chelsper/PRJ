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
    lifetime_giving_cents: number;
  }>(
    `select donor_name, primary_email, lifetime_giving_cents
     from lifetime_giving_by_donor
     order by donor_name asc`
  );

  const csv = [
    ["donor_name", "primary_email", "lifetime_giving"].join(","),
    ...result.rows.map((row) =>
      [row.donor_name, row.primary_email ?? "", (row.lifetime_giving_cents / 100).toFixed(2)]
        .map((value) => `"${String(value).replaceAll('"', '""')}"`)
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
