import { createHash, randomBytes, randomUUID } from "node:crypto";
import {
  generateRegistrationOptions, generateAuthenticationOptions,
  verifyRegistrationResponse, verifyAuthenticationResponse,
  type RegistrationResponseJSON, type AuthenticationResponseJSON
} from "@simplewebauthn/server";
import { query, transaction } from "@/server/db";
import { env } from "@/server/env";
import { verifyPassword } from "@/server/auth/passwords";
import type { SessionPayload } from "@/server/auth/session";

const origin = new URL(env.APP_URL).origin;
const rpID = new URL(origin).hostname;
type KeyRow = { id: string; public_key: Buffer; counter: string; transports: string[]; active: boolean };
type Purpose = "register" | "activate" | "authenticate";

export const hashRecoveryCode = (code: string) => createHash("sha256").update(code.trim().replaceAll("-", "").toLowerCase()).digest("hex");

async function createChallenge(session: SessionPayload, purpose: Purpose, challenge: string, credentialId: string | null = null, label: string | null = null) {
  const id = randomUUID();
  await query(`insert into public.passkey_challenges (id,user_id,session_id,purpose,challenge,credential_id,expires_at,label)
    values ($1,$2,$3,$4,$5,$6,now()+interval '5 minutes',$7)`, [id,session.userId,session.sessionId!,purpose,challenge,credentialId,label]);
  return id;
}

export async function registrationOptions(session: SessionPayload, password: string, label: string) {
  const user = await query<{password_hash:string}>("select password_hash from public.users where id=$1 and status='active'", [session.userId]);
  if (!user.rows[0] || !verifyPassword(password,user.rows[0].password_hash)) throw new Error("Password verification failed.");
  const existing = await query<KeyRow>("select id,transports from public.user_passkeys where user_id=$1 and revoked_at is null",[session.userId]);
  if (existing.rows.length >= 10) throw new Error("Passkey limit reached. Contact your administrator.");
  const options = await generateRegistrationOptions({
    rpName:"Pink Ribbon CRM", rpID, userID:new TextEncoder().encode(session.userId),
    userName:session.email, attestationType:"none",
    authenticatorSelection:{residentKey:"required",userVerification:"required"},
    excludeCredentials:existing.rows.map(key=>({id:key.id,transports:key.transports}))
  });
  return {options, challengeId:await createChallenge(session,"register",options.challenge,null,label)};
}

export async function authenticationOptions(session: SessionPayload, credentialId?: string) {
  const purpose = credentialId ? "activate" : "authenticate";
  const keys = await query<KeyRow>(`select id,transports from public.user_passkeys where user_id=$1 and revoked_at is null and
    ${credentialId ? "id=$2 and not active" : "active"}`, credentialId ? [session.userId,credentialId] : [session.userId]);
  if (!keys.rows.length) throw new Error("No matching passkey. Start setup or sign in again.");
  const options = await generateAuthenticationOptions({rpID,userVerification:"required",allowCredentials:keys.rows.map(key=>({id:key.id,transports:key.transports}))});
  return {options,challengeId:await createChallenge(session,purpose,options.challenge,credentialId ?? null)};
}

export async function verifyPasskey(session: SessionPayload, challengeId: string, response: RegistrationResponseJSON | AuthenticationResponseJSON, allowEnrollment: boolean) {
  return transaction(async client=>{
    // Match all passkey lifecycle operations to one account-level lock.
    const account=await client.query("select id from public.users where id=$1 and status='active' for update",[session.userId]);
    if (!account.rows.length) throw new Error("Account unavailable.");
    const challengeResult=await client.query<{purpose:Purpose;challenge:string;credential_id:string|null;label:string|null}>(
      `update public.passkey_challenges set consumed_at=now() where id=$1 and user_id=$2 and session_id=$3
       and consumed_at is null and expires_at>now() returning purpose,challenge,credential_id,label`,[challengeId,session.userId,session.sessionId]);
    const challenge=challengeResult.rows[0];
    if (!challenge) throw new Error("Passkey challenge expired or already used. Please try again.");
    if (challenge.purpose !== "authenticate" && !allowEnrollment) throw new Error("Complete existing passkey sign-in first.");
    if (challenge.purpose === "register") {
      const result=await verifyRegistrationResponse({response:response as RegistrationResponseJSON,
        expectedChallenge:challenge.challenge,expectedOrigin:origin,expectedRPID:rpID,requireUserVerification:true});
      if (!result.verified || !result.registrationInfo) throw new Error("Passkey registration failed.");
      const key=result.registrationInfo.credential;
      await client.query(`insert into public.user_passkeys (id,user_id,public_key,counter,transports,label)
        values ($1,$2,$3,$4,$5,$6)`,[key.id,session.userId,Buffer.from(key.publicKey),key.counter,key.transports ?? [],challenge.label ?? "Passkey"]);
      return {credentialId:key.id,activated:false,recoveryCodes:[] as string[]};
    }
    const keyResult=await client.query<KeyRow>(`select id,public_key,counter,transports,active from public.user_passkeys
      where id=$1 and user_id=$2 and revoked_at is null for update`,[response.id,session.userId]);
    const key=keyResult.rows[0];
    if (!key || (challenge.purpose === "activate" ? key.active || key.id !== challenge.credential_id : !key.active)) throw new Error("Passkey does not match this request.");
    const authentication=response as AuthenticationResponseJSON;
    if (authentication.response.userHandle && authentication.response.userHandle !== Buffer.from(session.userId).toString("base64url")) throw new Error("Passkey account mismatch.");
    const result=await verifyAuthenticationResponse({response:authentication,
      expectedChallenge:challenge.challenge,expectedOrigin:origin,expectedRPID:rpID,requireUserVerification:true,
      credential:{id:key.id,publicKey:new Uint8Array(key.public_key),counter:Number(key.counter),transports:key.transports}});
    if (!result.verified) throw new Error("Passkey verification failed.");
    await client.query("update public.user_passkeys set counter=$2,active=true,last_used_at=now() where id=$1",[key.id,result.authenticationInfo.newCounter]);
    const recoveryCodes:string[]=[];
    if (challenge.purpose === "activate") {
      const existing=await client.query("select code_hash from public.user_recovery_codes where user_id=$1 limit 1",[session.userId]);
      if (!existing.rows.length) {
        for (let i=0;i<10;i++) {
          const code=randomBytes(16).toString("hex").match(/.{1,8}/g)!.join("-");
          recoveryCodes.push(code);
          await client.query("insert into public.user_recovery_codes (code_hash,user_id) values ($1,$2)",[hashRecoveryCode(code),session.userId]);
        }
      }
    }
    await client.query("insert into public.audit_log (actor_user_id,action,entity_type,entity_id,status) values ($1,$2,'user',$3,'success')",
      [session.userId,challenge.purpose === "activate" ? "auth.passkey.enrolled" : "auth.passkey.login",session.userId]);
    return {credentialId:key.id,activated:true,recoveryCodes};
  });
}

export async function revokePasskey(session: SessionPayload, credentialId: string, password: string) {
  await transaction(async client=>{
    const users=await client.query<{password_hash:string}>("select password_hash from public.users where id=$1 and status='active' for update",[session.userId]);
    if (!users.rows[0] || !verifyPassword(password,users.rows[0].password_hash)) throw new Error("Password verification failed.");
    const keys=await client.query<{id:string;active:boolean}>("select id,active from public.user_passkeys where user_id=$1 and revoked_at is null",[session.userId]);
    const key=keys.rows.find(key=>key.id===credentialId);
    if (!key || (key.active && keys.rows.filter(key=>key.active).length<2)) throw new Error("Add and verify a replacement before removing your last active passkey.");
    await client.query("update public.user_passkeys set active=false,revoked_at=now() where id=$1 and user_id=$2",[credentialId,session.userId]);
    await client.query("insert into public.audit_log (actor_user_id,action,entity_type,entity_id,status) values ($1,'auth.passkey.revoked','user',$2,'success')",[session.userId,session.userId]);
    await client.query("insert into public.audit_log (actor_user_id,action,entity_type,entity_id,status) values ($1,'auth.sessions.revoked','user',$2,'success')",[session.userId,session.userId]);
  });
}

export async function redeemRecoveryCode(session: SessionPayload, code: string) {
  await transaction(async client=>{
    const account=await client.query("select id from public.users where id=$1 and status='active' for update",[session.userId]);
    if (!account.rows.length) throw new Error("Account unavailable.");
    const result=await client.query(`update public.user_recovery_codes set used_at=now()
      where code_hash=$1 and user_id=$2 and used_at is null returning code_hash`,[hashRecoveryCode(code),session.userId]);
    if (!result.rows.length) throw new Error("Recovery code is invalid or already used.");
    await client.query("insert into public.audit_log (actor_user_id,action,entity_type,entity_id,status) values ($1,'auth.passkey.recovery','user',$2,'success')",[session.userId,session.userId]);
  });
}
