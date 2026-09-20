import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("@/server/db", () => ({ query: vi.fn(), transaction: vi.fn() }));
vi.mock("@/server/audit", () => ({ writeAuditLog: vi.fn() }));
import { query, transaction } from "@/server/db";
import { importConstituentRecords } from "@/server/data/donors";
import { importIdentityKeys } from "@/lib/import-review";

const actor = { userId: "test-user" };
const mapping = { First: "first_name", Last: "last_name", Email: "primary_email" };
const row = { First: "Sample", Last: "Donor", Email: "sample@example.org" };
beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(query).mockResolvedValue({ rows: [] } as never);
});

describe("constituent import review", () => {
  it("previews new rows without inserts or transactions", async () => {
    const result = await importConstituentRecords([row], mapping, actor, true);
    expect(result.readyCount).toBe(1);
    expect(result.createdCount).toBe(0);
    expect(result.rowResults[0].status).toBe("new");
    expect(transaction).not.toHaveBeenCalled();
    expect(vi.mocked(query).mock.calls.every(([sql]) => /^\s*select/i.test(sql))).toBe(true);
  });
  it("separates same-file duplicates and validation errors", async () => {
    const result = await importConstituentRecords([row, { ...row, First: " sample " }, { ...row, Email: "invalid" }], mapping, actor, true);
    expect(result.readyCount).toBe(1);
    expect(result.duplicateCount).toBe(1);
    expect(result.errorCount).toBe(1);
    expect(result.rowResults.map(item => item.status)).toEqual(["new", "duplicate", "error"]);
    expect(transaction).not.toHaveBeenCalled();
  });
  it("skips existing CRM numbers", async () => {
    vi.mocked(query).mockResolvedValue({ rows: [{ id: "1" }] } as never);
    const result = await importConstituentRecords([{ ...row, ID: "500000" }], { ...mapping, ID: "donor_number" }, actor, true);
    expect(result.duplicateCount).toBe(1);
    expect(result.readyCount).toBe(0);
    expect(transaction).not.toHaveBeenCalled();
  });
  it("skips existing email or name candidates without modifying them", async () => {
    vi.mocked(query).mockResolvedValue({ rows: [{ full_name: "Existing Person" }] } as never);
    const result = await importConstituentRecords([row], mapping, actor, true);
    expect(result.rowResults[0].message).toContain("Existing Person");
    expect(result.duplicateCount).toBe(1);
    expect(transaction).not.toHaveBeenCalled();
  });
  it("fails the review if the database check fails", async () => {
    vi.mocked(query).mockRejectedValue(new Error("offline"));
    await expect(importConstituentRecords([row], mapping, actor, true)).rejects.toThrow("offline");
    expect(transaction).not.toHaveBeenCalled();
  });
  it("checks current matches again on submission", async () => {
    await importConstituentRecords([row], mapping, actor, true);
    vi.mocked(query).mockResolvedValue({ rows: [{ full_name: "Recently added" }] } as never);
    const result = await importConstituentRecords([row], mapping, actor);
    expect(result.createdCount).toBe(0);
    expect(result.duplicateCount).toBe(1);
    expect(transaction).not.toHaveBeenCalled();
  });
  it("normalizes conservative file identities", () => {
    expect(importIdentityKeys({ donorType: "ORGANIZATION", organizationName: " Sample Org ", primaryEmail: "TEST@example.org" }, "123"))
      .toEqual(["id:123", "email:test@example.org", "org:sample org"]);
    expect(importIdentityKeys({ donorType: "INDIVIDUAL" }, "")).toEqual([]);
  });
});
