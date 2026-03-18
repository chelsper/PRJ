import { z } from "zod";

const blankToUndefined = <T extends z.ZodTypeAny>(schema: T) =>
  z.preprocess((value) => {
    if (typeof value === "string" && value.trim() === "") {
      return undefined;
    }

    return value;
  }, schema.optional());

export const donorFiltersSchema = z.object({
  q: z.string().trim().max(150).optional(),
  year: z.string().trim().max(4).optional()
});

export const donorInputSchema = z
  .object({
    donorType: z.enum(["INDIVIDUAL", "ORGANIZATION"]),
    title: blankToUndefined(z.string().trim().max(20)),
    firstName: blankToUndefined(z.string().trim().max(100)),
    middleName: blankToUndefined(z.string().trim().max(100)),
    lastName: blankToUndefined(z.string().trim().max(100)),
    preferredName: blankToUndefined(z.string().trim().max(100)),
    organizationName: blankToUndefined(z.string().trim().max(200)),
    organizationContactDonorId: blankToUndefined(z.coerce.number().int().positive()),
    organizationContactName: blankToUndefined(z.string().trim().max(200)),
    primaryEmail: blankToUndefined(z.string().trim().email().max(255)),
    primaryEmailType: blankToUndefined(z.string().trim().max(50)),
    alternateEmail: blankToUndefined(z.string().trim().email().max(255)),
    alternateEmailType: blankToUndefined(z.string().trim().max(50)),
    primaryPhone: blankToUndefined(z.string().trim().max(30)),
    spouseDonorId: blankToUndefined(z.coerce.number().int().positive()),
    givingLevel: blankToUndefined(z.string().trim().max(100)),
    addressType: blankToUndefined(z.string().trim().max(50)),
    street1: blankToUndefined(z.string().trim().max(200)),
    street2: blankToUndefined(z.string().trim().max(200)),
    city: blankToUndefined(z.string().trim().max(100)),
    stateRegion: blankToUndefined(z.string().trim().max(100)),
    postalCode: blankToUndefined(z.string().trim().max(20)),
    country: blankToUndefined(z.string().trim().max(100)),
    notes: blankToUndefined(z.string().trim().max(5000))
  })
  .superRefine((value, ctx) => {
    if (value.donorType === "INDIVIDUAL" && (!value.firstName || !value.lastName)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Individual donors require first and last name." });
    }

    if (value.donorType === "ORGANIZATION" && !value.organizationName) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Organization donors require organizationName." });
    }
  });
