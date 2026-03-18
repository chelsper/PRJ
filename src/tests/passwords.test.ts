import { describe, expect, it } from "vitest";

import { hashPassword, verifyPassword } from "@/src/server/auth/passwords";

describe("password hashing", () => {
  it("verifies matching password hashes", () => {
    const hash = hashPassword("test-password");
    expect(verifyPassword("test-password", hash)).toBe(true);
    expect(verifyPassword("wrong-password", hash)).toBe(false);
  });
});
