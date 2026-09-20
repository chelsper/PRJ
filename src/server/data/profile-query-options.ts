import { query } from "@/server/db";
import { queryFields, fixedFieldOptions, type FieldOption } from "@/lib/crm-fields";
export type QueryOptions = Record<string, FieldOption[]>;

export async function profileQueryOptions(): Promise<QueryOptions> {
  const fields = queryFields.filter(field => field.options);
  const params: string[] = [];
  const selects: string[] = [];
  for (const field of fields) {
    if (field.options === "boolean" || field.options === "sms_consent") continue;
    params.push(field.key);
    const key = `$${params.length}::text`;
    if (field.key === "giving_level") {
      selects.push(`select ${key} as field, gl.giving_level_display::text as value from public.donor_current_year_giving_levels gl join public.donors d on d.id=gl.donor_id where d.deleted_at is null`);
    } else if (["fund", "campaign", "appeal"].includes(field.key)) {
      const table = { fund: "funds", campaign: "campaigns", appeal: "appeals" }[field.key as "fund" | "campaign" | "appeal"];
      // Archived codes remain queryable for historical gifts.
      selects.push(`select ${key} as field, name::text as value from public.${table}`);
    } else {
      const column = field.column;
      if (!column || !/^[a-z_]+$/.test(column)) throw new Error("Invalid registered option column");
      if (field.source === "address") {
        selects.push(`select ${key} as field, a.${column}::text as value from public.donor_addresses a join public.donors d on d.id=a.donor_id where a.is_primary and d.deleted_at is null`);
      } else {
        const table = field.source === "gift" ? "gifts" : "donors";
        selects.push(`select ${key} as field, ${column}::text as value from public.${table} where deleted_at is null`);
      }
    }
  }
  // Two bounded round trips instead of one sequential query for every dropdown.
  const [config, existing] = await Promise.all([
    query<{ set_key: string; value: string; label: string }>("select set_key, value, label from public.field_options order by sort_order, label"),
    query<{ field: string; value: string }>(`select distinct field, value from (${selects.join(" union all ")}) options where value is not null and value <> '' order by field, value`, params)
  ]);
  return Object.fromEntries(fields.map(field => {
    const entries = new Map<string, string>((fixedFieldOptions[field.options!] ?? []).map(option => [option.value, option.label]));
    // Keep configured labels, including historical inactive values, for accurate exact matches.
    for (const option of config.rows.filter(row => row.set_key === field.options && !["giving_levels", "boolean", "sms_consent", "donor_types", "gift_types", "payment_methods", "frequencies"].includes(field.options!))) entries.set(option.value, option.label);
    for (const row of existing.rows.filter(row => row.field === field.key)) {
      if (!entries.has(row.value)) entries.set(row.value, row.value.replaceAll("_", " "));
    }
    return [field.key, [...entries].map(([value, label]) => ({ value, label }))];
  }));
}
