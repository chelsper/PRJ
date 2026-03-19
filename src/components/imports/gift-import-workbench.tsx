"use client";

import { useMemo, useState, type ChangeEvent } from "react";

import type { LookupRow } from "@/server/data/lookups";

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

function normalizeHeader(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function parseCsv(text: string) {
  const rows: string[][] = [];
  let current = "";
  let row: string[] = [];
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        current += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      row.push(current);
      current = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") {
        index += 1;
      }
      row.push(current);
      rows.push(row);
      row = [];
      current = "";
      continue;
    }

    current += char;
  }

  if (current.length > 0 || row.length > 0) {
    row.push(current);
    rows.push(row);
  }

  const trimmedRows = rows.filter((parsedRow) => parsedRow.some((cell) => cell.trim() !== ""));

  if (trimmedRows.length === 0) {
    return { headers: [], rows: [] as Array<Record<string, string>> };
  }

  const headers = trimmedRows[0].map((header, index) => (header.trim() ? header.trim() : `Column ${index + 1}`));
  const dataRows = trimmedRows.slice(1).map((parsedRow) =>
    headers.reduce<Record<string, string>>((accumulator, header, index) => {
      accumulator[header] = parsedRow[index]?.trim() ?? "";
      return accumulator;
    }, {})
  );

  return { headers, rows: dataRows };
}

export function GiftImportWorkbench({
  funds,
  campaigns,
  appeals
}: {
  funds: LookupRow[];
  campaigns: LookupRow[];
  appeals: LookupRow[];
}) {
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
    const parsed = parseCsv(text);

    setFileName(file.name);
    setHeaders(parsed.headers);
    setRows(parsed.rows);
    setMapping(
      parsed.headers.reduce<MappingRecord>((accumulator, header) => {
        accumulator[header] = headerGuessMap[normalizeHeader(header)] ?? "";
        return accumulator;
      }, {})
    );
  }

  return (
    <div className="grid">
      <section className="card">
        <p className="eyebrow">Gift Import</p>
        <h1>Upload and map a CSV</h1>
        <p className="muted">
          Upload a gift file, review the detected columns, and map them to Pink Ribbon CRM gift fields before moving into import validation.
        </p>
        <div className="form-grid">
          <label className="full">
            CSV file
            <input type="file" accept=".csv,text/csv" onChange={handleFileChange} />
          </label>
          <div className="stat">
            <span className="muted">Funds available</span>
            <strong>{funds.length}</strong>
          </div>
          <div className="stat">
            <span className="muted">Campaigns available</span>
            <strong>{campaigns.length}</strong>
          </div>
          <div className="stat">
            <span className="muted">Appeals available</span>
            <strong>{appeals.length}</strong>
          </div>
        </div>
        {fileName ? <p className="muted top-gap">Loaded file: {fileName} · {rows.length} data rows detected.</p> : null}
      </section>

      {headers.length > 0 ? (
        <>
          <section className="table-shell">
            <p className="eyebrow">Column Mapping</p>
            <p className="muted">Map each incoming CSV column to a CRM field, or leave it ignored.</p>
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
                              [header]: event.target.value as GiftImportTargetField | ""
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
            <p className="muted">Preview how the first rows line up after mapping before import validation and duplicate checks.</p>
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
                    <tr key={`preview-${index}`}>
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
              This step prepares the mapping only. Final import validation, donor matching, and record creation can be added on top of this workflow next.
            </p>
          </section>
        </>
      ) : null}
    </div>
  );
}
