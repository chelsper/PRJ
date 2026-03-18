import { cookies } from "next/headers";

import { AUTH_COOKIE } from "@/server/auth/constants";
import { verifySessionToken, type SessionPayload } from "@/server/auth/session";
import { query } from "@/server/db";

export async function getCurrentSession(): Promise<SessionPayload | null> {
  const store = await cookies();
  const token = store.get(AUTH_COOKIE)?.value;

  if (!token) {
    return null;
  }

  const payload = await verifySessionToken(token);

  if (!payload) {
    return null;
  }

  const result = await query<{
    id: string;
    email: string;
    role: SessionPayload["role"];
    status: string;
  }>(
    `select id::text, email, role, status
     from public.users
     where id = $1`,
    [Number(payload.userId)]
  );

  const user = result.rows[0];

  if (!user || user.status !== "active") {
    return null;
  }

  return {
    userId: user.id,
    email: user.email,
    role: user.role
  };
}
