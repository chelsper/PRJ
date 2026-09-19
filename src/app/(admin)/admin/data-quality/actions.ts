"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireCapability } from "@/server/auth/permissions";
import { assertSameOrigin } from "@/server/security/csrf";
import { recordDuplicateReview } from "@/server/data/duplicate-review";

const reviewSchema = z.object({
  leftId: z.string().regex(/^[1-9]\d{0,17}$/), rightId: z.string().regex(/^[1-9]\d{0,17}$/),
  fingerprint: z.string().regex(/^[a-f0-9]{64}$/),
  decision: z.enum(["dismiss", "reopen"]), reason: z.string().trim().min(5).max(500)
}).refine(value => value.leftId !== value.rightId);

export async function reviewDuplicateAction(payload: unknown) {
  await assertSameOrigin();
  const session = await requireCapability("users:manage");
  const parsed = reviewSchema.safeParse(payload);
  if (!parsed.success) return { success: false, message: "Enter a reason between 5 and 500 characters and select two different records." };
  try {
    const result = await recordDuplicateReview({ ...parsed.data, userId: session.userId });
    if (result.success) revalidatePath("/admin/data-quality");
    return result;
  } catch {
    return { success: false, message: "The review could not be confirmed. Refresh to check its status before trying again." };
  }
}
