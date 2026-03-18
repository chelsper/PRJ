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
  amount: z.coerce.number().positive(),
  giftDate: z.string().date(),
  paymentMethod: z.enum(["ACH", "CARD", "CHECK", "CASH", "WIRE", "OTHER"]),
  referenceNumber: blankToUndefined(z.string().trim().max(100)),
  notes: blankToUndefined(z.string().trim().max(5000))
});
