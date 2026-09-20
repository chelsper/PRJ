"use client";

import { reviewConstituentImportAction, runConstituentImportAction } from "@/app/(admin)/imports/actions";
import { CsvImportWorkbench } from "@/components/imports/csv-import-workbench";
import { constituentImportHeaders, constituentImportOptions } from "@/lib/crm-fields";

export function ConstituentImportWorkbench() {
  return (
    <CsvImportWorkbench
      eyebrow="Constituent Import"
      description="Upload, map fields, review matches, then confirm record creation. Uploading and reviewing do not save constituent records."
      mappingDescription="Map each incoming CSV column to a CRM constituent field, or leave it ignored."
      previewDescription="Preview how the first rows line up after mapping before duplicate checks and constituent creation."
      footerNote="Create-only import: possible matches are skipped, never overwritten. Constituent ID means the existing CRM number, not a Givebutter or DonorPerfect source ID. Leave external source IDs ignored until source-specific matching is available."
      targetFieldOptions={constituentImportOptions}
      headerGuessMap={constituentImportHeaders}
      submitLabel="Create constituent records"
      submitDescription="Create constituent records from the mapped rows below."
      submitAction={runConstituentImportAction}
      reviewAction={reviewConstituentImportAction}
    />
  );
}
