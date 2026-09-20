import { describe, expect, it } from "vitest";
import { describeQuery, queryPresets, readSavedQueries, saveQuery } from "@/lib/query-workspace";
import { profileQuerySchema } from "@/lib/profile-query";
import { compileProfileQuery } from "@/server/data/profile-query";
import { queryResultsCsv } from "@/lib/query-export";

describe("practical saved queries", () => {
  it("validates every preset and preserves distinct total and single-gift semantics", () => {
    for (const preset of queryPresets) expect(profileQuerySchema.safeParse(preset.query).success).toBe(true);
    const range = queryPresets.find(p => p.id === "gift-range")!.query;
    expect(compileProfileQuery(range).params).toEqual([10000, 50000]);
    expect(range.sameGift).toBe(true);
    expect(queryPresets.find(p => p.id === "recognition-range")!.query.rules[0].field).toBe("total");
    expect(queryPresets.find(p => p.id === "individuals")!.query.requireGift).toBe(false);
  });
  it("filters invalid browser data and deduplicates saved names", () => {
    const query = queryPresets[0].query;
    expect(readSavedQueries([{ name: "First", query }, { name: " first ", query }, { name: "Bad", query: {} }, null, { name: " ", query }])).toEqual([{ name: "First", query }]);
    expect(readSavedQueries({})).toEqual([]);
  });
  it("limits saved queries but allows replacement without losing unrelated filters", () => {
    const query = queryPresets[0].query;
    const saved = Array.from({ length: 30 }, (_, i) => ({ name: `List ${i}`, query }));
    expect(() => saveQuery(saved, "New list", query)).toThrow("30");
    const updated = saveQuery(saved, "list 0", queryPresets[1].query);
    expect(updated).toHaveLength(30);
    expect(updated.at(-1)?.query.rules[0].operator).toBe("between");
    expect(saved[0].query.rules[0].operator).toBe("gte");
  });
  it("saves filters only and summarizes configured labels and credit mode", () => {
    const query = { ...queryPresets[3].query, credit: "both" as const };
    const summary = describeQuery(query, { type: [{ value: "INDIVIDUAL", label: "Individual" }] });
    expect(summary.rules[0]).toContain("Individual");
    expect(summary.credit).toContain("without counting the same gift twice");
    expect(summary.period).toBe("all time");
    expect(Object.keys(saveQuery([], "People", query)[0])).toEqual(["name", "query"]);
  });
});

describe("query summary CSV", () => {
  const row = { id: "1", name: "=HYPERLINK(\"bad\")", number: "500000", total: "100.00", credit: "Hard credit", reasons: ["Matched"] };
  it("rejects truncated, oversized and empty exports", () => {
    expect(() => queryResultsCsv([row], 201)).toThrow("Partial");
    expect(() => queryResultsCsv([row], 2)).toThrow("Partial");
    expect(() => queryResultsCsv([], 0)).toThrow("No profiles");
  });
  it("escapes CSV and spreadsheet formulas", () => {
    const csv = queryResultsCsv([row], 1);
    expect(csv).toContain("Recognition in selected period ($)");
    expect(csv).toContain("'=HYPERLINK");
    expect(csv.split("\r\n")).toHaveLength(2);
  });
});
