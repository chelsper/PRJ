import { query } from "@/server/db";
import { queryFields } from "@/lib/profile-query";
export type QueryOptions = Record<string, { value: string; label: string }[]>;
export async function profileQueryOptions(): Promise<QueryOptions> {
  const config = await query<{ set_key: string; value: string; label: string }>("select set_key, value, label from public.field_options order by sort_order, label");
  const result: QueryOptions = {};
  for (const field of queryFields.filter(field => field.options)) {
    if (field.key === "sms_consent") {
      result[field.key] = [{ value: "UNKNOWN", label: "Not documented" }, { value: "OPTED_IN", label: "Opted in" }, { value: "OPTED_OUT", label: "Opted out" }];
      continue;
    }
    if (field.key === "giving_level") {
      result[field.key] = (await query<{ value: string; label: string }>("select distinct giving_level_display as value, giving_level_display as label from public.donor_current_year_giving_levels where giving_level_display is not null order by value")).rows;
      continue;
    }
    const entries = new Map<string, string>();
    config.rows.filter(row => row.set_key === field.options).forEach(row => entries.set(row.value, row.label));
    let table: string; let column: string;
    if (["fund", "campaign", "appeal"].includes(field.key)) { table = field.options!; column = "name"; }
    else {
      table = field.source === "gift" ? "gifts" : field.source === "address" || field.key === "state" ? "donor_addresses" : "donors";
      column = field.column ?? ({ type: "donor_type", state: "state_region" } as Record<string, string>)[field.key];
    }
    // Identifiers come only from the static field registry, never user input.
    const existing = await query<{ value: string }>(`select distinct ${column}::text as value from public.${table} where ${column} is not null and ${column}::text <> '' order by value`);
    for (const row of existing.rows) if (!entries.has(row.value)) entries.set(row.value, row.value.replaceAll("_", " "));
    if (field.options === "boolean") { entries.set("true", "Yes"); entries.set("false", "No"); }
    if (field.key === "type") { entries.set("INDIVIDUAL", "Individual"); entries.set("ORGANIZATION", "Organization"); }
    result[field.key] = [...entries].map(([value, label]) => ({ value, label }));
  }
  return result;
}
