import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { crmFields, queryFields, constituentImportFields, constituentImportOptions, constituentImportHeaders, constituentExportColumns, formFieldExclusions, fixedFieldOptions } from "@/lib/crm-fields";
import { donorInputSchema } from "@/server/validation/donors";
import { giftInputSchema } from "@/server/validation/gifts";
import { constituentImportSchema } from "@/lib/import-validation";
import { queryOperators } from "@/lib/profile-query";

describe("shared CRM field registry", () => {
  it("has unique query, source and export identifiers", () => {
    for (const keys of [queryFields.map(f => f.key), crmFields.map(f => `${f.source}.${f.column}`), constituentExportColumns.map(f => f.key)]) {
      expect(new Set(keys).size).toBe(keys.length);
    }
  });
  it("requires every validated donor and gift form field to have metadata or an explicit exclusion", () => {
    for (const [source, schema] of [["donor", donorInputSchema], ["gift", giftInputSchema]] as const) {
      const supported = crmFields.filter(f => f.source === source || (source === "donor" && f.source === "address")).map(f => f.formName);
      const excluded = Object.keys(formFieldExclusions[source]);
      for (const key of Object.keys(schema.innerType().shape)) expect([...supported, ...excluded], `${source}.${key} needs registry coverage`).toContain(key);
    }
  });
  it("keeps imports in sync with the server allowlist and validated form names", () => {
    for (const field of constituentImportFields) {
      expect(constituentImportOptions).toContainEqual({ value: field.column, label: field.label });
      expect(field.query).toBeDefined();
      if (field.column !== "donor_number") expect(Object.keys(donorInputSchema.innerType().shape)).toContain(field.formName);
      expect(constituentImportSchema.safeParse({ fileName: "sample.csv", rows: [{ Value: "test" }], mapping: { Value: field.column } }).success).toBe(true);
    }
    for (const field of ["password_hash", "patient_name", "spouse_donor_id", "organization_contact_donor_id"]) {
      expect(constituentImportSchema.safeParse({ fileName: "sample.csv", rows: [{ Value: "test" }], mapping: { Value: field } }).success).toBe(false);
    }
  });
  it("preserves CSV aliases without treating external contact IDs as CRM IDs", () => {
    expect(constituentImportHeaders.preferredemail).toBe("primary_email");
    expect(constituentImportHeaders.zipcode).toBe("postal_code");
    expect(constituentImportHeaders.contactid).toBeUndefined();
    expect(constituentImportHeaders.donorid).toBeUndefined();
  });
  it("requires an export serializer for every enabled export field", () => {
    const route = readFileSync("src/app/api/exports/donors/route.ts", "utf8");
    const serializer = route.split("const rowValues:")[1].split("return csvCell")[0];
    const keys = [...serializer.matchAll(/^\s+(\w+): /gm)].map(match => match[1]);
    expect(constituentExportColumns.map(f => f.key).sort()).toEqual(keys.sort());
  });
  it("uses exact selectors for controlled values and ranges for dates and money", () => {
    for (const field of queryFields.filter(f => f.options)) expect(queryOperators(field).map(([op]) => op)).toEqual(["equals", "blank"]);
    for (const key of ["gift_date", "amount_cents"]) expect(queryOperators(queryFields.find(f => f.key === key)!).map(([op]) => op)).toContain("between");
    expect(fixedFieldOptions.gift_types).toContainEqual({ value: "CASH", label: "Cash" });
  });
  it("preserves existing saved-query aliases and excludes security and patient fields", () => {
    const keys = queryFields.map(field => field.key);
    for (const key of ["name", "id", "email", "type", "city", "state", "total", "amount", "fund", "campaign", "appeal", "gift_notes", "giving_level", "sms_consent"]) expect(keys).toContain(key);
    for (const key of ["password_hash", "patient_name", "patient_id", "auth_token", "recovery_code_hash"]) expect(keys).not.toContain(key);
  });
});
