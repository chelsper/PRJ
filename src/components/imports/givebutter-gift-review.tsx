"use client";
import { useState } from "react";
import type { LookupRow } from "@/server/data/lookups";
import { parseImportCsv } from "./import-workbench-utils";

export function GivebutterGiftReview({ funds, appeals, campaigns }: { funds: LookupRow[]; appeals: LookupRow[]; campaigns: LookupRow[] }) {
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [error, setError] = useState("");
  const [fileName, setFileName] = useState("");
  const [defaultFund, setDefaultFund] = useState("");
  const [amountField, setAmountField] = useState("Amount");
  const [mapping, setMapping] = useState<Record<string, { fund: string; appeal: string; campaign: string }>>({});
  const titles = [...new Set(rows.map(row => row["Campaign Title"]))];
  const references = new Map<string, number>();
  rows.forEach(row => references.set(row["Reference Number"], (references.get(row["Reference Number"]) ?? 0) + 1));
  function issues(row: Record<string, string>) {
    const problems = [];
    if (row["Status Friendly"] !== "Succeeded") problems.push(`Review status: ${row["Status Friendly"] || "missing"}`);
    if (row.Currency !== "USD") problems.push("Unsupported currency");
    if (row["Dispute Status"]?.trim()) problems.push("Review dispute status");
    if (row["Refund Date (UTC)"]?.trim()) problems.push("Refund date present");
    if (!row["Transaction Date (UTC)"] || !Number.isFinite(Date.parse(row["Transaction Date (UTC)"]))) problems.push("Invalid transaction date");
    if (!row["Reference Number"]) problems.push("Missing transaction reference");
    else if ((references.get(row["Reference Number"]) ?? 0) > 1) problems.push("Repeated transaction reference in file");
    if (!row["Contact ID"]) problems.push("Missing source Contact ID");
    if (!/^(?:\d+)(?:\.\d{1,2})?$/.test(row[amountField] ?? "") || Number(row[amountField]) <= 0) problems.push("Amount needs review");
    if (!(mapping[row["Campaign Title"]]?.fund || defaultFund)) problems.push("Choose a fund");
    return problems;
  }
  function select(title: string, field: "fund" | "appeal" | "campaign", options: LookupRow[]) {
    return <select aria-label={`${title || "Untitled campaign"}: ${field}`} value={mapping[title]?.[field] ?? ""} onChange={event => setMapping(current => ({ ...current, [title]: { ...(current[title] ?? { fund: "", appeal: "", campaign: "" }), [field]: event.target.value } }))}>
      <option value="">{field === "fund" ? "Use default fund" : "None"}</option>{options.map(option => <option key={option.id} value={option.id}>{option.name}</option>)}
    </select>;
  }
  return <div className="grid">
    <section className="card"><h2>Givebutter Gift Preparation</h2>
      <p>Upload a transaction export, choose defaults, and match each Givebutter campaign to an existing CRM appeal, fund, or campaign. This is a preparation preview only; it does not create gifts.</p>
      <label>Givebutter transactions CSV<input type="file" accept=".csv,text/csv" onChange={async event => {
        const file = event.target.files?.[0]; setRows([]); setMapping({}); setError(""); setFileName("");
        if (!file) return;
        if (file.size > 5 * 1024 * 1024) { setError("Use a CSV smaller than 5 MB."); return; }
        try {
          const parsed = parseImportCsv(await file.text());
          const required = ["Campaign Title", "Reference Number", "Contact ID", "Status Friendly", "Currency", "Amount", "Transaction Date (UTC)"];
          const missing = required.filter(header => !parsed.headers.includes(header));
          if (missing.length) { setError(`Missing Givebutter columns: ${missing.join(", ")}`); return; }
          if (parsed.rows.length > 10000) { setError("Split the export into files of at most 10,000 transactions."); return; }
          setRows(parsed.rows); setFileName(file.name); setAmountField("Amount");
        } catch { setError("The CSV could not be read. Please export it again."); }
      }} /></label>
      {error && <p role="alert" className="danger">{error}</p>}
      {fileName && <p role="status">{fileName}: {rows.length} transactions, {titles.length} source campaigns.</p>}
    </section>
    {!!rows.length && <>
      <section className="card"><h2>Defaults And Amounts</h2><div className="form-grid">
        <label>Default fund<select value={defaultFund} onChange={event => setDefaultFund(event.target.value)}><option value="">Choose a fund</option>{funds.map(fund => <option key={fund.id} value={fund.id}>{fund.name}</option>)}</select></label>
        <label>Gift amount source<select value={amountField} onChange={event => setAmountField(event.target.value)}>{["Amount", "Donated"].filter(field => field in rows[0]).map(field => <option key={field}>{field}</option>)}</select></label>
      </div><p>Confirm the meaning of Amount versus Donated before importing. Fees and payout amounts must remain separate from gift amounts. Receipt amounts need their own review; this preview does not calculate them.</p></section>
      <section className="table-shell"><h2>Match Campaigns To CRM Codes</h2><p>One Givebutter campaign can map to an appeal and a fund without creating a CRM campaign. Labels include appeal codes. No codes or funds are created automatically.</p><div className="table-scroll"><table><thead><tr><th>Givebutter campaign</th><th>CRM appeal</th><th>Fund override</th><th>CRM campaign (optional)</th></tr></thead><tbody>{titles.map(title => <tr key={title}><td>{title || "No campaign title"}</td><td>{select(title, "appeal", appeals)}</td><td>{select(title, "fund", funds)}</td><td>{select(title, "campaign", campaigns)}</td></tr>)}</tbody></table></div></section>
      <section className="table-shell"><h2>Transaction Preview</h2><p>{rows.filter(row => !issues(row).length).length} pass the checks below; {rows.filter(row => issues(row).length).length} need review. This does not check existing CRM gifts or match constituents.</p><p>Showing first 50 rows. Source Contact ID and transaction reference will be kept separate from CRM IDs. Refunds, disputes, soft credits, and dedications require separate handling before final import.</p><div className="table-scroll"><table><thead><tr><th>Reference</th><th>Source Contact ID</th><th>Date (UTC)</th><th>Amount selected</th><th>Fund</th><th>Appeal</th><th>Review</th></tr></thead><tbody>{rows.slice(0, 50).map((row, index) => <tr key={index}><td>{row["Reference Number"]}</td><td>{row["Contact ID"]}</td><td>{row["Transaction Date (UTC)"]}</td><td>{row[amountField]} {row.Currency}</td><td>{funds.find(fund => fund.id === (mapping[row["Campaign Title"]]?.fund || defaultFund))?.name ?? "Not selected"}</td><td>{appeals.find(appeal => appeal.id === mapping[row["Campaign Title"]]?.appeal)?.name ?? "None"}</td><td>{issues(row).join("; ") || "Basic checks passed; database review still required"}</td></tr>)}</tbody></table></div>
      <p className="muted">Nothing has been imported. Final record creation remains unavailable until source-ID duplicate protection and constituent matching are implemented. Changing or leaving this page discards these preparation choices.</p></section>
    </>}
  </div>;
}
