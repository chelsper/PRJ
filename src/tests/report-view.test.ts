import { describe, expect, it } from "vitest";
import { buildReportPreview, filterReportRows } from "@/server/data/report-view";

const rows = [
  { donor_name: "Faith Collins", donor_number: "500001", primary_email: "faith@example.org", giving_level_internal: "HOPE", total_amount_received: 12345 },
  { donor_name: "Elise Nguyen", donor_number: "500002", primary_email: null, giving_level_internal: null, total_amount_received: 0 }
];

describe("report view", () => {
  it("searches full names, IDs and emails case insensitively", () => {
    for (const query of [" faith collins ", "500001", "FAITH@EXAMPLE"]) {
      expect(filterReportRows(rows, { query, givingLevel: "" })).toEqual([rows[0]]);
    }
  });
  it("combines filters and handles no matches and missing values", () => {
    expect(filterReportRows(rows, { query: "Elise", givingLevel: "HOPE" })).toEqual([]);
    expect(filterReportRows(rows, { query: "", givingLevel: "" })).toEqual(rows);
  });
  it("preserves selected column order and formats amounts consistently", () => {
    const preview = buildReportPreview(rows, ["total_amount_received", "donor_name", "primary_email"]);
    expect(Object.keys(preview[0])).toEqual(["total_amount_received", "donor_name", "primary_email"]);
    expect(preview[0].total_amount_received).toBe("123.45");
    expect(preview[1].primary_email).toBe("");
  });
  it("limits preview without truncating the export rows", () => {
    const many = Array.from({ length: 30 }, () => rows[0]);
    expect(buildReportPreview(many, ["donor_name"])).toHaveLength(25);
    expect(many).toHaveLength(30);
  });
});
