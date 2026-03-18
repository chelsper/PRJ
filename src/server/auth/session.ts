import { SignJWT, jwtVerify } from "jose";

import { env } from "@/server/env";
import type { Role } from "@/server/auth/roles";

const encoder = new TextEncoder();
const secret = encoder.encode(env.SESSION_SECRET);

export type SessionPayload = {
  userId: string;
  email: string;
  role: Role;
};

export async function createSessionToken(payload: SessionPayload) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("12h")
    .sign(secret);
}

export async function verifySessionToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, secret);
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}
