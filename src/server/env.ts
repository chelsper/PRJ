import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  SESSION_SECRET: z.string().min(32),
  APP_URL: z.string().url(),
  RATE_LIMIT_WINDOW_SECONDS: z.coerce.number().int().positive().default(900),
  RATE_LIMIT_MAX_AUTH_ATTEMPTS: z.coerce.number().int().positive().default(10),
  RATE_LIMIT_MAX_EXPORTS: z.coerce.number().int().positive().default(20),
  RATE_LIMIT_MAX_INVITES: z.coerce.number().int().positive().default(10)
});

export const env = envSchema.parse({
  DATABASE_URL: process.env.DATABASE_URL,
  SESSION_SECRET: process.env.SESSION_SECRET,
  APP_URL: process.env.APP_URL,
  RATE_LIMIT_WINDOW_SECONDS: process.env.RATE_LIMIT_WINDOW_SECONDS,
  RATE_LIMIT_MAX_AUTH_ATTEMPTS: process.env.RATE_LIMIT_MAX_AUTH_ATTEMPTS,
  RATE_LIMIT_MAX_EXPORTS: process.env.RATE_LIMIT_MAX_EXPORTS,
  RATE_LIMIT_MAX_INVITES: process.env.RATE_LIMIT_MAX_INVITES
});
