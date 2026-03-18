import { z } from "zod";

export const signUpSchema = z
  .object({
    email: z.string().trim().email().max(255),
    password: z.string().min(12).max(128),
    confirmPassword: z.string().min(12).max(128)
  })
  .superRefine((value, ctx) => {
    if (value.password !== value.confirmPassword) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Passwords must match.",
        path: ["confirmPassword"]
      });
    }
  });
