"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";

import { requireCapability } from "@/server/auth/permissions";
import { assertSameOrigin } from "@/server/security/csrf";
import { createDonor, softDeleteDonor } from "@/server/data/donors";

export async function createDonorAction(formData: FormData) {
  await assertSameOrigin();
  const session = await requireCapability("donors:write");
  const requestHeaders = await headers();
  const ipAddress = requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;

  await createDonor(
    {
      donorType: formData.get("donorType"),
      firstName: formData.get("firstName"),
      lastName: formData.get("lastName"),
      organizationName: formData.get("organizationName"),
      primaryEmail: formData.get("primaryEmail"),
      primaryPhone: formData.get("primaryPhone"),
      notes: formData.get("notes")
    },
    { userId: session.userId, ipAddress }
  );

  revalidatePath("/donors");
  revalidatePath("/dashboard");
}

export async function deleteDonorAction(formData: FormData) {
  await assertSameOrigin();
  const session = await requireCapability("donors:write");
  const requestHeaders = await headers();
  const ipAddress = requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  await softDeleteDonor(String(formData.get("donorId")), { userId: session.userId, ipAddress });
  revalidatePath("/donors");
}
