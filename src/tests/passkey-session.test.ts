import { beforeEach,expect,it,vi } from "vitest";
const db=vi.hoisted(()=>({query:vi.fn()}));
vi.mock("@/server/db",()=>db);
vi.mock("next/headers",()=>({cookies:async()=>({get:()=>({value:"token"})})}));
const auth=vi.hoisted(()=>({verifySessionToken:vi.fn()}));
vi.mock("@/server/auth/session",()=>auth);
import { getCurrentSession,getPasswordSession } from "@/server/auth/session-store";
beforeEach(()=>{
  vi.resetAllMocks();
  auth.verifySessionToken.mockResolvedValue({userId:"1",sessionId:"session",issuedAt:1,passkeyVerified:false});
  db.query.mockResolvedValueOnce({rows:[{id:"1",email:"test@example.org",role:"admin",status:"active"}]});
});
it("blocks password-only sessions when a passkey is active",async()=>{
  db.query.mockResolvedValueOnce({rows:[{id:"key"}]});
  expect(await getCurrentSession()).toBeNull();
});
it("keeps the pending session limited to the second-factor flow",async()=>{
  expect(await getPasswordSession()).toMatchObject({userId:"1",passkeyVerified:false});
});
it("accepts signed passkey-verified sessions",async()=>{
  auth.verifySessionToken.mockResolvedValue({userId:"1",sessionId:"session",issuedAt:1,passkeyVerified:true});
  db.query.mockResolvedValueOnce({rows:[{id:"key"}]});
  expect(await getCurrentSession()).toMatchObject({passkeyVerified:true});
});
it("does not enforce incomplete enrollment",async()=>{
  db.query.mockResolvedValueOnce({rows:[]});
  expect(await getCurrentSession()).toMatchObject({userId:"1"});
});
it("fails closed when passkey policy cannot be read",async()=>{
  db.query.mockRejectedValueOnce(new Error("Database unavailable"));
  await expect(getCurrentSession()).rejects.toThrow();
});
