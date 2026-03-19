"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireCapability } from "@/server/auth/permissions";
import { createGift, updateGift } from "@/server/data/gifts";
import { assertSameOrigin } from "@/server/security/csrf";

export async function createGiftAction(formData: FormData) {
  await assertSameOrigin();
  const session = await requireCapability("gifts:write");
  const requestHeaders = await headers();
  const ipAddress = requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;

  await createGift(
    {
      donorId: formData.get("donorId"),
      fundId: formData.get("fundId"),
      campaignId: formData.get("campaignId"),
      appealId: formData.get("appealId"),
      softCreditDonorId: formData.get("softCreditDonorId"),
      parentPledgeGiftId: formData.get("parentPledgeGiftId"),
      giftType: formData.get("giftType"),
      amount: formData.get("amount"),
      receiptAmount: formData.get("receiptAmount"),
      giftDate: formData.get("giftDate"),
      pledgeStartDate: formData.get("pledgeStartDate"),
      expectedFulfillmentDate: formData.get("expectedFulfillmentDate"),
      installmentCount: formData.get("installmentCount"),
      installmentFrequency: formData.get("installmentFrequency"),
      paymentMethod: formData.get("paymentMethod"),
      checkDate: formData.get("checkDate"),
      referenceNumber: formData.get("referenceNumber"),
      notes: formData.get("notes")
    },
    { userId: session.userId, ipAddress }
  );

  revalidatePath("/gifts");
  revalidatePath("/dashboard");
  redirect("/gifts");
}

export async function updateGiftAction(formData: FormData) {
  await assertSameOrigin();
  const session = await requireCapability("gifts:write");
  const giftId = String(formData.get("giftId"));
  const donorId = String(formData.get("donorId"));
  const requestHeaders = await headers();
  const ipAddress = requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;

  await updateGift(
    giftId,
    {
      donorId: formData.get("donorId"),
      fundId: formData.get("fundId"),
      campaignId: formData.get("campaignId"),
      appealId: formData.get("appealId"),
      softCreditDonorId: formData.get("softCreditDonorId"),
      parentPledgeGiftId: formData.get("parentPledgeGiftId"),
      giftType: formData.get("giftType"),
      amount: formData.get("amount"),
      receiptAmount: formData.get("receiptAmount"),
      giftDate: formData.get("giftDate"),
      pledgeStartDate: formData.get("pledgeStartDate"),
      expectedFulfillmentDate: formData.get("expectedFulfillmentDate"),
      installmentCount: formData.get("installmentCount"),
      installmentFrequency: formData.get("installmentFrequency"),
      paymentMethod: formData.get("paymentMethod"),
      checkDate: formData.get("checkDate"),
      referenceNumber: formData.get("referenceNumber"),
      notes: formData.get("notes")
    },
    { userId: session.userId, ipAddress }
  );

  revalidatePath("/gifts");
  revalidatePath(`/donors/${donorId}`);
  revalidatePath(`/donors/${donorId}?tab=giving`);
  redirect(`/donors/${donorId}?tab=giving`);
}
