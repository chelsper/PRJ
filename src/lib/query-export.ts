import { csvCell } from "./csv-security";

export type QueryExportRow = { id: string; name: string; number: string; total: string; credit: string; reasons: string[] };
export function queryResultsCsv(rows: QueryExportRow[], count: number) {
  if (count > 200 || rows.length !== count) throw new Error("Narrow the query to 200 profiles or fewer. Partial exports are not allowed.");
  if (!count) throw new Error("No profiles match this query.");
  return [
    ["Constituent ID", "Donor name", "Recognition in selected period ($)", "Credit in period", "Why matched"],
    ...rows.map(row => [row.number, row.name, row.total, row.credit, row.reasons.join("; ")])
  ].map(row => row.map(csvCell).join(",")).join("\r\n");
}
