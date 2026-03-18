import { z } from "zod";

export const donorSchema = z.object({
  donorType: z.enum(["INDIVIDUAL", "ORGANIZATION"]).default("INDIVIDUAL"),
  firstName: z.string().trim().min(1).max(100).optional(),
  lastName: z.string().trim().min(1).max(100).optional(),
  organizationName: z.string().trim().min(1).max(200).optional(),
  email: z.string().trim().email().max(255).optional(),
  phone: z.string().trim().max(30).optional(),
  street1: z.string().trim().max(200).optional(),
  street2: z.string().trim().max(200).optional(),
  city: z.string().trim().max(100).optional(),
  stateProvince: z.string().trim().max(100).optional(),
  postalCode: z.string().trim().max(20).optional(),
  country: z.string().trim().max(100).default("United States"),
  notes: z.string().trim().max(5000).optional()
}).superRefine((value, ctx) => {
  if (value.donorType === "INDIVIDUAL" && (!value.firstName || !value.lastName)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Individual donors require firstName and lastName."
    });
  }

  if (value.donorType === "ORGANIZATION" && !value.organizationName) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Organization donors require organizationName."
    });
  }
});

export const giftSchema = z.object({
  donorId: z.coerce.number().int().positive(),
  amount: z.coerce.number().positive(),
  currencyCode: z.string().trim().length(3).default("USD"),
  giftDate: z.string().date(),
  giftType: z.enum(["ONE_TIME", "PLEDGE", "RECURRING", "IN_KIND"]).default("ONE_TIME"),
  paymentMethod: z.enum(["CASH", "CHECK", "CARD", "ACH", "WIRE", "OTHER"]).default("OTHER"),
  campaign: z.string().trim().max(150).optional(),
  fund: z.string().trim().max(150).optional(),
  appeal: z.string().trim().max(150).optional(),
  receiptNumber: z.string().trim().max(100).optional(),
  isAnonymous: z.boolean().default(false),
  notes: z.string().trim().max(5000).optional()
});
