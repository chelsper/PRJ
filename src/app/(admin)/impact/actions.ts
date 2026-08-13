"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireCapability } from "@/server/auth/permissions";
import { createPatientCase, createServiceRecord } from "@/server/data/impact";
import { assertSameOrigin } from "@/server/security/csrf";

function getActorIp(requestHeaders: Headers) {
  return requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
}

export async function createPatientCaseAction(formData: FormData) {
  await assertSameOrigin();
  const session = await requireCapability("impact:write");
  const ipAddress = getActorIp(await headers());

  await createPatientCase(Object.fromEntries(formData), { userId: session.userId, ipAddress });
  revalidatePath("/impact");
  redirect("/impact?created=case");
}

export async function createServiceRecordAction(formData: FormData) {
  await assertSameOrigin();
  const session = await requireCapability("impact:write");
  const ipAddress = getActorIp(await headers());

  await createServiceRecord(Object.fromEntries(formData), { userId: session.userId, ipAddress });
  revalidatePath("/impact");
  redirect("/impact?created=service");
}
