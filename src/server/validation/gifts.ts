import { z } from "zod";

const blankToUndefined = <T extends z.ZodTypeAny>(schema: T) =>
  z.preprocess((value) => {
    if (typeof value === "string" && value.trim() === "") {
      return undefined;
    }

    return value;
  }, schema.optional());

export const giftInputSchema = z.object({
  donorId: z.coerce.number().int().positive(),
  fundId: z.coerce.number().int().positive(),
  campaignId: blankToUndefined(z.coerce.number().int().positive()),
  softCreditDonorId: blankToUndefined(z.coerce.number().int().positive()),
  parentPledgeGiftId: blankToUndefined(z.coerce.number().int().positive()),
  giftType: z.enum([
    "PLEDGE",
    "PLEDGE_PAYMENT",
    "CASH",
    "STOCK_PROPERTY",
    "GIFT_IN_KIND",
    "MATCHING_GIFT_PLEDGE",
    "MATCHING_GIFT_PAYMENT"
  ]),
  amount: z.coerce.number().positive(),
  giftDate: z.string().date(),
  pledgeStartDate: blankToUndefined(z.string().date()),
  expectedFulfillmentDate: blankToUndefined(z.string().date()),
  installmentCount: blankToUndefined(z.coerce.number().int().positive().max(120)),
  installmentFrequency: blankToUndefined(z.enum(["MONTHLY", "QUARTERLY", "ANNUAL", "CUSTOM"])),
  paymentMethod: blankToUndefined(z.enum(["ACH", "CARD", "CHECK", "CASH", "WIRE", "OTHER"])),
  referenceNumber: blankToUndefined(z.string().trim().max(100)),
  notes: blankToUndefined(z.string().trim().max(5000))
}).superRefine((value, ctx) => {
  const requiresParent =
    value.giftType === "PLEDGE_PAYMENT" || value.giftType === "MATCHING_GIFT_PAYMENT";

  const isPledgeType =
    value.giftType === "PLEDGE" || value.giftType === "MATCHING_GIFT_PLEDGE";

  if (requiresParent && !value.parentPledgeGiftId) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Payment gifts must link to a parent pledge.",
      path: ["parentPledgeGiftId"]
    });
  }

  if (isPledgeType && value.installmentCount && !value.installmentFrequency) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Installment frequency is required when installment count is set.",
      path: ["installmentFrequency"]
    });
  }
});
