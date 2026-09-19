import { describe, expect, it, vi, beforeEach } from "vitest";
import type { QualityDonor } from "@/server/data/data-quality-rules";

const db = vi.hoisted(() => ({ query: vi.fn() }));
vi.mock("@/server/db", () => ({ query: vi.fn(), transaction: (fn: (client: typeof db) => unknown) => fn(db) }));
import { pairFingerprint, recordDuplicateReview } from "@/server/data/duplicate-review";

const a: QualityDonor = { id: "1", donor_number: "500001", donor_type: "INDIVIDUAL", full_name: "Faith Collins", primary_email: "faith@example.org", alternate_email: null, primary_phone: null, spouse_donor_id: null };
const b = { ...a, id: "2" };
const input = { leftId: a.id, rightId: b.id, fingerprint: pairFingerprint([a, b]), decision: "dismiss" as const, reason: "Confirmed different people", userId: "1" };

beforeEach(() => { db.query.mockReset(); db.query.mockImplementation(async (sql: string) => ({ rows: sql.includes("from public.donors") ? [a, b] : [] })); });
describe("duplicate review decisions", () => {
  it("fingerprints pairs consistently regardless of order", () => {
    expect(pairFingerprint([a, b])).toBe(pairFingerprint([b, a]));
    expect(pairFingerprint([a, { ...b, primary_email: "new@example.org" }])).not.toBe(input.fingerprint);
  });
  it("writes an audited dismissal without updating donors", async () => {
    expect((await recordDuplicateReview(input)).success).toBe(true);
    const statements = db.query.mock.calls.map(call => call[0]);
    expect(statements.some(sql => sql.includes("insert into public.audit_log"))).toBe(true);
    expect(statements.some(sql => /^\s*(update|delete)\b/i.test(sql))).toBe(false);
  });
  it("rejects stale record details without recording a decision", async () => {
    expect((await recordDuplicateReview({ ...input, fingerprint: "outdated" })).success).toBe(false);
    expect(db.query.mock.calls.some(call => call[0].includes("insert"))).toBe(false);
  });
  it("rejects missing or deleted records", async () => {
    db.query.mockResolvedValue({ rows: [] });
    expect((await recordDuplicateReview(input)).success).toBe(false);
  });
  it("records reopening as a separate audit event", async () => {
    await recordDuplicateReview({ ...input, decision: "reopen" });
    expect(db.query.mock.calls.at(-1)?.[1][1]).toBe("quality.duplicate.reopened");
  });
});
