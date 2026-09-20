import { beforeEach,expect,it,vi } from "vitest";
const db=vi.hoisted(()=>({query:vi.fn(),transaction:vi.fn(),client:{query:vi.fn()}}));
const webauthn=vi.hoisted(()=>({generateRegistrationOptions:vi.fn(),generateAuthenticationOptions:vi.fn(),verifyRegistrationResponse:vi.fn(),verifyAuthenticationResponse:vi.fn()}));
vi.mock("@/server/db",()=>db);
vi.mock("@simplewebauthn/server",()=>webauthn);
vi.mock("@/server/env",()=>({env:{APP_URL:"https://crm.example.org"}}));
import { hashRecoveryCode,verifyPasskey,redeemRecoveryCode } from "@/server/auth/passkeys";
const session={userId:"1",email:"test@example.org",role:"admin" as const,sessionId:"fake-session"};
const response={id:"key",rawId:"key",type:"public-key" as const,clientExtensionResults:{},response:{clientDataJSON:"data",authenticatorData:"data",signature:"signature"}};
beforeEach(()=>{
  vi.resetAllMocks();
  db.transaction.mockImplementation(fn=>fn({query:(sql:string,...args:unknown[])=>sql.startsWith("select id from public.users") ? Promise.resolve({rows:[{id:"1"}]}) : db.client.query(sql,...args)}));
});
it("hashes high-entropy recovery codes and normalizes formatting",()=>{
  expect(hashRecoveryCode("ABCD-1234")).toBe(hashRecoveryCode("abcd1234"));
  expect(hashRecoveryCode("abcd1234")).not.toBe("abcd1234");
});
it("rejects missing, consumed, expired or differently bound challenges",async()=>{
  db.client.query.mockResolvedValueOnce({rows:[]});
  await expect(verifyPasskey(session,"challenge",response,true)).rejects.toThrow("expired or already used");
  expect(db.client.query.mock.calls[0][0]).toContain("session_id=$3");
  expect(db.client.query.mock.calls[0][0]).toContain("consumed_at is null and expires_at>now()");
  expect(webauthn.verifyAuthenticationResponse).not.toHaveBeenCalled();
});
it("does not permit pending sessions to activate another key",async()=>{
  db.client.query.mockResolvedValueOnce({rows:[{purpose:"activate",challenge:"c",credential_id:"key"}]});
  await expect(verifyPasskey(session,"challenge",response,false)).rejects.toThrow("Complete existing");
});
it("requires active account-bound credentials for sign-in",async()=>{
  db.client.query.mockResolvedValueOnce({rows:[{purpose:"authenticate",challenge:"c"}]}).mockResolvedValueOnce({rows:[{id:"key",active:false}]});
  await expect(verifyPasskey(session,"challenge",response,false)).rejects.toThrow("does not match");
});
it("pins origin, RP, challenge and device user verification",async()=>{
  db.client.query.mockResolvedValueOnce({rows:[{purpose:"authenticate",challenge:"c"}]}).mockResolvedValueOnce({rows:[{id:"key",active:true,public_key:Buffer.from("pk"),counter:"1",transports:[]}]}).mockResolvedValue({rows:[]});
  webauthn.verifyAuthenticationResponse.mockResolvedValue({verified:true,authenticationInfo:{newCounter:2}});
  await verifyPasskey(session,"challenge",response,false);
  expect(webauthn.verifyAuthenticationResponse).toHaveBeenCalledWith(expect.objectContaining({expectedChallenge:"c",expectedOrigin:"https://crm.example.org",expectedRPID:"crm.example.org",requireUserVerification:true}));
  expect(db.client.query.mock.calls.some(call=>String(call[0]).includes("counter=$2"))).toBe(true);
});
it("does not consume another account's recovery code or allow reuse",async()=>{
  db.client.query.mockResolvedValueOnce({rows:[]});
  await expect(redeemRecoveryCode(session,"code")).rejects.toThrow("invalid or already used");
  expect(db.client.query.mock.calls[0][0]).toContain("user_id=$2 and used_at is null");
});
