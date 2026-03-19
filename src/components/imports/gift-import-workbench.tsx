"use client";

import { CsvImportWorkbench } from "@/components/imports/csv-import-workbench";

type GiftImportTargetField =
  | "donor_name"
  | "donor_email"
  | "gift_type"
  | "amount"
  | "receipt_amount"
  | "gift_date"
  | "fund"
  | "campaign"
  | "appeal"
  | "payment_method"
  | "reference"
  | "soft_credit_name"
  | "notes";

type MappingRecord = Record<string, GiftImportTargetField | "">;

const targetFieldOptions: Array<{ value: GiftImportTargetField; label: string }> = [
  { value: "donor_name", label: "Donor name" },
  { value: "donor_email", label: "Donor email" },
  { value: "gift_type", label: "Gift type" },
  { value: "amount", label: "Amount" },
  { value: "receipt_amount", label: "Receipt amount" },
  { value: "gift_date", label: "Gift date" },
  { value: "fund", label: "Fund" },
  { value: "campaign", label: "Campaign" },
  { value: "appeal", label: "Appeal" },
  { value: "payment_method", label: "Payment method" },
  { value: "reference", label: "Reference" },
  { value: "soft_credit_name", label: "Manual soft credit donor" },
  { value: "notes", label: "Notes" }
];

const headerGuessMap: Record<string, GiftImportTargetField> = {
  donor: "donor_name",
  donorname: "donor_name",
  donorfullname: "donor_name",
  name: "donor_name",
  email: "donor_email",
  donoremail: "donor_email",
  gifttype: "gift_type",
  type: "gift_type",
  amount: "amount",
  giftamount: "amount",
  receiptamount: "receipt_amount",
  receiptableamount: "receipt_amount",
  date: "gift_date",
  giftdate: "gift_date",
  fund: "fund",
  campaign: "campaign",
  appeal: "appeal",
  paymentmethod: "payment_method",
  payment: "payment_method",
  reference: "reference",
  referencenumber: "reference",
  checknumber: "reference",
  softcredit: "soft_credit_name",
  softcreditdonor: "soft_credit_name",
  notes: "notes",
  memo: "notes"
};

export function GiftImportWorkbench() {
  return (
    <CsvImportWorkbench<GiftImportTargetField>
      eyebrow="Gift Import"
      description="Upload a gift file, review the detected columns, and map them to Pink Ribbon CRM gift fields before moving into import validation."
      mappingDescription="Map each incoming CSV column to a CRM field, or leave it ignored."
      previewDescription="Preview how the first rows line up after mapping before import validation and duplicate checks."
      footerNote="This step prepares the mapping only. Final import validation, donor matching, and record creation can be added on top of this workflow next."
      targetFieldOptions={targetFieldOptions}
      headerGuessMap={headerGuessMap}
    />
  );
}
