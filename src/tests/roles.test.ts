import { describe, expect, it } from "vitest";

import { roleHasCapability } from "@/server/auth/roles";

describe("role capabilities", () => {
  it("allows admins to export", () => {
    expect(roleHasCapability("admin", "exports:run")).toBe(true);
  });

  it("denies read_only users from donor writes", () => {
    expect(roleHasCapability("read_only", "donors:write")).toBe(false);
  });
});
