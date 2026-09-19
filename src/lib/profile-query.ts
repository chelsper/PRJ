import { z } from "zod";

export const queryFields = [
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
] as const;
export const profileQuerySchema = z.object({
  mode: z.enum(["all", "any"]), credit: z.enum(["hard", "both"]), period: z.enum(["year", "all"]),
  rules: z.array(z.object({ field: z.enum(["name", "id", "email", "type", "city", "state", "total", "amount", "fund", "campaign", "appeal"]),
    operator: z.enum(["contains", "equals", "blank", "gte", "lte"]), value: z.string().trim().max(200) })).min(1).max(10)
}).superRefine((input, ctx) => {
  input.rules.forEach((rule, index) => {
    const numeric = queryFields.find(f => f.key === rule.field)!.numeric;
    if (!(numeric ? ["gte", "lte", "equals"] : ["contains", "equals", "blank"]).includes(rule.operator) ||
      (rule.operator !== "blank" && (!rule.value || (numeric && !/^\d{1,10}(\.\d{1,2})?$/.test(rule.value))))) {
      ctx.addIssue({ code: "custom", path: ["rules", index], message: "Choose a valid condition and value. Amounts must be nonnegative dollars with up to two decimals." });
    }
  });
});
export type ProfileQuery = z.infer<typeof profileQuerySchema>;
export function ruleLabel(rule: ProfileQuery["rules"][number]) {
  return `${queryFields.find(f => f.key === rule.field)?.label} ${ { contains: "contains", equals: "equals", blank: "is blank", gte: "at least", lte: "at most" }[rule.operator]}${rule.operator === "blank" ? "" : ` ${rule.value}`}`;
}
