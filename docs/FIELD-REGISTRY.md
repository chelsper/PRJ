# CRM Field Registry

`src/lib/crm-fields.ts` defines the scalar donor, primary-address and gift fields used by queries, constituent CSV mapping/validation, export choices, and profile labels. Gift CSV preparation also takes its labels from this registry. Fixed gift enums are shared with gift validation and create/edit controls.

## Adding or changing a field

1. Add the schema migration and persistence/validation support first.
2. Register the field with its source, actual column, label and form name. Existing query keys must remain stable for saved queries; use `queryKey` if the database column has a different name.
3. Set `options` for controlled values; use `date` or `numeric` for range controls. Numeric counts and IDs need `money: false` so query values are not multiplied by 100.
4. Only enable `importable` when the constituent creation path supports the field. Mapping and server validation then update together. Do not map external provider IDs into CRM constituent numbers.
5. Only enable `exportable` after updating the donor export SQL projection, row type and serializer. The regression test requires matching registry and serializer keys.
6. Run `npm test` and `npm run build`. Form-schema coverage tests require every validated field to be registered or explicitly excluded with a reason.

## Boundaries

- No automatic discovery or publication of arbitrary database columns.
- Impact/patient fields, credentials and audit/security internals are not part of this registry.
- Existing route/action capabilities remain mandatory: reports read, imports run and exports run. Metadata does not grant permission.
- Relationship commands and nested installment schedules have explicit exclusions; they cannot be treated as scalar database columns.
- Read-only and derived fields are not importable by default. Exporting additional fields is opt-in.
- Query dropdowns combine configured labels and historical stored values in two database calls. Fixed enums use the same choices as validated forms. Deleted donors/gifts and nonprimary addresses do not contribute stored dropdown values; archived gift codes remain available for historical reporting.
- The registry does not generate all form layouts or migrations. New UI controls and database writes still require implementation and review.
