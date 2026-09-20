export type ImportRowResult = {
  row: number;
  status: "new" | "duplicate" | "error" | "created";
  message: string;
};

export type ImportReview = {
  success: boolean;
  message: string;
  readyCount: number;
  duplicateCount: number;
  errorCount: number;
  rowResults: ImportRowResult[];
};

// Conservative file-level matches are skipped, never automatically merged.
export function importIdentityKeys(input: {
  donorType: string; firstName?: string; lastName?: string;
  organizationName?: string; primaryEmail?: string;
}, donorNumber: string) {
  const clean = (value?: string) => value?.trim().toLowerCase() ?? "";
  return [
    donorNumber ? `id:${clean(donorNumber)}` : "",
    input.primaryEmail ? `email:${clean(input.primaryEmail)}` : "",
    input.donorType === "ORGANIZATION" && input.organizationName ? `org:${clean(input.organizationName)}` : "",
    input.donorType === "INDIVIDUAL" && input.firstName && input.lastName
      ? `name:${JSON.stringify([clean(input.firstName), clean(input.lastName)])}` : ""
  ].filter(Boolean);
}
