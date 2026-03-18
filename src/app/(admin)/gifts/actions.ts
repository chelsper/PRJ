"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";

import { requireCapability } from "@/server/auth/permissions";
import { createGift } from "@/server/data/gifts";
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
      amount: formData.get("amount"),
      giftDate: formData.get("giftDate"),
      paymentMethod: formData.get("paymentMethod"),
      referenceNumber: formData.get("referenceNumber"),
      notes: formData.get("notes")
    },
    { userId: session.userId, ipAddress }
  );

  revalidatePath("/gifts");
  revalidatePath("/dashboard");
}
