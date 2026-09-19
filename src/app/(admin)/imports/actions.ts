"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { randomUUID } from "node:crypto";
import { writeAuditLog } from "@/server/audit";

import { requireCapability } from "@/server/auth/permissions";
import { assertSameOrigin } from "@/server/security/csrf";
import { importConstituentRecords } from "@/server/data/donors";
import { constituentImportSchema } from "@/lib/import-validation";
import { consumeRateLimit } from "@/server/security/rate-limit";
import { importFingerprint, reserveImport } from "@/server/security/import-reservation";

export async function runConstituentImportAction(payload: {
  fileName: string;
  rows: Array<Record<string, string>>;
  mapping: Record<string, string>;
}) {
  await assertSameOrigin();
  const session = await requireCapability("imports:run");
  const parsed = constituentImportSchema.safeParse(payload);
  if (!parsed.success) return { success: false, message: parsed.error.issues[0]?.message ?? "Invalid import.", createdCount: 0, skippedCount: 0 };
  payload = parsed.data;
  await consumeRateLimit({ key: `import:${session.userId}`, action: "constituent_import", maxAttempts: 5, windowSeconds: 900 });
  const requestHeaders = await headers();
  const ipAddress = requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;

  const batchId = randomUUID();
  const metadata = { batchId, fileName: payload.fileName.slice(0, 255), rowCount: payload.rows.length };
  const reserved = await reserveImport({ fingerprint: importFingerprint(payload.rows, payload.mapping), batchId, userId: session.userId, fileName: payload.fileName, rowCount: payload.rows.length, ipAddress });
  if (!reserved) return { success: false, message: "This mapped batch has already been submitted. Check import history before retrying. For partial imports, review and upload only unresolved rows; do not rename the file to retry.", createdCount: 0, skippedCount: 0 };
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
