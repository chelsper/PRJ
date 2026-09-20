import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { Client } from "pg";
const client=new Client({host:"127.0.0.1",port:55439,database:"postgres",user:process.env.USER});
try {
  await client.connect();
  await client.query("begin");
  await client.query("set local role crm_runtime");
  const user=await client.query("insert into public.users (email,password_hash,role) values ('synthetic-passkey@example.invalid','not-a-real-password','admin') returning id");
  const userId=user.rows[0].id,challengeId=randomUUID(),sessionId=randomUUID();
  await client.query("insert into public.passkey_challenges (id,user_id,session_id,purpose,challenge,expires_at) values ($1,$2,$3,'authenticate','synthetic',now()+interval '5 minutes')",[challengeId,userId,sessionId]);
  const consume="update public.passkey_challenges set consumed_at=now() where id=$1 and user_id=$2 and session_id=$3 and consumed_at is null and expires_at>now() returning id";
  assert.equal((await client.query(consume,[challengeId,userId,randomUUID()])).rowCount,0);
  assert.equal((await client.query(consume,[challengeId,userId,sessionId])).rowCount,1);
  assert.equal((await client.query(consume,[challengeId,userId,sessionId])).rowCount,0);
  await client.query("insert into public.user_recovery_codes (code_hash,user_id) values ('synthetic-hash',$1)",[userId]);
  const redeem="update public.user_recovery_codes set used_at=now() where code_hash=$1 and user_id=$2 and used_at is null returning code_hash";
  assert.equal((await client.query(redeem,["synthetic-hash",userId])).rowCount,1);
  assert.equal((await client.query(redeem,["synthetic-hash",userId])).rowCount,0);
  await client.query("rollback");
  console.log("Passkey storage passed: session-bound challenges and one-time challenge/recovery consumption; all synthetic rows rolled back.");
} finally {await client.end();}
