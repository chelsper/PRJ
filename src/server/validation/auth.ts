import { z } from "zod";
import { roles } from "@/server/auth/roles";

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

export const inviteUserSchema = z.object({
  email: z.string().trim().email().max(255),
  role: z.enum(roles)
});

export const adminCreateUserSchema = z
  .object({
    email: z.string().trim().email().max(255),
    role: z.enum(roles),
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

export const acceptInvitationSchema = z
  .object({
    token: z.string().trim().min(32).max(255),
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
