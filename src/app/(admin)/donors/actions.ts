"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireCapability } from "@/server/auth/permissions";
import { assertSameOrigin } from "@/server/security/csrf";
import { addDonorAddress, createDonor, softDeleteDonor, updateDonorProfile } from "@/server/data/donors";

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

export async function updateDonorProfileAction(formData: FormData) {
  await assertSameOrigin();
  const session = await requireCapability("donors:write");
  const donorId = String(formData.get("donorId"));
  const requestHeaders = await headers();
  const ipAddress = requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;

  await updateDonorProfile(
    donorId,
    {
      donorType: formData.get("donorType"),
      title: formData.get("title"),
      firstName: formData.get("firstName"),
      middleName: formData.get("middleName"),
      lastName: formData.get("lastName"),
      preferredName: formData.get("preferredName"),
      organizationName: formData.get("organizationName"),
      organizationContactDonorId: formData.get("organizationContactDonorId"),
      organizationContactName: formData.get("organizationContactName"),
      primaryEmail: formData.get("primaryEmail"),
      primaryEmailType: formData.get("primaryEmailType"),
      alternateEmail: formData.get("alternateEmail"),
      alternateEmailType: formData.get("alternateEmailType"),
      primaryPhone: formData.get("primaryPhone"),
      spouseDonorId: formData.get("spouseDonorId"),
      givingLevel: formData.get("givingLevel"),
      addressType: formData.get("addressType"),
      street1: formData.get("street1"),
      street2: formData.get("street2"),
      city: formData.get("city"),
      stateRegion: formData.get("stateRegion"),
      postalCode: formData.get("postalCode"),
      country: formData.get("country"),
      notes: formData.get("notes")
    },
    { userId: session.userId, ipAddress }
  );

  revalidatePath(`/donors/${donorId}`);
  revalidatePath("/donors");
  redirect(`/donors/${donorId}`);
}

export async function addDonorAddressAction(formData: FormData) {
  await assertSameOrigin();
  const session = await requireCapability("donors:write");
  const donorId = String(formData.get("donorId"));
  const requestHeaders = await headers();
  const ipAddress = requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;

  await addDonorAddress(
    donorId,
    {
      addressType: String(formData.get("addressType") ?? ""),
      street1: String(formData.get("street1") ?? ""),
      street2: String(formData.get("street2") ?? ""),
      city: String(formData.get("city") ?? ""),
      stateRegion: String(formData.get("stateRegion") ?? ""),
      postalCode: String(formData.get("postalCode") ?? ""),
      country: String(formData.get("country") ?? "United States"),
      isPrimary: formData.get("isPrimary") === "on"
    },
    { userId: session.userId, ipAddress }
  );

  revalidatePath(`/donors/${donorId}/addresses`);
  revalidatePath(`/donors/${donorId}`);
}

export async function deleteDonorAction(formData: FormData) {
  await assertSameOrigin();
  const session = await requireCapability("donors:write");
  const requestHeaders = await headers();
  const ipAddress = requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  await softDeleteDonor(String(formData.get("donorId")), { userId: session.userId, ipAddress });
  revalidatePath("/donors");
  redirect("/donors");
}
