import { expect, it } from "vitest";
import { constituentImportSchema } from "@/lib/import-validation";
import { roleHasCapability } from "@/server/auth/roles";
const valid = { fileName: "contacts.csv", rows: [{ Name: "Test" }], mapping: { Name: "first_name" } };
it("accepts bounded valid imports", () => expect(constituentImportSchema.safeParse(valid).success).toBe(true));
it("rejects unknown fields, duplicate targets, missing columns and oversized batches", () => {
  for (const patch of [{ mapping: { Name: "password" } }, { mapping: { Name: "first_name", Other: "first_name" } }, { mapping: { Missing: "first_name" } }, { rows: Array(1001).fill({ Name: "Test" }) }]) {
    expect(constituentImportSchema.safeParse({ ...valid, ...patch }).success).toBe(false);
  }
});
it("rejects unsafe header keys", () => expect(constituentImportSchema.safeParse({ ...valid, rows: [JSON.parse('{"__proto__":"x"}')] }).success).toBe(false));
it("limits imports to admins", () => {
  expect(roleHasCapability("admin", "imports:run")).toBe(true);
  expect(roleHasCapability("staff", "imports:run")).toBe(false);
  expect(roleHasCapability("read_only", "imports:run")).toBe(false);
});
