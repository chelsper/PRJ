import { constituentExportColumns } from "@/lib/crm-fields";

// Projection contract: adding an export field also requires the SQL and serializer to supply it.
export type DonorsThisYearExportColumnKey =
  | "donor_number" | "donor_type" | "title" | "gender" | "first_name" | "middle_name" | "last_name" | "preferred_name"
  | "donor_name" | "household_name" | "organization_name" | "organization_website" | "organization_email"
  | "organization_contact_name" | "organization_contact_email" | "organization_contact_phone"
  | "primary_email" | "primary_email_type" | "alternate_email" | "alternate_email_type" | "primary_phone"
  | "address_type" | "street1" | "street2" | "city" | "state_region" | "postal_code" | "country"
  | "spouse_name" | "spouse_gender" | "spouse_preferred_email" | "spouse_primary_phone" | "notes"
  | "giving_level_display" | "giving_level_internal" | "soft_credit_donor" | "total_amount_received" | "total_amount_pledged";
export const donorsThisYearExportColumns = constituentExportColumns as Array<{ key: DonorsThisYearExportColumnKey; label: string }>;
