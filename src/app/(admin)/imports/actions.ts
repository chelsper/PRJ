"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { randomUUID } from "node:crypto";
import { writeAuditLog } from "@/server/audit";

import { requireCapability } from "@/server/auth/permissions";
import { assertSameOrigin } from "@/server/security/csrf";
import { importConstituentRecords } from "@/server/data/donors";

export async function runConstituentImportAction(payload: {
  fileName: string;
  rows: Array<Record<string, string>>;
  mapping: Record<string, string>;
}) {
  await assertSameOrigin();
  const session = await requireCapability("donors:write");
  const requestHeaders = await headers();
  const ipAddress = requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;

  const batchId = randomUUID();
  const metadata = { batchId, fileName: payload.fileName.slice(0, 255), rowCount: payload.rows.length };
  await writeAuditLog({
    actorUserId: session.userId, action: "import.constituents.started", entityType: "import",
    entityId: batchId, status: "success", ipAddress, metadata
  });
  let result;
  try {
    result = await importConstituentRecords(payload.rows, payload.mapping, { userId: session.userId, ipAddress });
  } catch (error) {
    await writeAuditLog({ actorUserId: session.userId, action: "import.constituents.failed", entityType: "import",
      entityId: batchId, status: "failed", ipAddress, metadata });
    throw error;
  }
  try {
    await writeAuditLog({ actorUserId: session.userId, action: "import.constituents.completed", entityType: "import",
      entityId: batchId, status: result.success ? "success" : "failed", ipAddress,
      metadata: { ...metadata, createdCount: result.createdCount, skippedCount: result.skippedCount } });
  } catch {
    // Records may already be committed; don't present an audit failure as a failed import to retry.
    result.message += " Import history could not be updated. Check existing records before retrying.";
  }

  revalidatePath("/donors");
  revalidatePath("/dashboard");
  revalidatePath("/reports");
  revalidatePath("/admin/data-quality");

  return result;
}
