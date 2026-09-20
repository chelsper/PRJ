import { beforeEach, expect, it, vi } from "vitest";
vi.mock("@/server/db", () => ({ query: vi.fn() }));
import { query } from "@/server/db";
import { profileQueryOptions } from "@/server/data/profile-query-options";
import { queryFields } from "@/lib/crm-fields";

beforeEach(() => vi.resetAllMocks());
it("loads all dropdowns in two queries while retaining configured labels and historical values", async () => {
  vi.mocked(query).mockResolvedValueOnce({ rows: [{ set_key: "genders", value: "UNASSIGNED", label: "Unassigned" }] } as never)
    .mockResolvedValueOnce({ rows: [{ field: "gender", value: "UNASSIGNED" }, { field: "gender", value: "LEGACY" }, { field: "state", value: "FL" }] } as never);
  const options = await profileQueryOptions();
  expect(query).toHaveBeenCalledTimes(2);
  expect(Object.keys(options).sort()).toEqual(queryFields.filter(f => f.options).map(f => f.key).sort());
  expect(options.gender).toContainEqual({ value: "UNASSIGNED", label: "Unassigned" });
  expect(options.gender).toContainEqual({ value: "LEGACY", label: "LEGACY" });
  expect(options.state).toContainEqual({ value: "FL", label: "FL" });
  expect(options.receipt_sent).toEqual([{ value: "true", label: "Yes" }, { value: "false", label: "No" }]);
  expect(options.gift_type).toContainEqual({ value: "GIFT_IN_KIND", label: "Gift-in-Kind" });
  const sql = vi.mocked(query).mock.calls[1][0];
  expect(sql).not.toContain("undefined");
  expect(sql).toContain("a.is_primary and d.deleted_at is null");
});
