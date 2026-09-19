import { expect, it } from "vitest";
import { csvCell } from "@/lib/csv-security";
it("neutralizes spreadsheet commands even after whitespace", () => {
  for (const value of ["=1+1", "+123", "-1+2", "@SUM(A1)", "  =cmd()", "\tdata", "\rdata", "\n=1"]) expect(csvCell(value).startsWith('"\'')).toBe(true);
});
it("preserves ordinary text and escapes quotes", () => {
  expect(csvCell('Jane, "J"')).toBe('"Jane, ""J"""');
  expect(csvCell("500.00")).toBe('"500.00"');
  expect(csvCell(null)).toBe('""');
});
