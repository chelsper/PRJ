import { z } from "zod";
import { queryFields, type QueryField } from "./crm-fields";
export { queryFields, type QueryField } from "./crm-fields";

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
