import { beforeEach, expect, it, vi } from "vitest";
vi.mock("@/server/auth/permissions", () => ({ requireCapability: vi.fn() }));
vi.mock("@/server/security/csrf", () => ({ assertSameOrigin: vi.fn() }));
vi.mock("@/server/security/rate-limit", () => ({ consumeRateLimit: vi.fn() }));
vi.mock("@/server/audit", () => ({ writeAuditLog: vi.fn() }));
vi.mock("@/server/db", () => ({ transaction: vi.fn() }));
vi.mock("next/headers", () => ({ headers: vi.fn(async () => new Headers()) }));
import { requireCapability } from "@/server/auth/permissions";
import { assertSameOrigin } from "@/server/security/csrf";
import { transaction } from "@/server/db";
import { writeAuditLog } from "@/server/audit";
import { exportProfileQuery } from "@/app/(admin)/reports/queries/actions";
import { queryPresets } from "@/lib/query-workspace";

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(requireCapability).mockResolvedValue({ userId: "test" } as never);
  vi.mocked(transaction).mockResolvedValue({ rows: [{ id: "1", donor_number: "500000", full_name: "Sample Donor", total_cents: "50000", has_hard: true, has_soft: false, rule_0: true, match_count: "1" }] });
});

it("rechecks matches, requires export access and audits the count without filter values", async () => {
  const result = await exportProfileQuery(queryPresets[0].query, 1);
  expect(result.csv).toContain("Sample Donor");
  for (const capability of ["exports:run", "reports:read", "donors:read", "gifts:read"]) expect(requireCapability).toHaveBeenCalledWith(capability);
  expect(writeAuditLog).toHaveBeenCalledWith(expect.objectContaining({ metadata: { rowCount: 1 } }));
});
it("does not export when the reviewed count changed", async () => {
  const result = await exportProfileQuery(queryPresets[0].query, 2);
  expect(result.error).toContain("count has changed");
  expect(result.csv).toBeUndefined();
  expect(writeAuditLog).not.toHaveBeenCalled();
});
it("blocks cross-origin and unauthorized requests before querying", async () => {
  vi.mocked(assertSameOrigin).mockRejectedValueOnce(new Error("origin"));
  await expect(exportProfileQuery(queryPresets[0].query, 1)).rejects.toThrow("origin");
  expect(transaction).not.toHaveBeenCalled();
  vi.mocked(requireCapability).mockRejectedValueOnce(new Error("denied"));
  await expect(exportProfileQuery(queryPresets[0].query, 1)).rejects.toThrow("denied");
  expect(transaction).not.toHaveBeenCalled();
});
it("fails closed if the export audit cannot be recorded", async () => {
  vi.mocked(writeAuditLog).mockRejectedValue(new Error("offline"));
  const result = await exportProfileQuery(queryPresets[0].query, 1);
  expect(result.csv).toBeUndefined();
  expect(result.error).toContain("could not complete");
});
