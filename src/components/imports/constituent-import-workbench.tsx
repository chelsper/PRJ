"use client";

import { useMemo, useState, type ChangeEvent } from "react";

import { normalizeImportHeader, parseImportCsv } from "@/components/imports/import-workbench-utils";

type ConstituentImportTargetField =
  | "donor_type"
  | "title"
  | "first_name"
  | "middle_name"
  | "last_name"
  | "preferred_name"
  | "organization_name"
  | "primary_email"
  | "alternate_email"
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
  { value: "first_name", label: "First name" },
  { value: "middle_name", label: "Middle name" },
  { value: "last_name", label: "Last name" },
  { value: "preferred_name", label: "Preferred name" },
  { value: "organization_name", label: "Organization name" },
  { value: "primary_email", label: "Preferred email" },
  { value: "alternate_email", label: "Additional email" },
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
  firstname: "first_name",
  middlename: "middle_name",
  lastname: "last_name",
  preferredname: "preferred_name",
  organization: "organization_name",
  organizationname: "organization_name",
  email: "primary_email",
  primaryemail: "primary_email",
  alternateemail: "alternate_email",
  additionalemail: "alternate_email",
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
  const [fileName, setFileName] = useState("");
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<Array<Record<string, string>>>([]);
  const [mapping, setMapping] = useState<MappingRecord>({});

  const mappedPreviewRows = useMemo(() => {
    return rows.slice(0, 8).map((row) =>
      targetFieldOptions.reduce<Record<string, string>>((accumulator, field) => {
        const sourceHeader = Object.entries(mapping).find(([, target]) => target === field.value)?.[0];
        accumulator[field.label] = sourceHeader ? row[sourceHeader] ?? "" : "";
        return accumulator;
      }, {})
    );
  }, [mapping, rows]);

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      setFileName("");
      setHeaders([]);
      setRows([]);
      setMapping({});
      return;
    }

    const text = await file.text();
    const parsed = parseImportCsv(text);

    setFileName(file.name);
    setHeaders(parsed.headers);
    setRows(parsed.rows);
    setMapping(
      parsed.headers.reduce<MappingRecord>((accumulator, header) => {
        accumulator[header] = headerGuessMap[normalizeImportHeader(header)] ?? "";
        return accumulator;
      }, {})
    );
  }

  return (
    <div className="grid">
      <section className="card">
        <p className="eyebrow">Constituent Import</p>
        <h1>Upload and map a CSV</h1>
        <p className="muted">
          Upload a constituent file, review the detected columns, and map them to Pink Ribbon CRM constituent fields before moving into import validation.
        </p>
        <label className="full">
          CSV file
          <input type="file" accept=".csv,text/csv" onChange={handleFileChange} />
        </label>
        {fileName ? <p className="muted top-gap">Loaded file: {fileName} · {rows.length} data rows detected.</p> : null}
      </section>

      {headers.length > 0 ? (
        <>
          <section className="table-shell">
            <p className="eyebrow">Column Mapping</p>
            <p className="muted">Map each incoming CSV column to a CRM constituent field, or leave it ignored.</p>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>CSV column</th>
                    <th>Map to CRM field</th>
                    <th>Sample value</th>
                  </tr>
                </thead>
                <tbody>
                  {headers.map((header) => (
                    <tr key={header}>
                      <td>{header}</td>
                      <td>
                        <select
                          value={mapping[header] ?? ""}
                          onChange={(event) =>
                            setMapping((current) => ({
                              ...current,
                              [header]: event.target.value as ConstituentImportTargetField | ""
                            }))
                          }
                        >
                          <option value="">Ignore</option>
                          {targetFieldOptions.map((field) => (
                            <option key={field.value} value={field.value}>
                              {field.label}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td>{rows[0]?.[header] ?? ""}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="table-shell">
            <p className="eyebrow">Import Preview</p>
            <p className="muted">Preview how the first rows line up after mapping before duplicate checks and constituent creation.</p>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    {targetFieldOptions
                      .filter((field) => Object.values(mapping).includes(field.value))
                      .map((field) => (
                        <th key={field.value}>{field.label}</th>
                      ))}
                  </tr>
                </thead>
                <tbody>
                  {mappedPreviewRows.map((row, index) => (
                    <tr key={`constituent-preview-${index}`}>
                      {targetFieldOptions
                        .filter((field) => Object.values(mapping).includes(field.value))
                        .map((field) => (
                          <td key={`${field.value}-${index}`}>{row[field.label] || "—"}</td>
                        ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="muted top-gap">
              This prepares the mapping only. Duplicate management, constituent matching, and record creation can be layered onto this workflow next.
            </p>
          </section>
        </>
      ) : null}
    </div>
  );
}
