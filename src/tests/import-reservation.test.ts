import { beforeEach, expect, it, vi } from "vitest";
const db = vi.hoisted(() => ({ query: vi.fn() }));
vi.mock("@/server/db", () => ({ transaction: (fn: (client: typeof db) => unknown) => fn(db) }));
import { importFingerprint, reserveImport } from "@/server/security/import-reservation";
beforeEach(() => vi.resetAllMocks());
it("detects repeat mapped data despite row order or source header changes", () => {
  expect(importFingerprint([{ Name: "Amy" }, { Name: "Bob" }], { Name: "first_name" })).toBe(importFingerprint([{ First: "Bob" }, { First: "Amy" }], { First: "first_name" }));
});
it("distinguishes changed mapped values", () => {
  expect(importFingerprint([{ Name: "Amy" }], { Name: "first_name" })).not.toBe(importFingerprint([{ Name: "Bob" }], { Name: "first_name" }));
});
it("blocks an already submitted batch before reserving another", async () => {
  db.query.mockResolvedValueOnce({ rows: [] }).mockResolvedValueOnce({ rows: [{ entity_id: "old" }] });
  expect(await reserveImport({ fingerprint: "hash", batchId: "new", userId: "1", fileName: "test.csv", rowCount: 1, ipAddress: null })).toBe(false);
  expect(db.query).toHaveBeenCalledTimes(2);
});
