import { beforeEach, expect, it, vi } from "vitest";
const db = vi.hoisted(() => ({ query: vi.fn() }));
vi.mock("@/server/db", () => ({ transaction: (fn: (client: typeof db) => unknown) => fn(db) }));
import { consumeRateLimit } from "@/server/security/rate-limit";
beforeEach(() => vi.resetAllMocks());
const input = { key: "user:1", action: "test", maxAttempts: 2, windowSeconds: 60 };
it("locks, checks and reserves the attempt", async () => {
  db.query.mockResolvedValueOnce({ rows: [] }).mockResolvedValueOnce({ rows: [{ allowed: true }] }).mockResolvedValueOnce({ rows: [] });
  await consumeRateLimit(input);
  expect(db.query.mock.calls[0][0]).toContain("advisory_xact_lock");
  expect(db.query.mock.calls[2][0]).toContain("insert");
});
it("fails closed on a missing security table", async () => {
  db.query.mockResolvedValueOnce({ rows: [] }).mockRejectedValueOnce({ code: "42P01" });
  await expect(consumeRateLimit(input)).rejects.toEqual({ code: "42P01" });
});
it("blocks requests at the limit", async () => {
  db.query.mockResolvedValueOnce({ rows: [] }).mockResolvedValueOnce({ rows: [{ allowed: false }] });
  await expect(consumeRateLimit(input)).rejects.toThrow("Too many requests");
  expect(db.query).toHaveBeenCalledTimes(2);
});
