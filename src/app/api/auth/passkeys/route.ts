import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import type { RegistrationResponseJSON, AuthenticationResponseJSON } from "@simplewebauthn/server";
import { getCurrentSession,getPasswordSession } from "@/server/auth/session-store";
import { authenticationOptions,registrationOptions,verifyPasskey,redeemRecoveryCode,revokePasskey } from "@/server/auth/passkeys";
import { AUTH_COOKIE } from "@/server/auth/constants";
import { createSessionToken } from "@/server/auth/session";
import { assertSameOrigin } from "@/server/security/csrf";
import { consumeRateLimit } from "@/server/security/rate-limit";

const inputSchema=z.discriminatedUnion("action",[
  z.object({action:z.literal("register"),password:z.string().min(1).max(128),label:z.string().trim().min(1).max(80)}),
  z.object({action:z.literal("revoke"),password:z.string().min(1).max(128),credentialId:z.string().min(1).max(2048)}),
  z.object({action:z.literal("authenticate"),credentialId:z.string().min(1).max(2048).optional()}),
  z.object({action:z.literal("verify"),challengeId:z.string().uuid(),response:z.object({
    id:z.string().min(1).max(2048),rawId:z.string().min(1).max(2048),type:z.literal("public-key"),
    clientExtensionResults:z.record(z.unknown()),
    response:z.union([
      z.object({clientDataJSON:z.string(),attestationObject:z.string(),transports:z.array(z.string()).optional()}).passthrough(),
      z.object({clientDataJSON:z.string(),authenticatorData:z.string(),signature:z.string(),userHandle:z.string().optional()}).passthrough()
    ])
  }).passthrough()}),
  z.object({action:z.literal("recover"),code:z.string().min(1).max(80)})
]);
const json=(value:unknown,status=200)=>NextResponse.json(value,{status,headers:{"Cache-Control":"no-store"}});

export async function POST(request:NextRequest) {
  try { await assertSameOrigin(); } catch { return json({error:"Request origin not allowed."},403); }
  const session=await getPasswordSession();
  if (!session) return json({error:"Please sign in again."},401);
  try {
    await consumeRateLimit({key:`passkey:${session.userId}`,action:"passkey",maxAttempts:30,windowSeconds:900});
    const raw=await request.text();
    if (raw.length>100000) return json({error:"Request too large."},413);
    const parsed=inputSchema.safeParse(JSON.parse(raw));
    if (!parsed.success) return json({error:"Invalid passkey request."},400);
    const input=parsed.data;
    if (input.action === "revoke") {
      if (!await getCurrentSession()) return json({error:"Complete passkey sign-in first."},403);
      await revokePasskey(session,input.credentialId,input.password);
      (await cookies()).delete(AUTH_COOKIE);
      return json({revoked:true});
    }
    if (input.action === "register") {
      if (!await getCurrentSession()) return json({error:"Complete passkey sign-in before adding another key."},403);
      return json(await registrationOptions(session,input.password,input.label));
    }
    if (input.action === "authenticate") {
      if (input.credentialId && !await getCurrentSession()) return json({error:"Complete existing passkey sign-in first."},403);
      return json(await authenticationOptions(session,input.credentialId));
    }
    if (input.action === "verify") {
      const result=await verifyPasskey(session,input.challengeId,input.response as RegistrationResponseJSON|AuthenticationResponseJSON,Boolean(await getCurrentSession()));
      if (!result.activated) return json(result);
      const token=await createSessionToken({...session,passkeyVerified:true});
      (await cookies()).set(AUTH_COOKIE,token,{httpOnly:true,secure:true,sameSite:"lax",path:"/",maxAge:43200});
      return json(result);
    }
    await redeemRecoveryCode(session,input.code);
    (await cookies()).set(AUTH_COOKIE,await createSessionToken({...session,passkeyVerified:true}),{httpOnly:true,secure:true,sameSite:"lax",path:"/",maxAge:43200});
    return json({recovered:true});
  } catch {
    // WebAuthn errors can contain credential details; never echo raw provider errors.
    return json({error:"Verification could not be completed. Check your password or recovery code, or restart the passkey prompt. Repeated attempts are limited."},400);
  }
}
