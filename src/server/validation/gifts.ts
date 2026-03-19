import { z } from "zod";

const blankToUndefined = <T extends z.ZodTypeAny>(schema: T) =>
  z.preprocess((value) => {
    if (value === null || value === undefined) {
      return undefined;
    }

    if (typeof value === "string" && value.trim() === "") {
      return undefined;
    }

    return value;
  }, schema.optional());

const installmentScheduleSchema = blankToUndefined(
  z.preprocess((value) => {
    if (typeof value !== "string") {
      return value;
    }

    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  },
  z.array(
    z.object({
      dueDate: z.string().date(),
      amount: z.coerce.number().positive()
    })
  ).max(120))
);

export const giftInputSchema = z.object({
  donorId: z.coerce.number().int().positive(),
  fundId: z.coerce.number().int().positive(),
  campaignId: blankToUndefined(z.coerce.number().int().positive()),
  appealId: blankToUndefined(z.coerce.number().int().positive()),
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
  receiptAmount: blankToUndefined(z.coerce.number().positive()),
  fairMarketValue: blankToUndefined(z.coerce.number().positive()),
  giftDate: z.string().date(),
  pledgeStartDate: blankToUndefined(z.string().date()),
  expectedFulfillmentDate: blankToUndefined(z.string().date()),
  installmentCount: blankToUndefined(z.coerce.number().int().positive().max(120)),
  installmentFrequency: blankToUndefined(z.enum(["MONTHLY", "QUARTERLY", "ANNUAL", "CUSTOM"])),
  installmentSchedule: installmentScheduleSchema,
  paymentMethod: blankToUndefined(z.enum(["ACH", "CARD", "CHECK", "CASH", "WIRE", "OTHER"])),
  checkDate: blankToUndefined(z.string().date()),
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
    if (value.installmentSchedule?.length) {
      return;
    }

    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Installment frequency is required when installment count is set.",
      path: ["installmentFrequency"]
    });
  }

  if (isPledgeType && value.installmentSchedule?.length) {
    const total = value.installmentSchedule.reduce((sum: number, row: { amount: number }) => sum + row.amount, 0);

    if (Math.abs(total - value.amount) > 0.009) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Installment schedule must add up to the total gift amount.",
        path: ["installmentSchedule"]
      });
    }
  }
});
