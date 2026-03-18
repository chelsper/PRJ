import { z } from "zod";

export const donorFiltersSchema = z.object({
  q: z.string().trim().max(150).optional(),
  year: z.string().trim().max(4).optional()
});

export const donorInputSchema = z
  .object({
    donorType: z.enum(["INDIVIDUAL", "ORGANIZATION"]),
    firstName: z.string().trim().max(100).optional(),
    lastName: z.string().trim().max(100).optional(),
    organizationName: z.string().trim().max(200).optional(),
    primaryEmail: z.string().trim().email().max(255).optional(),
    primaryPhone: z.string().trim().max(30).optional(),
    notes: z.string().trim().max(5000).optional()
  })
  .superRefine((value, ctx) => {
    if (value.donorType === "INDIVIDUAL" && (!value.firstName || !value.lastName)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Individual donors require first and last name." });
    }

    if (value.donorType === "ORGANIZATION" && !value.organizationName) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Organization donors require organizationName." });
    }
  });
