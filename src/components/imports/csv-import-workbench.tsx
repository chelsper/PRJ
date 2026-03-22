"use client";

import { useMemo, useState, useTransition, type ChangeEvent } from "react";

import { normalizeImportHeader, parseImportCsv } from "@/components/imports/import-workbench-utils";

type TargetFieldOption<TField extends string> = {
  value: TField;
  label: string;
};

type CsvImportWorkbenchProps<TField extends string> = {
  eyebrow: string;
  description: string;
  mappingDescription: string;
  previewDescription: string;
  footerNote: string;
  targetFieldOptions: Array<TargetFieldOption<TField>>;
  headerGuessMap: Record<string, TField>;
  submitLabel?: string;
  submitDescription?: string;
  submitAction?: (payload: {
    fileName: string;
    rows: Array<Record<string, string>>;
    mapping: Record<string, TField | "">;
  }) => Promise<{
    success: boolean;
    message: string;
    createdCount?: number;
    skippedCount?: number;
    errors?: string[];
  }>;
};

export function CsvImportWorkbench<TField extends string>({
  eyebrow,
  description,
  mappingDescription,
  previewDescription,
  footerNote,
  targetFieldOptions,
  headerGuessMap,
  submitLabel,
  submitDescription,
  submitAction
}: CsvImportWorkbenchProps<TField>) {
  const [fileName, setFileName] = useState("");
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<Array<Record<string, string>>>([]);
  const [mapping, setMapping] = useState<Record<string, TField | "">>({});
  const [importResult, setImportResult] = useState<{
    success: boolean;
    message: string;
    createdCount?: number;
    skippedCount?: number;
    errors?: string[];
  } | null>(null);
  const [isPending, startTransition] = useTransition();

  const mappedFields = useMemo(
    () => targetFieldOptions.filter((field) => Object.values(mapping).includes(field.value)),
    [mapping, targetFieldOptions]
  );

  const mappedPreviewRows = useMemo(() => {
    return rows.slice(0, 8).map((row) =>
      targetFieldOptions.reduce<Record<string, string>>((accumulator, field) => {
        const sourceHeader = Object.entries(mapping).find(([, target]) => target === field.value)?.[0];
        accumulator[field.label] = sourceHeader ? row[sourceHeader] ?? "" : "";
        return accumulator;
      }, {})
    );
  }, [mapping, rows, targetFieldOptions]);

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      setFileName("");
      setHeaders([]);
      setRows([]);
      setMapping({});
      setImportResult(null);
      return;
    }

    const text = await file.text();
    const parsed = parseImportCsv(text);

    setFileName(file.name);
    setHeaders(parsed.headers);
    setRows(parsed.rows);
    setImportResult(null);
    setMapping(
      parsed.headers.reduce<Record<string, TField | "">>((accumulator, header) => {
        accumulator[header] = headerGuessMap[normalizeImportHeader(header)] ?? "";
        return accumulator;
      }, {})
    );
  }

  return (
    <div className="grid">
      <section className="card">
        <p className="eyebrow">{eyebrow}</p>
        <h1>Upload and map a CSV</h1>
        <p className="muted">{description}</p>
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
            <p className="muted">{mappingDescription}</p>
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
                              [header]: event.target.value as TField | ""
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
            <p className="muted">{previewDescription}</p>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    {mappedFields.map((field) => (
                      <th key={field.value}>{field.label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {mappedPreviewRows.map((row, index) => (
                    <tr key={`preview-${index}`}>
                      {mappedFields.map((field) => (
                        <td key={`${field.value}-${index}`}>{row[field.label] || "—"}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="muted top-gap">{footerNote}</p>
            {submitAction ? (
              <div className="top-gap">
                {submitDescription ? <p className="muted">{submitDescription}</p> : null}
                <div className="button-row top-gap">
                  <button
                    type="button"
                    disabled={isPending || rows.length === 0 || mappedFields.length === 0}
                    onClick={() =>
                      startTransition(async () => {
                        const result = await submitAction({
                          fileName,
                          rows,
                          mapping
                        });
                        setImportResult(result);
                      })
                    }
                  >
                    {isPending ? "Importing..." : submitLabel ?? "Import records"}
                  </button>
                </div>
                {importResult ? (
                  <div className="conditional-block top-gap">
                    <strong>{importResult.message}</strong>
                    {typeof importResult.createdCount === "number" || typeof importResult.skippedCount === "number" ? (
                      <p className="muted">
                        Created: {importResult.createdCount ?? 0} · Skipped: {importResult.skippedCount ?? 0}
                      </p>
                    ) : null}
                    {importResult.errors && importResult.errors.length > 0 ? (
                      <ul>
                        {importResult.errors.slice(0, 10).map((error) => (
                          <li key={error}>{error}</li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                ) : null}
              </div>
            ) : null}
          </section>
        </>
      ) : null}
    </div>
  );
}
