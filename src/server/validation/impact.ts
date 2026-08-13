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

export const patientCaseInputSchema = z.object({
  programYear: z.coerce.number().int().min(2000).max(2100),
  externalPatientRef: blankToUndefined(z.string().trim().max(100)),
  sex: blankToUndefined(z.string().trim().max(30)),
  ageAtIntake: blankToUndefined(z.coerce.number().int().min(0).max(120)),
  ageBand: blankToUndefined(z.string().trim().max(30)),
  raceEthnicity: blankToUndefined(z.string().trim().max(100)),
  county: blankToUndefined(z.string().trim().max(100)),
  zipCode: blankToUndefined(z.string().trim().max(20)),
  preferredLanguage: blankToUndefined(z.string().trim().max(100)),
  insuranceStatus: blankToUndefined(z.string().trim().max(100)),
  referralSource: blankToUndefined(z.string().trim().max(150)),
  referringClinic: blankToUndefined(z.string().trim().max(200)),
  firstServiceDate: blankToUndefined(z.string().date()),
  lastServiceDate: blankToUndefined(z.string().date()),
  notes: blankToUndefined(z.string().trim().max(5000))
}).refine(
  (value) =>
    !value.firstServiceDate || !value.lastServiceDate || value.lastServiceDate >= value.firstServiceDate,
  { message: "Last service date cannot be before first service date.", path: ["lastServiceDate"] }
);

export const serviceRecordInputSchema = z.object({
  patientCaseId: z.coerce.number().int().positive(),
  providerDonorId: z.coerce.number().int().positive(),
  serviceTypeId: z.coerce.number().int().positive(),
  serviceDate: z.string().date(),
  invoiceDate: blankToUndefined(z.string().date()),
  invoiceNumber: blankToUndefined(z.string().trim().max(100)),
  amountCharged: z.coerce.number().min(0),
  amountPaid: z.coerce.number().min(0),
  amountWrittenOff: z.coerce.number().min(0),
  fundingSource: blankToUndefined(z.string().trim().max(150)),
  notes: blankToUndefined(z.string().trim().max(5000))
}).refine(
  (value) => value.amountPaid + value.amountWrittenOff <= value.amountCharged,
  { message: "Paid plus written-off amount cannot exceed the amount charged.", path: ["amountPaid"] }
);
