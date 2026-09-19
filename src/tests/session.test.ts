import { expect, it, vi } from "vitest";
vi.mock("@/server/env", () => ({ env: { SESSION_SECRET: "test-secret-with-at-least-thirty-two-characters" } }));
import { SignJWT } from "jose";
import { createSessionToken, verifySessionToken } from "@/server/auth/session";
it("issues distinct sessions with restricted issuer and audience", async () => {
  const user = { userId: "1", email: "test@example.org", role: "admin" as const };
  const a = await createSessionToken(user), b = await createSessionToken(user);
  expect(a).not.toBe(b);
  expect(await verifySessionToken(a)).toMatchObject(user);
  expect((await verifySessionToken(a))?.sessionId).toBeTruthy();
});
it("rejects invalid, expired and legacy tokens", async () => {
  expect(await verifySessionToken("not-a-token")).toBeNull();
  const secret = new TextEncoder().encode("test-secret-with-at-least-thirty-two-characters");
  const legacy = await new SignJWT({ userId: "1", email: "test@example.org", role: "admin" }).setProtectedHeader({ alg: "HS256" }).setExpirationTime("12h").sign(secret);
  expect(await verifySessionToken(legacy)).toBeNull();
  const expired = await new SignJWT({}).setProtectedHeader({ alg: "HS256" }).setIssuer("pink-ribbon-crm").setAudience("crm-session").setExpirationTime(1).sign(secret);
  expect(await verifySessionToken(expired)).toBeNull();
});
