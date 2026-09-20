import { describe, expect, it } from "vitest";
import { assertOutboundSmsAllowed } from "@/server/security/outbound-policy";

describe("outbound texting safety", () => {
  it.each([undefined, "preview", "development", "unknown"])("blocks %s", (value) => {
    expect(() => assertOutboundSmsAllowed({ VERCEL_ENV: value, NODE_ENV: "production" })).toThrow();
  });
  it("allows production unless the emergency switch is set", () => {
    expect(() => assertOutboundSmsAllowed({ VERCEL_ENV: "production" })).not.toThrow();
    expect(() => assertOutboundSmsAllowed({ VERCEL_ENV: "production", OUTBOUND_SMS_DISABLED: "true" })).toThrow();
  });
});
