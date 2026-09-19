type SearchableDonor = {
  donor_name: string | null;
  donor_number: string | null;
  primary_email: string | null;
  giving_level_internal: string | null;
};

export function filterReportRows<T extends SearchableDonor>(rows: T[], filters: { query: string; givingLevel: string }): T[] {
  const search = filters.query.trim().toLowerCase();
  return rows.filter(row =>
    (!filters.givingLevel || row.giving_level_internal === filters.givingLevel) &&
    (!search || [row.donor_name, row.donor_number, row.primary_email].some(value => String(value ?? "").toLowerCase().includes(search)))
  );
}

export function buildReportPreview<T extends object>(rows: T[], columns: (keyof T)[]) {
  return rows.slice(0, 25).map(row => Object.fromEntries(columns.map(column => [column,
    column === "total_amount_received" || column === "total_amount_pledged"
      ? (Number(row[column]) / 100).toFixed(2) : row[column] ?? ""
  ])));
}
