"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";

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

  const result = await importConstituentRecords(payload.rows, payload.mapping, {
    userId: session.userId,
    ipAddress
  });

  revalidatePath("/donors");
  revalidatePath("/dashboard");
  revalidatePath("/reports");

  return result;
}
