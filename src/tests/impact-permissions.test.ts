import { expect, it } from "vitest";
import { roleHasCapability } from "@/server/auth/roles";
it("keeps patient impact data separate from ordinary donor staff access", () => {
  expect(roleHasCapability("admin", "impact:read")).toBe(true);
  expect(roleHasCapability("admin", "impact:write")).toBe(true);
  for (const role of ["staff", "read_only"] as const) {
    expect(roleHasCapability(role, "impact:read")).toBe(false);
    expect(roleHasCapability(role, "impact:write")).toBe(false);
    expect(roleHasCapability(role, "donors:read")).toBe(true);
  }
});
