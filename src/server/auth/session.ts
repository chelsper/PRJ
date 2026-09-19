import { SignJWT, jwtVerify } from "jose";
import { randomUUID } from "node:crypto";
import { z } from "zod";

import { env } from "@/server/env";
import type { Role } from "@/server/auth/roles";

const encoder = new TextEncoder();
const secret = encoder.encode(env.SESSION_SECRET);

export type SessionPayload = {
  userId: string;
  email: string;
  role: Role;
  sessionId?: string;
};

export async function createSessionToken(payload: SessionPayload) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setJti(randomUUID())
    .setIssuer("pink-ribbon-crm")
    .setAudience("crm-session")
    .setIssuedAt()
    .setExpirationTime("12h")
    .sign(secret);
}

export async function verifySessionToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, secret, { algorithms: ["HS256"], issuer: "pink-ribbon-crm", audience: "crm-session" });
    const validated = z.object({ userId: z.string().regex(/^[1-9]\d*$/), email: z.string().email(), role: z.enum(["admin", "staff", "read_only"]), jti: z.string().uuid(), iat: z.number(), exp: z.number() }).parse(payload);
    return { userId: validated.userId, email: validated.email, role: validated.role, sessionId: validated.jti, issuedAt: validated.iat };
  } catch {
    return null;
  }
}
