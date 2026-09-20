// Explicit allowlist: schema changes must be reviewed here, never exposed by DB introspection.
export type QueryField = { key: string; label: string; category: string; numeric: boolean; date?: boolean; money?: boolean; options?: string; source?: "donor" | "address" | "gift"; column?: string };
export type CrmField = {
  column: string;
  label: string;
  source: "donor" | "address" | "gift" | "computed";
  formName?: string;
  importable?: boolean;
  exportKey?: string;
  aliases?: string[];
  query?: QueryField;
};
type Settings = { options?: string; queryKey?: string; formName?: string; importable?: boolean; exportable?: boolean; aliases?: string[]; numeric?: boolean; money?: boolean; date?: boolean };
function field(source: "donor" | "address" | "gift", column: string, label: string, settings: Settings = {}): CrmField {
  return {
    column, label, source,
    formName: settings.formName ?? column.replace(/_([a-z])/g, (_, char: string) => char.toUpperCase()),
    importable: settings.importable,
    exportKey: settings.exportable ? column : undefined,
    aliases: settings.aliases,
    query: { key: settings.queryKey ?? column, column, source, label, category: source === "gift" ? "Gifts" : "Constituents", numeric: settings.numeric ?? false, date: settings.date, money: settings.money, options: settings.options }
  };
}
const editable = { importable: true, exportable: true };
const donor = (column: string, label: string, settings: Settings = {}) => field("donor", column, label, settings);
const address = (column: string, label: string, settings: Settings = {}) => field("address", column, label, { ...editable, ...settings });
const gift = (column: string, label: string, settings: Settings = {}) => field("gift", column, label, settings);
function computed(column: string, label: string, query?: Partial<QueryField> & { key: string }): CrmField {
  return { column, label, source: "computed", exportKey: column,
    query: query ? { label, category: "Constituents", numeric: false, ...query } : undefined };
}

export const crmFields: CrmField[] = [
  donor("donor_number", "Constituent ID", { ...editable, queryKey: "id", aliases: ["constituentid", "constituentnumber"] }),
  donor("donor_type", "Constituent type", { ...editable, queryKey: "type", formName: "donorType", options: "donor_types", aliases: ["type", "constituenttype"] }),
  donor("title", "Title", { ...editable, options: "titles" }),
  donor("gender", "Gender", { ...editable, options: "genders" }),
  donor("first_name", "First name", editable), donor("middle_name", "Middle name", editable),
  donor("last_name", "Last name", editable), donor("preferred_name", "Preferred name", editable),
  computed("donor_name", "Donor name", { key: "name" }),
  computed("household_name", "Household name"),
  donor("organization_name", "Organization name", { ...editable, aliases: ["organization"] }),
  donor("organization_website", "Organization website", { exportable: true }),
  donor("organization_email", "Organization email", { exportable: true }),
  donor("organization_contact_title", "Main contact title", { options: "titles" }),
  donor("organization_contact_first_name", "Main contact first name"),
  donor("organization_contact_middle_name", "Main contact middle name"),
  donor("organization_contact_last_name", "Main contact last name"),
  donor("organization_contact_name", "Organization contact name", { exportable: true }),
  donor("organization_contact_email", "Organization contact email", { exportable: true }),
  donor("organization_contact_phone", "Organization contact phone", { exportable: true }),
  donor("primary_email", "Primary email", { ...editable, queryKey: "email", aliases: ["email", "preferredemail"] }),
  donor("primary_email_type", "Primary email type", { ...editable, options: "email_types", aliases: ["preferredemailtype"] }),
  donor("alternate_email", "Alternate email", { ...editable, aliases: ["additionalemail"] }),
  donor("alternate_email_type", "Alternate email type", { ...editable, options: "email_types", aliases: ["additionalemailtype"] }),
  donor("primary_phone", "Primary phone", { ...editable, aliases: ["phone"] }),
  address("address_type", "Address type", { options: "address_types" }),
  address("street1", "Street 1", { aliases: ["address1"] }), address("street2", "Street 2", { aliases: ["address2"] }),
  address("city", "City"), address("state_region", "State / Region", { queryKey: "state", options: "states", aliases: ["state"] }),
  address("postal_code", "Postal code", { aliases: ["zip", "zipcode"] }), address("country", "Country"),
  computed("spouse_name", "Spouse name"),
  donor("spouse_gender", "Spouse gender", { exportable: true, options: "genders" }),
  donor("spouse_title", "Spouse title", { options: "titles" }),
  donor("spouse_first_name", "Spouse first name"), donor("spouse_middle_name", "Spouse middle name"), donor("spouse_last_name", "Spouse last name"),
  donor("spouse_preferred_email", "Spouse preferred email", { exportable: true }),
  donor("spouse_alternate_email", "Spouse alternate email"),
  donor("spouse_primary_phone", "Spouse primary phone", { exportable: true }),
  donor("spouse_same_address", "Spouse shares address", { options: "boolean" }),
  donor("spouse_donor_id", "Linked spouse record ID", { numeric: true, money: false }),
  donor("organization_contact_donor_id", "Linked main contact record ID", { numeric: true, money: false }),
  donor("notes", "Notes", { ...editable, aliases: ["memo"] }),
  computed("giving_level_display", "Current-year giving level", { key: "giving_level", options: "giving_levels" }),
  computed("giving_level_internal", "Giving level internal"),
  computed("soft_credit_donor", "Soft credit donor"),
  computed("total_amount_received", "Total amount received"),
  computed("total_amount_pledged", "Total amount pledged"),
  { column: "sms_consent", label: "Saved texting consent", source: "computed", query: { key: "sms_consent", label: "Saved texting consent", category: "Constituents", numeric: false, options: "sms_consent" } },
  ...[
    { key: "total", label: "Total recognition ($)", numeric: true },
    { key: "amount", label: "One credited gift amount ($)", numeric: true },
    { key: "fund", label: "Fund name", numeric: false, options: "funds" },
    { key: "campaign", label: "Campaign name", numeric: false, options: "campaigns" },
    { key: "appeal", label: "Appeal name", numeric: false, options: "appeals" }
  ].map(query => ({ column: query.key, label: query.label, source: "computed" as const, query: { ...query, category: "Gifts" } })),
  gift("gift_number", "Gift ID"), gift("gift_type", "Gift type", { options: "gift_types" }),
  gift("payment_method", "Payment method", { options: "payment_methods" }), gift("reference_number", "Reference"),
  gift("pledge_status", "Pledge status", { options: "pledge_statuses" }),
  gift("installment_frequency", "Installment frequency", { options: "frequencies" }),
  gift("receipt_sent", "Receipt sent", { options: "boolean" }), gift("notes", "Gift notes", { queryKey: "gift_notes" }),
  gift("gift_date", "Gift date", { date: true }), gift("pledge_start_date", "Pledge start date", { date: true }),
  gift("expected_fulfillment_date", "Expected fulfillment date", { date: true }), gift("receipt_sent_at", "Receipt sent date", { date: true }),
  gift("check_date", "Check date", { date: true }),
  gift("amount_cents", "Full gift amount ($)", { numeric: true, money: true, formName: "amount" }),
  gift("receipt_amount_cents", "Receipt amount ($)", { numeric: true, money: true, formName: "receiptAmount" }),
  gift("fair_market_value_cents", "Fair market value ($)", { numeric: true, money: true, formName: "fairMarketValue" }),
  gift("installment_count", "Installment count", { numeric: true, money: false }),
  gift("donor_id", "Hard-credit donor record ID", { numeric: true, money: false }),
  gift("fund_id", "Fund record ID", { numeric: true, money: false }),
  gift("campaign_id", "Campaign record ID", { numeric: true, money: false }),
  gift("appeal_id", "Appeal record ID", { numeric: true, money: false }),
  gift("parent_pledge_gift_id", "Parent pledge record ID", { numeric: true, money: false })
];

export const queryFields = crmFields.flatMap(field => field.query ? [field.query] : []);
export const constituentImportFields = crmFields.filter(field => field.importable);
export const constituentImportOptions = constituentImportFields.map(field => ({ value: field.column, label: field.label }));
export const constituentExportColumns = crmFields.filter(field => field.exportKey).map(field => ({ key: field.exportKey!, label: field.label }));
export const constituentImportHeaders: Record<string, string> = Object.fromEntries(constituentImportFields.flatMap(field =>
  [field.column.replace(/[^a-z0-9]/g, ""), ...(field.aliases ?? [])].map(alias => [alias, field.column])
));
export function fieldLabel(source: CrmField["source"], column: string) {
  const field = crmFields.find(field => field.source === source && field.column === column);
  if (!field) throw new Error(`Unregistered CRM field: ${source}.${column}`);
  return field.label;
}

export const giftTypeValues = ["PLEDGE", "PLEDGE_PAYMENT", "CASH", "STOCK_PROPERTY", "GIFT_IN_KIND", "MATCHING_GIFT_PLEDGE", "MATCHING_GIFT_PAYMENT"] as const;
export const paymentMethodValues = ["ACH", "CARD", "CHECK", "CASH", "WIRE", "OTHER"] as const;
export const installmentFrequencyValues = ["MONTHLY", "QUARTERLY", "ANNUAL", "CUSTOM"] as const;
export type FieldOption = { value: string; label: string };
const humanize = (value: string) => ({ ACH: "ACH", GIFT_IN_KIND: "Gift-in-Kind", STOCK_PROPERTY: "Stock/Property" }[value] ?? value.toLowerCase().replaceAll("_", " ").replace(/^./, char => char.toUpperCase()));
export const fixedFieldOptions: Record<string, FieldOption[]> = {
  donor_types: [{ value: "INDIVIDUAL", label: "Individual" }, { value: "ORGANIZATION", label: "Organization" }],
  boolean: [{ value: "true", label: "Yes" }, { value: "false", label: "No" }],
  sms_consent: [{ value: "UNKNOWN", label: "Not documented" }, { value: "OPTED_IN", label: "Opted in" }, { value: "OPTED_OUT", label: "Opted out" }],
  gift_types: giftTypeValues.map(value => ({ value, label: humanize(value) })),
  payment_methods: paymentMethodValues.map(value => ({ value, label: humanize(value) })),
  frequencies: installmentFrequencyValues.map(value => ({ value, label: humanize(value) }))
};

// Commands and nested relationships are intentionally not treated as scalar query/import fields.
export const formFieldExclusions = {
  donor: { createOrganizationContactAsDonor: "Creation command", syncSpousePrimaryAddress: "Address synchronization command" },
  gift: { softCreditDonorId: "Soft credits are queried through the credit inclusion setting, not a gift column", installmentSchedule: "Nested installment rows require their own query scope" }
};

// Gift CSV preparation uses these aliases; it does not enable gift creation.
const giftPreviewBindings: Array<[string, CrmField["source"], string, string[]]> = [
  ["donor_name", "computed", "donor_name", ["donor", "donorname", "donorfullname", "name"]],
  ["donor_email", "donor", "primary_email", ["email", "donoremail"]],
  ["gift_type", "gift", "gift_type", ["gifttype", "type"]],
  ["amount", "gift", "amount_cents", ["amount", "giftamount"]],
  ["receipt_amount", "gift", "receipt_amount_cents", ["receiptamount", "receiptableamount"]],
  ["gift_date", "gift", "gift_date", ["date", "giftdate"]],
  ["fund", "computed", "fund", ["fund"]],
  ["campaign", "computed", "campaign", ["campaign"]],
  ["appeal", "computed", "appeal", ["appeal"]],
  ["payment_method", "gift", "payment_method", ["paymentmethod", "payment"]],
  ["reference", "gift", "reference_number", ["reference", "referencenumber", "checknumber"]],
  ["soft_credit_name", "computed", "soft_credit_donor", ["softcredit", "softcreditdonor"]],
  ["notes", "gift", "notes", ["notes", "memo"]],
  ["fair_market_value", "gift", "fair_market_value_cents", ["fairmarketvalue"]]
];
export const giftImportOptions = giftPreviewBindings.map(([value, source, column]) => ({ value, label: fieldLabel(source, column) }));
export const giftImportHeaders = Object.fromEntries(giftPreviewBindings.flatMap(([key, , , aliases]) => aliases.map(alias => [alias, key])));
