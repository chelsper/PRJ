"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireCapability } from "@/server/auth/permissions";
import { assertSameOrigin } from "@/server/security/csrf";
import {
  addDonorAddress,
  addDonorNote,
  addDonorOrganizationRelationship,
  createDonor,
  deleteDonorOrganizationRelationship,
  promoteOrganizationRelationshipToDonor,
  promoteSpouseToDonor,
  softDeleteDonor,
  updateDonorProfile
} from "@/server/data/donors";

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
      spouseTitle: formData.get("spouseTitle"),
      spouseFirstName: formData.get("spouseFirstName"),
      spouseMiddleName: formData.get("spouseMiddleName"),
      spouseLastName: formData.get("spouseLastName"),
      spousePreferredEmail: formData.get("spousePreferredEmail"),
      spouseAlternateEmail: formData.get("spouseAlternateEmail"),
      spousePrimaryPhone: formData.get("spousePrimaryPhone"),
      spouseSameAddress: formData.get("spouseSameAddress"),
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

export async function addDonorOrganizationRelationshipAction(formData: FormData) {
  await assertSameOrigin();
  const session = await requireCapability("donors:write");
  const donorId = String(formData.get("donorId"));
  const requestHeaders = await headers();
  const ipAddress = requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;

  await addDonorOrganizationRelationship(
    donorId,
    {
      relationshipType: String(formData.get("relationshipType") ?? ""),
      organizationDonorId: String(formData.get("organizationDonorId") ?? ""),
      organizationName: String(formData.get("organizationName") ?? ""),
      contactName: String(formData.get("contactName") ?? ""),
      primaryEmail: String(formData.get("organizationPrimaryEmail") ?? ""),
      alternateEmail: String(formData.get("organizationAlternateEmail") ?? ""),
      primaryPhone: String(formData.get("organizationPrimaryPhone") ?? ""),
      sameAddress: formData.get("organizationSameAddress") === "on",
      notes: String(formData.get("relationshipNotes") ?? "")
    },
    { userId: session.userId, ipAddress }
  );

  revalidatePath(`/donors/${donorId}`);
  redirect(`/donors/${donorId}`);
}

export async function promoteSpouseToDonorAction(formData: FormData) {
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
      spouseTitle: formData.get("spouseTitle"),
      spouseFirstName: formData.get("spouseFirstName"),
      spouseMiddleName: formData.get("spouseMiddleName"),
      spouseLastName: formData.get("spouseLastName"),
      spousePreferredEmail: formData.get("spousePreferredEmail"),
      spouseAlternateEmail: formData.get("spouseAlternateEmail"),
      spousePrimaryPhone: formData.get("spousePrimaryPhone"),
      spouseSameAddress: formData.get("spouseSameAddress"),
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

  await promoteSpouseToDonor(donorId, { userId: session.userId, ipAddress });

  revalidatePath(`/donors/${donorId}`);
  redirect(`/donors/${donorId}`);
}

export async function promoteOrganizationRelationshipToDonorAction(formData: FormData) {
  await assertSameOrigin();
  const session = await requireCapability("donors:write");
  const donorId = String(formData.get("donorId"));
  const relationshipId = String(formData.get("relationshipId"));
  const requestHeaders = await headers();
  const ipAddress = requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;

  await promoteOrganizationRelationshipToDonor(donorId, relationshipId, {
    userId: session.userId,
    ipAddress
  });

  revalidatePath(`/donors/${donorId}`);
  redirect(`/donors/${donorId}`);
}

export async function deleteDonorOrganizationRelationshipAction(formData: FormData) {
  await assertSameOrigin();
  const session = await requireCapability("donors:write");
  const donorId = String(formData.get("donorId"));
  const relationshipId = String(formData.get("relationshipId"));
  const requestHeaders = await headers();
  const ipAddress = requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;

  await deleteDonorOrganizationRelationship(donorId, relationshipId, {
    userId: session.userId,
    ipAddress
  });

  revalidatePath(`/donors/${donorId}`);
  redirect(`/donors/${donorId}`);
}

export async function addDonorNoteAction(formData: FormData) {
  await assertSameOrigin();
  const session = await requireCapability("donors:write");
  const donorId = String(formData.get("donorId"));
  const requestHeaders = await headers();
  const ipAddress = requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;

  await addDonorNote(
    donorId,
    {
      category: String(formData.get("category") ?? ""),
      noteBody: String(formData.get("noteBody") ?? "")
    },
    { userId: session.userId, ipAddress }
  );

  revalidatePath(`/donors/${donorId}`);
  redirect(`/donors/${donorId}?tab=notes`);
}
