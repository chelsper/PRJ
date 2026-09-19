import { z } from "zod";

export type QueryField = { key: string; label: string; category: string; numeric: boolean; date?: boolean; money?: boolean; options?: string; source?: "donor" | "address" | "gift"; column?: string };
export const queryFields: QueryField[] = [
  { key: "name", label: "Name", category: "Constituents", numeric: false },
  { key: "id", label: "Constituent ID", category: "Constituents", numeric: false },
  { key: "email", label: "Primary email", category: "Constituents", numeric: false },
  { key: "type", label: "Record type (INDIVIDUAL / ORGANIZATION)", category: "Constituents", numeric: false },
  { key: "city", label: "Primary address city", category: "Constituents", numeric: false },
  { key: "state", label: "Primary address state / region", category: "Constituents", numeric: false },
  { key: "total", label: "Total recognition ($)", category: "Gifts", numeric: true },
  { key: "amount", label: "One credited gift amount ($)", category: "Gifts", numeric: true },
  { key: "fund", label: "Fund name", category: "Gifts", numeric: false },
  { key: "campaign", label: "Campaign name", category: "Gifts", numeric: false },
  { key: "appeal", label: "Appeal name", category: "Gifts", numeric: false }
];
const addFields = (source: "donor" | "address" | "gift", fields: string[]) => fields.forEach(spec => {
  const [column, label, options] = spec.split("|");
  queryFields.push({ key: column, column, label, options, source, category: source === "gift" ? "Gifts" : "Constituents", numeric: false });
});
queryFields.push({ key: "giving_level", label: "Current-year giving level", category: "Constituents", numeric: false, options: "giving_levels" });
queryFields.push({ key: "sms_consent", label: "Saved texting consent", category: "Constituents", numeric: false, options: "sms_consent" });
addFields("donor", ["title|Title|titles", "gender|Gender|genders", "first_name|First name", "middle_name|Middle name", "last_name|Last name", "preferred_name|Preferred name",
  "primary_phone|Primary phone", "primary_email_type|Primary email type|email_types", "alternate_email|Alternate email", "alternate_email_type|Alternate email type|email_types",
  "organization_name|Organization name", "organization_website|Organization website", "organization_email|Organization email",
  "organization_contact_title|Main contact title|titles", "organization_contact_first_name|Main contact first name", "organization_contact_middle_name|Main contact middle name", "organization_contact_last_name|Main contact last name", "organization_contact_name|Main contact display name", "organization_contact_email|Main contact email", "organization_contact_phone|Main contact phone",
  "spouse_gender|Spouse gender|genders", "spouse_title|Spouse title|titles", "spouse_first_name|Spouse first name", "spouse_middle_name|Spouse middle name", "spouse_last_name|Spouse last name", "spouse_preferred_email|Spouse preferred email", "spouse_alternate_email|Spouse alternate email", "spouse_primary_phone|Spouse phone", "spouse_same_address|Spouse shares address|boolean", "notes|General donor notes"]);
addFields("address", ["address_type|Primary address type|address_types", "street1|Primary street 1", "street2|Primary street 2", "postal_code|Primary postal code", "country|Primary country"]);
addFields("gift", ["gift_number|Gift ID", "gift_type|Gift type|gift_types", "payment_method|Payment method|payment_methods", "reference_number|Reference", "pledge_status|Pledge status|pledge_statuses", "installment_frequency|Installment frequency|frequencies", "receipt_sent|Receipt sent|boolean"]);
queryFields.push({ key: "gift_notes", column: "notes", source: "gift", label: "Gift notes", category: "Gifts", numeric: false });
for (const [column, label] of [["gift_date", "Gift date"], ["pledge_start_date", "Pledge start date"], ["expected_fulfillment_date", "Expected fulfillment date"], ["receipt_sent_at", "Receipt sent date"]]) queryFields.push({ key: column, column, source: "gift", label, category: "Gifts", numeric: false, date: true });
queryFields.push({ key: "check_date", column: "check_date", source: "gift", label: "Check date", category: "Gifts", numeric: false, date: true });
for (const [column, label] of [["amount_cents", "Full gift amount ($)"], ["receipt_amount_cents", "Receipt amount ($)"], ["fair_market_value_cents", "Fair market value ($)"], ["installment_count", "Installment count"]]) queryFields.push({ key: column, column, source: "gift", label, category: "Gifts", numeric: true, money: column !== "installment_count" });
for (const [key, options] of [["type", "donor_types"], ["state", "states"], ["fund", "funds"], ["campaign", "campaigns"], ["appeal", "appeals"]]) queryFields.find(field => field.key === key)!.options = options;
export function queryOperators(field: QueryField): string[][] {
  return field.numeric || field.date ? [["gte", field.date ? "On or after" : "At least"], ["lte", field.date ? "On or before" : "At most"], ["between", "Between"], ["equals", "Equals"], ...(field.source ? [["blank", "Is blank"]] : [])] : field.options ? [["equals", "Equals"], ["blank", "Is blank"]] : [["contains", "Contains"], ["equals", "Equals"], ["blank", "Is blank"]];
}
const validDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
export const profileQuerySchema = z.object({
  mode: z.enum(["all", "any"]), credit: z.enum(["hard", "both"]), period: z.enum(["year", "all", "custom"]),
  from: z.string().optional(), to: z.string().optional(), sameGift: z.boolean().optional(), requireGift: z.boolean().optional(),
  rules: z.array(z.object({ field: z.string().refine(key => queryFields.some(field => field.key === key)),
    operator: z.enum(["contains", "equals", "blank", "gte", "lte", "between"]), value: z.string().trim().max(200), valueTo: z.string().trim().max(200).optional() })).min(1).max(10)
}).superRefine((input, ctx) => {
  if (input.period === "custom" && (!validDate(input.from ?? "") || !validDate(input.to ?? "") || input.from! > input.to!)) ctx.addIssue({ code: "custom", message: "Choose valid start and end dates, with the start no later than the end." });
  input.rules.forEach((rule, index) => {
    const field = queryFields.find(f => f.key === rule.field);
    if (!field) return;
    const validValue = (value: string) => !!value && (field.date ? validDate(value) : field.numeric ? (field.money === false ? /^\d{1,10}$/.test(value) : /^\d{1,10}(\.\d{1,2})?$/.test(value)) : true);
    // Legacy saved list-field "contains" conditions remain readable.
    if ((!queryOperators(field).some(([op]) => op === rule.operator) && !(field.options && rule.operator === "contains")) ||
      (rule.operator !== "blank" && !validValue(rule.value)) || (rule.operator === "between" && (!validValue(rule.valueTo ?? "") || (field.numeric ? Number(rule.value) > Number(rule.valueTo) : rule.value > rule.valueTo!)))) {
      ctx.addIssue({ code: "custom", path: ["rules", index], message: "Choose a valid condition and value. Amounts must be nonnegative dollars with up to two decimals." });
    }
  });
});
export type ProfileQuery = z.infer<typeof profileQuerySchema>;
export function ruleLabel(rule: ProfileQuery["rules"][number]) {
  return `${queryFields.find(f => f.key === rule.field)?.label} ${ { contains: "contains", equals: "equals", blank: "is blank", gte: "at least", lte: "at most", between: "between" }[rule.operator]}${rule.operator === "blank" ? "" : ` ${rule.value}${rule.operator === "between" ? ` and ${rule.valueTo}` : ""}`}`;
}
