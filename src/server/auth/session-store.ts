import { cookies } from "next/headers";

import { AUTH_COOKIE } from "@/server/auth/constants";
import { verifySessionToken, type SessionPayload } from "@/server/auth/session";
import { query } from "@/server/db";

// Only the second-factor endpoints may accept this password-only session.
export async function getPasswordSession(): Promise<SessionPayload | null> {
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
     where id = $1 and not exists (
       select 1 from public.audit_log a
       where a.status = 'success' and (
         (a.action = 'auth.session.revoked' and a.entity_id = $2)
         or (a.action = 'auth.sessions.revoked' and a.entity_id = $3
             and a.occurred_at >= to_timestamp($4))
       )
     )`,
    [Number(payload.userId), payload.sessionId, payload.userId, payload.issuedAt]
  );

  const user = result.rows[0];

  if (!user || user.status !== "active") {
    return null;
  }

  return {
    userId: user.id,
    email: user.email,
    role: user.role,
    sessionId: payload.sessionId,
    passkeyVerified: payload.passkeyVerified
  };
}

export async function getCurrentSession(): Promise<SessionPayload | null> {
  const session = await getPasswordSession();
  if (!session) return null;
  const result = await query("select id from public.user_passkeys where user_id=$1 and active limit 1", [session.userId]);
  if (result.rows.length && !session.passkeyVerified) return null;
  return session;
}
