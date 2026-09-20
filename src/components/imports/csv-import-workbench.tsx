"use client";

import { useMemo, useState, useTransition, type ChangeEvent } from "react";

import { normalizeImportHeader, parseImportCsv } from "@/components/imports/import-workbench-utils";
import type { ImportReview, ImportRowResult } from "@/lib/import-review";

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
  reviewAction?: (payload: { fileName: string; rows: Array<Record<string, string>>; mapping: Record<string, TField | ""> }) => Promise<ImportReview>;
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
    rowResults?: ImportRowResult[];
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
  submitAction,
  reviewAction
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
    rowResults?: ImportRowResult[];
  } | null>(null);
  const [review, setReview] = useState<ImportReview | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [reviewError, setReviewError] = useState("");
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
    setReview(null); setConfirmed(false); setSubmitted(false); setReviewError("");
    const file = event.target.files?.[0];

    if (!file) {
      setFileName("");
      setHeaders([]);
      setRows([]);
      setMapping({});
      setImportResult(null);
      return;
    }

    if (file.size > 2_000_000) {
      setRows([]); setHeaders([]); setMapping({}); setFileName("");
      setImportResult({ success: false, message: "File is too large. Split it into CSV files smaller than 2 MB." });
      return;
    }
    let parsed: ReturnType<typeof parseImportCsv>;
    try {
      parsed = parseImportCsv(await file.text());
      if (!parsed.rows.length) throw new Error("No data rows found.");
    } catch {
      setRows([]); setHeaders([]); setMapping({}); setFileName("");
      setImportResult({ success: false, message: "Could not read data rows. Check the CSV and upload it again." });
      return;
    }

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
      {reviewAction ? <ol className="import-steps" aria-label="Import progress">
        {["Upload", "Map fields", "Review matches", "Confirm", "Results"].map((label, index) => {
          const step = submitted ? 4 : review?.success ? (confirmed ? 3 : 2) : headers.length ? 1 : 0;
          return <li key={label} aria-current={index === step ? "step" : undefined}>{index + 1}. {label}</li>;
        })}
      </ol> : null}
      <section className="card">
        <p className="eyebrow">{eyebrow}</p>
        <h1>Upload and map a CSV</h1>
        <p className="muted">{description}</p>
        <label className="full">
          CSV file
          <input type="file" accept=".csv,text/csv" disabled={isPending} onChange={handleFileChange} />
        </label>
        {fileName ? <p className="muted top-gap">Loaded file: {fileName} · {rows.length} data rows detected.</p> : null}
        {importResult && !headers.length ? <p role="alert">{importResult.message}</p> : null}
      </section>

      {headers.length > 0 ? (
        <>
          {!review?.success && !submitted ? <section className="table-shell">
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
                          aria-label={`Map ${header}`}
                          disabled={isPending}
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
          </section> : null}

          <section className="table-shell">
            <p className="eyebrow">Import Preview</p>
            <p className="muted">{previewDescription}</p>
            {!review?.success && !submitted ? <div className="table-scroll">
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
            </div> : null}
            <p className="muted top-gap">{footerNote}</p>
            {reviewAction && !submitted ? <div className="grid top-gap">
              {review?.success ? <>
                <h2>Review matches before importing</h2>
                <p role="status">{review.readyCount} new records · {review.duplicateCount} possible duplicates (skipped) · {review.errorCount} errors</p>
                <p>Existing records will not be updated or merged. Duplicate rows are skipped. Fix errors before continuing. Row numbers refer to data rows, excluding the header.</p>
                <details><summary>View all {review.rowResults.length} row decisions</summary>
                  <div className="table-scroll"><table><thead><tr><th>Row</th><th>Decision</th><th>Details</th></tr></thead><tbody>
                    {review.rowResults.map(row => <tr key={row.row}><td>{row.row}</td><td>{row.status === "new" ? "New record" : row.status === "duplicate" ? "Possible duplicate" : "Error"}</td><td>{row.message}</td></tr>)}
                  </tbody></table></div>
                </details>
                <button type="button" className="secondary" disabled={isPending} onClick={() => { setReview(null); setConfirmed(false); }}>Back to mapping</button>
                {review.readyCount > 0 && review.errorCount === 0 ? <label className="checkbox-line"><input type="checkbox" checked={confirmed} disabled={isPending} onChange={event => setConfirmed(event.target.checked)} /> I reviewed this batch. Create only the {review.readyCount} new records and skip possible duplicates.</label> : null}
              </> : <button type="button" disabled={isPending || !rows.length || !mappedFields.length} onClick={() => startTransition(async () => {
                setReviewError(""); setReview(null); setConfirmed(false);
                try {
                  const result = await reviewAction({ fileName, rows, mapping });
                  if (result.success) setReview(result);
                  else setReviewError(result.message);
                } catch { setReviewError("Review could not be completed. No records were imported. Please try again."); }
              })}>{isPending ? "Checking records..." : "Review matches (no records saved)"}</button>}
              {reviewError ? <p role="alert">{reviewError}</p> : null}
            </div> : null}
            {submitAction ? (
              <div className="top-gap">
                {submitDescription ? <p className="muted">{submitDescription}</p> : null}
                <div className="button-row top-gap">
                  <button
                    type="button"
                    disabled={isPending || submitted || rows.length === 0 || mappedFields.length === 0 || Boolean(reviewAction && (!review?.success || !confirmed || review.errorCount || !review.readyCount))}
                    onClick={() =>
                      startTransition(async () => {
                        setSubmitted(true);
                        try {
                        const result = await submitAction({
                          fileName,
                          rows,
                          mapping
                        });
                        setImportResult(result);
                        } catch {
                          setImportResult({ success: false, message: "Import completion could not be confirmed. Check import history and existing records before retrying; some rows may have been saved." });
                        }
                      })
                    }
                  >
                    {isPending && submitted ? "Importing..." : submitted ? "Batch submitted" : submitLabel ?? "Import records"}
                  </button>
                </div>
                {importResult ? (
                  <div className="conditional-block top-gap" role="status">
                    <strong>{importResult.message}</strong>
                    {typeof importResult.createdCount === "number" || typeof importResult.skippedCount === "number" ? (
                      <p className="muted">
                        Created: {importResult.createdCount ?? 0} · Skipped: {importResult.skippedCount ?? 0}
                      </p>
                    ) : null}
                    {importResult.rowResults ? <details><summary>View all row outcomes</summary><ul>{importResult.rowResults.map(row => <li key={row.row}>Row {row.row}: {row.status} - {row.message}</li>)}</ul></details> : null}
                    <p>To start another batch, upload a new file. Check existing records before resubmitting unresolved rows.</p>
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
