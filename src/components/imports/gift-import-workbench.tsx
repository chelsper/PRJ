"use client";

import { CsvImportWorkbench } from "@/components/imports/csv-import-workbench";
import { useState } from "react";
import type { LookupRow } from "@/server/data/lookups";
import { giftImportOptions, giftImportHeaders } from "@/lib/crm-fields";
import { GivebutterGiftReview } from "./givebutter-gift-review";

export function GiftImportWorkbench({ funds, appeals, campaigns }: { funds: LookupRow[]; appeals: LookupRow[]; campaigns: LookupRow[] }) {
  const [source, setSource] = useState("givebutter");
  return (
    <div className="grid">
      <section className="card"><label>File source<select value={source} onChange={event => setSource(event.target.value)}><option value="givebutter">Givebutter transactions</option><option value="generic">Other gift CSV</option></select></label></section>
      {source === "givebutter" ? <GivebutterGiftReview funds={funds} appeals={appeals} campaigns={campaigns} /> :
        <CsvImportWorkbench
          eyebrow="Gift Import"
          description="Upload a gift file, review the detected columns, and map them to Pink Ribbon CRM gift fields before moving into import validation."
          mappingDescription="Map each incoming CSV column to a CRM field, or leave it ignored."
          previewDescription="Preview how the first rows line up after mapping before import validation and duplicate checks."
          footerNote="This step prepares the mapping only. Final import validation, donor matching, and record creation can be added on top of this workflow next."
          targetFieldOptions={giftImportOptions}
          headerGuessMap={giftImportHeaders}
        />}
    </div>
  );
}
