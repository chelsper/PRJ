"use client";

import { runConstituentImportAction } from "@/app/(admin)/imports/actions";
import { CsvImportWorkbench } from "@/components/imports/csv-import-workbench";

type ConstituentImportTargetField =
  | "donor_type"
  | "title"
  | "gender"
  | "first_name"
  | "middle_name"
  | "last_name"
  | "preferred_name"
  | "organization_name"
  | "donor_number"
  | "primary_email"
  | "primary_email_type"
  | "alternate_email"
  | "alternate_email_type"
  | "primary_phone"
  | "address_type"
  | "street1"
  | "street2"
  | "city"
  | "state_region"
  | "postal_code"
  | "country"
  | "notes";

type MappingRecord = Record<string, ConstituentImportTargetField | "">;

const targetFieldOptions: Array<{ value: ConstituentImportTargetField; label: string }> = [
  { value: "donor_type", label: "Constituent type" },
  { value: "title", label: "Title" },
  { value: "gender", label: "Gender" },
  { value: "first_name", label: "First name" },
  { value: "middle_name", label: "Middle name" },
  { value: "last_name", label: "Last name" },
  { value: "preferred_name", label: "Preferred name" },
  { value: "organization_name", label: "Organization name" },
  { value: "donor_number", label: "Constituent ID" },
  { value: "primary_email", label: "Preferred email" },
  { value: "primary_email_type", label: "Preferred email type" },
  { value: "alternate_email", label: "Additional email" },
  { value: "alternate_email_type", label: "Additional email type" },
  { value: "primary_phone", label: "Primary phone" },
  { value: "address_type", label: "Address type" },
  { value: "street1", label: "Street 1" },
  { value: "street2", label: "Street 2" },
  { value: "city", label: "City" },
  { value: "state_region", label: "State / Region" },
  { value: "postal_code", label: "Postal code" },
  { value: "country", label: "Country" },
  { value: "notes", label: "Notes" }
];

const headerGuessMap: Record<string, ConstituentImportTargetField> = {
  type: "donor_type",
  constituenttype: "donor_type",
  donortype: "donor_type",
  title: "title",
  gender: "gender",
  firstname: "first_name",
  middlename: "middle_name",
  lastname: "last_name",
  preferredname: "preferred_name",
  organization: "organization_name",
  organizationname: "organization_name",
  constituentid: "donor_number",
  constituentnumber: "donor_number",
  donornumber: "donor_number",
  email: "primary_email",
  primaryemail: "primary_email",
  preferredemail: "primary_email",
  preferredemailtype: "primary_email_type",
  alternateemail: "alternate_email",
  additionalemail: "alternate_email",
  additionalemailtype: "alternate_email_type",
  alternateemailtype: "alternate_email_type",
  phone: "primary_phone",
  primaryphone: "primary_phone",
  addresstype: "address_type",
  street1: "street1",
  address1: "street1",
  street2: "street2",
  address2: "street2",
  city: "city",
  state: "state_region",
  stateregion: "state_region",
  zipcode: "postal_code",
  postalcode: "postal_code",
  zip: "postal_code",
  country: "country",
  notes: "notes",
  memo: "notes"
};

export function ConstituentImportWorkbench() {
  return (
    <CsvImportWorkbench<ConstituentImportTargetField>
      eyebrow="Constituent Import"
      description="Upload a constituent file, review the detected columns, and map them to Pink Ribbon CRM constituent fields before moving into import validation."
      mappingDescription="Map each incoming CSV column to a CRM constituent field, or leave it ignored."
      previewDescription="Preview how the first rows line up after mapping before duplicate checks and constituent creation."
      footerNote="Review the preview carefully before creating records. Rows that already match existing constituents will be skipped."
      targetFieldOptions={targetFieldOptions}
      headerGuessMap={headerGuessMap}
      submitLabel="Create constituent records"
      submitDescription="Create constituent records from the mapped rows below."
      submitAction={runConstituentImportAction}
    />
  );
}
