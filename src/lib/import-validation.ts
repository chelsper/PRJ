import { z } from "zod";
import { constituentImportFields } from "./crm-fields";

const fields = new Set(["", ...constituentImportFields.map(field => field.column)]);
const header = z.string().min(1).max(150).refine(value => !["__proto__", "constructor", "prototype"].includes(value));
export const constituentImportSchema = z.object({
  fileName: z.string().min(1).max(255),
  rows: z.array(z.record(header, z.string().max(10000)).refine(row => Object.keys(row).length <= 100, "Maximum 100 columns.")).min(1).max(1000, "Import at most 1,000 records at a time."),
  mapping: z.record(header, z.string().refine(value => fields.has(value), "Choose an available constituent import field."))
}).strict().superRefine((payload, context) => {
  const selected = Object.values(payload.mapping).filter(Boolean);
  if (!selected.length || new Set(selected).size !== selected.length) context.addIssue({ code: "custom", message: "Map at least one field and use each CRM field only once." });
  if (Object.keys(payload.mapping).length > 100) context.addIssue({ code: "custom", message: "Maximum 100 mapped columns." });
  if (JSON.stringify(payload).length > 2_000_000) context.addIssue({ code: "custom", message: "Import payload is too large. Split the file." });
  for (const [source, target] of Object.entries(payload.mapping)) {
    if (target && payload.rows.some(row => !Object.prototype.hasOwnProperty.call(row, source))) {
      context.addIssue({ code: "custom", message: "A mapped column is missing from one or more rows." });
      break;
    }
  }
});
