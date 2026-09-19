import { describe, expect, it } from "vitest";
import { profileQuerySchema, queryFields, type ProfileQuery } from "@/lib/profile-query";
import { compileProfileQuery } from "@/server/data/profile-query";
const base: ProfileQuery = { mode: "all", credit: "hard", period: "year", rules: [{ field: "total", operator: "gte", value: "500.25" }] };
describe("profile query builder", () => {
  it("supports inclusive custom dates and requires a gift when requested", () => {
    const result = compileProfileQuery({ ...base, period: "custom", from: "2026-01-01", to: "2026-06-30", requireGift: true });
    expect(result.params).toEqual([50025, "2026-01-01", "2026-06-30"]);
    expect(result.sql).toContain("gift_date between $2::date and $3::date");
    expect(result.sql).toContain("and has_gift");
  });
  it("combines amount bounds on one gift", () => {
    const result = compileProfileQuery({ ...base, sameGift: true, rules: [{ field: "amount", operator: "between", value: "100", valueTo: "500" }, { field: "fund", operator: "equals", value: "General Fund" }] });
    expect(result.params).toEqual([10000, 50000, "General Fund"]);
    expect(result.sql).toContain("c.amount between $1::numeric and $2::numeric");
    expect(result.sql).toContain("where (gift_group)");
  });
  it("rejects reversed or impossible date ranges and fractional counts", () => {
    expect(profileQuerySchema.safeParse({ ...base, period: "custom", from: "2026-02-30", to: "2026-03-10" }).success).toBe(false);
    expect(profileQuerySchema.safeParse({ ...base, period: "custom", from: "2026-04-01", to: "2026-03-10" }).success).toBe(false);
    expect(profileQuerySchema.safeParse({ ...base, rules: [{ field: "installment_count", operator: "equals", value: "1.5" }] }).success).toBe(false);
  });
  it("compiles every registered field without undefined identifiers", () => {
    for (const field of queryFields) {
      const result = compileProfileQuery({ ...base, rules: [{ field: field.key, operator: "equals", value: field.date ? "2026-01-01" : field.numeric ? "1" : "test" }] });
      expect(result.sql).not.toContain("undefined");
    }
  });
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
