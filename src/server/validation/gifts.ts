import { z } from "zod";

export const giftInputSchema = z.object({
  donorId: z.coerce.number().int().positive(),
  fundId: z.coerce.number().int().positive(),
  campaignId: z.coerce.number().int().positive().optional(),
  amount: z.coerce.number().positive(),
  giftDate: z.string().date(),
  paymentMethod: z.enum(["ACH", "CARD", "CHECK", "CASH", "WIRE", "OTHER"]),
  referenceNumber: z.string().trim().max(100).optional(),
  notes: z.string().trim().max(5000).optional()
});
