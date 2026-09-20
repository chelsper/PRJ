import { profileQuerySchema, queryFields, type ProfileQuery } from "./profile-query";

export type SavedQuery = { name: string; query: ProfileQuery };
const giving: ProfileQuery = { mode: "all", credit: "hard", period: "year", sameGift: true, requireGift: true, rules: [{ field: "total", operator: "gte", value: "500" }] };
export const queryPresets: Array<{ id: string; name: string; description: string; query: ProfileQuery }> = [
  { id: "recognition-500", name: "Recognition of $500+ this year", description: "Total recognition across the calendar year, not cash received.", query: giving },
  { id: "recognition-range", name: "Recognition between $100 and $500", description: "Combined recognition in this calendar year, including both endpoints.", query: { ...giving, rules: [{ field: "total", operator: "between", value: "100", valueTo: "500" }] } },
  { id: "gift-range", name: "A gift between $100 and $500", description: "At least one credited gift in this calendar year. Add a fund or appeal condition to match the same gift.", query: { ...giving, rules: [{ field: "amount", operator: "between", value: "100", valueTo: "500" }] } },
  { id: "individuals", name: "Individuals, with or without gifts", description: "Individual profiles; no giving requirement.", query: { ...giving, period: "all", requireGift: false, rules: [{ field: "type", operator: "equals", value: "INDIVIDUAL" }] } },
  { id: "organizations", name: "Organizations, with or without gifts", description: "Organization profiles; no giving requirement.", query: { ...giving, period: "all", requireGift: false, rules: [{ field: "type", operator: "equals", value: "ORGANIZATION" }] } },
  { id: "texting", name: "Profiles with saved texting opt-in", description: "Saved opt-in only. Review the audience to check valid numbers, shared-number opt-outs, and duplicates before outreach.", query: { ...giving, period: "all", requireGift: false, rules: [{ field: "sms_consent", operator: "equals", value: "OPTED_IN" }] } }
];

export function readSavedQueries(raw: unknown): SavedQuery[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  return raw.flatMap(item => {
    const parsed = profileQuerySchema.safeParse(item?.query);
    const name = typeof item?.name === "string" ? item.name.trim().slice(0, 80) : "";
    if (!name || !parsed.success || seen.has(name.toLowerCase())) return [];
    seen.add(name.toLowerCase());
    return [{ name, query: parsed.data }];
  }).slice(0, 30);
}

export function saveQuery(saved: SavedQuery[], name: string, raw: ProfileQuery): SavedQuery[] {
  const trimmed = name.trim();
  if (!trimmed || trimmed.length > 80) throw new Error("Enter a query name of 1 to 80 characters.");
  const query = profileQuerySchema.parse(raw);
  const next = saved.filter(item => item.name.toLowerCase() !== trimmed.toLowerCase());
  if (next.length >= 30) throw new Error("Up to 30 queries can be saved. Delete one or replace an existing query.");
  return [...next, { name: trimmed, query }];
}

export function describeQuery(value: ProfileQuery, options: Record<string, { value: string; label: string }[]>) {
  const period = value.period === "year" ? "this calendar year" : value.period === "all" ? "all time" : `${value.from || "start date"} through ${value.to || "end date"}`;
  const rules = value.rules.map(rule => {
    const field = queryFields.find(field => field.key === rule.field);
    const label = options[rule.field]?.find(option => option.value === rule.value)?.label ?? rule.value;
    const operator = ({ equals: "equals", contains: "contains", blank: "is blank", gte: field?.date ? "on or after" : "at least", lte: field?.date ? "on or before" : "at most", between: "between" })[rule.operator];
    return `${field?.label ?? rule.field} ${operator}${rule.operator === "blank" ? "" : ` ${label || "(choose a value)"}${rule.operator === "between" ? ` and ${rule.valueTo || "(choose a value)"}` : ""}`}`;
  });
  return { period, credit: value.credit === "hard" ? "Hard-credit donors only" : "Hard and soft credits, without counting the same gift twice for one profile", rules };
}
