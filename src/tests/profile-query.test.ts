import { describe, expect, it } from "vitest";
import { profileQuerySchema, type ProfileQuery } from "@/lib/profile-query";
import { compileProfileQuery } from "@/server/data/profile-query";
const base: ProfileQuery = { mode: "all", credit: "hard", period: "year", rules: [{ field: "total", operator: "gte", value: "500.25" }] };
describe("profile query builder", () => {
  it("binds dollars as cents and excludes soft credits by default", () => {
    const result = compileProfileQuery(base);
    expect(result.params).toEqual([50025]);
    expect(result.sql).not.toContain("public.soft_credits");
    expect(result.sql).toContain("date_trunc('year'");
  });
  it("deduplicates gifts per profile with hard-credit precedence", () => {
    const result = compileProfileQuery({ ...base, credit: "both" });
    expect(result.sql).toContain("public.soft_credits");
    expect(result.sql).toContain("group by donor_id, gift_id");
    expect(result.sql).toContain("coalesce(max(amount) filter(where hard), max(amount))");
  });
  it("keeps values out of SQL", () => {
    const value = "' OR 1=1 --";
    const result = compileProfileQuery({ ...base, rules: [{ field: "name", operator: "contains", value }] });
    expect(result.sql).not.toContain(value);
    expect(result.params).toEqual([value]);
  });
  it("supports any/all and blank fields", () => {
    const result = compileProfileQuery({ ...base, mode: "any", period: "all", rules: [{ field: "email", operator: "blank", value: "" }, ...base.rules] });
    expect(result.sql).toContain("rule_0 or rule_1");
    expect(result.sql).not.toContain("date_trunc");
  });
  it("rejects unknown fields, invalid amounts and incompatible operators", () => {
    for (const rule of [{ field: "password", operator: "equals", value: "x" }, { field: "total", operator: "gte", value: "-1" }, { field: "email", operator: "gte", value: "10" }]) {
      expect(profileQuerySchema.safeParse({ ...base, rules: [rule] }).success).toBe(false);
    }
  });
});
