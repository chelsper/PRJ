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
  addOrganizationContact,
  createDonor,
  deleteDonorOrganizationRelationship,
  deleteOrganizationContact,
  findPotentialDuplicateDonors,
  promoteOrganizationRelationshipToDonor,
  promoteSpouseToDonor,
  setPrimaryDonorAddress,
  softDeleteDonor,
  updateOrganizationDetails,
  updateDonorProfile
} from "@/server/data/donors";

export async function createDonorAction(formData: FormData) {
  await assertSameOrigin();
  const session = await requireCapability("donors:write");
  const requestHeaders = await headers();
  const ipAddress = requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  const payload = {
    donorType: formData.get("donorType"),
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    organizationName: formData.get("organizationName"),
    primaryEmail: formData.get("primaryEmail"),
    primaryPhone: formData.get("primaryPhone"),
    notes: formData.get("notes")
  };
  const confirmUnique = formData.get("confirmUnique") === "on";

  if (!confirmUnique) {
    const duplicates = await findPotentialDuplicateDonors(payload);

    if (duplicates.length > 0) {
      const params = new URLSearchParams({
        donorType: String(payload.donorType ?? ""),
        firstName: String(payload.firstName ?? ""),
        lastName: String(payload.lastName ?? ""),
        organizationName: String(payload.organizationName ?? ""),
        primaryEmail: String(payload.primaryEmail ?? ""),
        primaryPhone: String(payload.primaryPhone ?? ""),
        notes: String(payload.notes ?? ""),
        duplicateIds: duplicates.map((duplicate) => duplicate.id).join(",")
      });

      redirect(`/donors?${params.toString()}`);
    }
  }

  const donorId = await createDonor(payload, { userId: session.userId, ipAddress });

  revalidatePath("/donors");
  revalidatePath("/dashboard");
  redirect(`/donors/${donorId}`);
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
      gender: formData.get("gender"),
      firstName: formData.get("firstName"),
      middleName: formData.get("middleName"),
      lastName: formData.get("lastName"),
      preferredName: formData.get("preferredName"),
      organizationName: formData.get("organizationName"),
      organizationWebsite: formData.get("organizationWebsite"),
      organizationEmail: formData.get("organizationEmail"),
      organizationContactDonorId: formData.get("organizationContactDonorId"),
      organizationContactTitle: formData.get("organizationContactTitle"),
      organizationContactFirstName: formData.get("organizationContactFirstName"),
      organizationContactMiddleName: formData.get("organizationContactMiddleName"),
      organizationContactLastName: formData.get("organizationContactLastName"),
      organizationContactName: formData.get("organizationContactName"),
      organizationContactEmail: formData.get("organizationContactEmail"),
      organizationContactPhone: formData.get("organizationContactPhone"),
      primaryEmail: formData.get("primaryEmail"),
      primaryEmailType: formData.get("primaryEmailType"),
      alternateEmail: formData.get("alternateEmail"),
      alternateEmailType: formData.get("alternateEmailType"),
      primaryPhone: formData.get("primaryPhone"),
      spouseDonorId: formData.get("spouseDonorId"),
      spouseGender: formData.get("spouseGender"),
      spouseTitle: formData.get("spouseTitle"),
      spouseFirstName: formData.get("spouseFirstName"),
      spouseMiddleName: formData.get("spouseMiddleName"),
      spouseLastName: formData.get("spouseLastName"),
      spousePreferredEmail: formData.get("spousePreferredEmail"),
      spouseAlternateEmail: formData.get("spouseAlternateEmail"),
      spousePrimaryPhone: formData.get("spousePrimaryPhone"),
      spouseSameAddress: formData.get("spouseSameAddress"),
      syncSpousePrimaryAddress: formData.get("syncSpousePrimaryAddress"),
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
      isPrimary: formData.get("isPrimary") === "on",
      syncSpousePrimaryAddress: formData.get("syncSpousePrimaryAddress") === "on"
    },
    { userId: session.userId, ipAddress }
  );

  revalidatePath(`/donors/${donorId}/addresses`);
  revalidatePath(`/donors/${donorId}`);
}

export async function setPrimaryDonorAddressAction(formData: FormData) {
  await assertSameOrigin();
  const session = await requireCapability("donors:write");
  const donorId = String(formData.get("donorId"));
  const addressId = String(formData.get("addressId"));
  const requestHeaders = await headers();
  const ipAddress = requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;

  await setPrimaryDonorAddress(addressId, donorId, {
    userId: session.userId,
    ipAddress,
    syncSpousePrimaryAddress: formData.get("syncSpousePrimaryAddress") === "on"
  });

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

export async function updateOrganizationDetailsAction(formData: FormData) {
  await assertSameOrigin();
  const session = await requireCapability("donors:write");
  const donorId = String(formData.get("donorId"));
  const requestHeaders = await headers();
  const ipAddress = requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;

  await updateOrganizationDetails(
    donorId,
    {
      donorType: "ORGANIZATION",
      organizationName: formData.get("organizationName"),
      organizationWebsite: formData.get("organizationWebsite"),
      organizationEmail: formData.get("organizationEmail"),
      organizationContactDonorId: formData.get("organizationContactDonorId"),
      organizationContactTitle: formData.get("organizationContactTitle"),
      organizationContactFirstName: formData.get("organizationContactFirstName"),
      organizationContactMiddleName: formData.get("organizationContactMiddleName"),
      organizationContactLastName: formData.get("organizationContactLastName"),
      organizationContactName: formData.get("organizationContactName"),
      organizationContactEmail: formData.get("organizationContactEmail"),
      organizationContactPhone: formData.get("organizationContactPhone"),
      createOrganizationContactAsDonor: formData.get("createOrganizationContactAsDonor")
    },
    { userId: session.userId, ipAddress }
  );

  revalidatePath(`/donors/${donorId}`);
  redirect(`/donors/${donorId}?tab=organization`);
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
      role: String(formData.get("role") ?? ""),
      isContact: formData.get("isContact") === "on",
      contactType:
        (String(formData.get("contactType") ?? "") || null) as
          | "MAIN_CONTACT"
          | "ADDITIONAL_CONTACT"
          | "STEWARDSHIP_CONTACT"
          | "ACKNOWLEDGMENT_CONTACT"
          | null,
      contactName: String(formData.get("contactName") ?? ""),
      primaryEmail: String(formData.get("organizationPrimaryEmail") ?? ""),
      alternateEmail: String(formData.get("organizationAlternateEmail") ?? ""),
      primaryPhone: String(formData.get("organizationPrimaryPhone") ?? ""),
      addressType: String(formData.get("organizationAddressType") ?? ""),
      street1: String(formData.get("organizationStreet1") ?? ""),
      street2: String(formData.get("organizationStreet2") ?? ""),
      city: String(formData.get("organizationCity") ?? ""),
      stateRegion: String(formData.get("organizationStateRegion") ?? ""),
      postalCode: String(formData.get("organizationPostalCode") ?? ""),
      country: String(formData.get("organizationCountry") ?? ""),
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
      gender: formData.get("gender"),
      firstName: formData.get("firstName"),
      middleName: formData.get("middleName"),
      lastName: formData.get("lastName"),
      preferredName: formData.get("preferredName"),
      organizationName: formData.get("organizationName"),
      organizationWebsite: formData.get("organizationWebsite"),
      organizationEmail: formData.get("organizationEmail"),
      organizationContactDonorId: formData.get("organizationContactDonorId"),
      organizationContactTitle: formData.get("organizationContactTitle"),
      organizationContactFirstName: formData.get("organizationContactFirstName"),
      organizationContactMiddleName: formData.get("organizationContactMiddleName"),
      organizationContactLastName: formData.get("organizationContactLastName"),
      organizationContactName: formData.get("organizationContactName"),
      organizationContactEmail: formData.get("organizationContactEmail"),
      organizationContactPhone: formData.get("organizationContactPhone"),
      primaryEmail: formData.get("primaryEmail"),
      primaryEmailType: formData.get("primaryEmailType"),
      alternateEmail: formData.get("alternateEmail"),
      alternateEmailType: formData.get("alternateEmailType"),
      primaryPhone: formData.get("primaryPhone"),
      spouseDonorId: formData.get("spouseDonorId"),
      spouseGender: formData.get("spouseGender"),
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

  await promoteSpouseToDonor(donorId, {
    userId: session.userId,
    ipAddress,
    softCreditHistory: formData.get("softCreditSpouseHistory") === "on"
  });

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

export async function addOrganizationContactAction(formData: FormData) {
  await assertSameOrigin();
  const session = await requireCapability("donors:write");
  const donorId = String(formData.get("donorId"));
  const requestHeaders = await headers();
  const ipAddress = requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;

  await addOrganizationContact(
    donorId,
    {
      contactType:
        (String(formData.get("contactType") ?? "") || null) as
          | "MAIN_CONTACT"
          | "ADDITIONAL_CONTACT"
          | "STEWARDSHIP_CONTACT"
          | "ACKNOWLEDGMENT_CONTACT"
          | null,
      contactDonorId: String(formData.get("contactDonorId") ?? ""),
      title: String(formData.get("contactTitle") ?? ""),
      firstName: String(formData.get("contactFirstName") ?? ""),
      middleName: String(formData.get("contactMiddleName") ?? ""),
      lastName: String(formData.get("contactLastName") ?? ""),
      email: String(formData.get("contactEmail") ?? ""),
      primaryPhone: String(formData.get("contactPrimaryPhone") ?? ""),
      createAsDonor: formData.get("createContactAsDonor") === "on"
    },
    { userId: session.userId, ipAddress }
  );

  revalidatePath(`/donors/${donorId}`);
  redirect(`/donors/${donorId}?tab=organization`);
}

export async function deleteOrganizationContactAction(formData: FormData) {
  await assertSameOrigin();
  const session = await requireCapability("donors:write");
  const donorId = String(formData.get("donorId"));
  const contactId = String(formData.get("contactId"));
  const requestHeaders = await headers();
  const ipAddress = requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;

  await deleteOrganizationContact(donorId, contactId, {
    userId: session.userId,
    ipAddress
  });

  revalidatePath(`/donors/${donorId}`);
  redirect(`/donors/${donorId}?tab=organization`);
}
