"use client";

import { useEffect, useRef, useState } from "react";

type ExportColumn = {
  key: string;
  label: string;
};

export function ReportsExportBuilder({
  report,
  columns, userId, givingLevels
}: {
  report: string;
  columns: ExportColumn[];
  userId: string;
  givingLevels: { value: string; label: string }[];
}) {
  const [selectedColumns, setSelectedColumns] = useState<string[]>(columns.map((column) => column.key));
  type View = { id: string; name: string; query: string; givingLevel: string; columns: string[] };
  const [views, setViews] = useState<View[]>([]);
  const [viewId, setViewId] = useState("");
  const [name, setName] = useState("");
  const [query, setQuery] = useState("");
  const [givingLevel, setGivingLevel] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<{ rows: Record<string, string>[]; rowCount: number } | null>(null);
  const request = useRef(0);
  const storageKey = `prj-report-views:${userId}:${report}:v1`;
  useEffect(() => {
    try {
      const saved: unknown = JSON.parse(localStorage.getItem(storageKey) ?? "[]");
      if (Array.isArray(saved)) setViews(saved.filter((v): v is View => v && typeof v.id === "string" && typeof v.name === "string" && typeof v.query === "string" && typeof v.givingLevel === "string" && Array.isArray(v.columns) && v.columns.every((k: unknown) => typeof k === "string")).slice(0, 50));
    } catch { setNotice("Saved views could not be loaded in this browser."); }
  }, [storageKey]);
  function invalidate() { request.current++; setPreview(null); setBusy(false); }
  function persist(next: View[], message: string) {
    try { localStorage.setItem(storageKey, JSON.stringify(next)); setViews(next); setNotice(message); return true; }
    catch { setNotice("This browser could not save the view. You can still export."); return false; }
  }
  function save() {
    if (!name.trim() || !selectedColumns.length) { setNotice("Enter a view name and select at least one column."); return; }
    if (!viewId && views.length >= 50) { setNotice("Remove an existing view before saving more than 50 views."); return; }
    const id = viewId || crypto.randomUUID();
    if (persist([...views.filter(v => v.id !== id), { id, name: name.trim(), query, givingLevel, columns: selectedColumns }], "View saved in this browser.")) setViewId(id);
  }
  function load(id: string) {
    invalidate(); setViewId(id); setNotice("");
    const v = views.find(view => view.id === id);
    setName(v?.name ?? ""); setQuery(v?.query ?? ""); setGivingLevel(v?.givingLevel ?? "");
    setSelectedColumns(v ? [...new Set(v.columns)].filter(key => columns.some(c => c.key === key)) : columns.map(c => c.key));
  }
  function move(index: number, offset: number) {
    invalidate(); setSelectedColumns(current => { const next = [...current]; [next[index], next[index + offset]] = [next[index + offset], next[index]]; return next; });
  }
  async function showPreview(form: HTMLFormElement) {
    const id = ++request.current;
    setBusy(true); setNotice(""); setPreview(null);
    const data = new FormData(form); data.set("preview", "true");
    try {
      const response = await fetch("/api/exports/donors", { method: "POST", body: data });
      if (!response.ok || !response.headers.get("content-type")?.includes("application/json")) throw new Error();
      const result = await response.json();
      if (!Array.isArray(result.rows) || typeof result.rowCount !== "number") throw new Error();
      if (request.current === id) setPreview(result);
    } catch { if (request.current === id) setNotice("Preview could not be loaded. Please retry or check that you are signed in."); }
    finally { if (request.current === id) setBusy(false); }
  }

  return (
    <form className="grid report-builder" action="/api/exports/donors" method="post">
      <input type="hidden" name="report" value={report} />
      {selectedColumns.map((column) => (
        <input key={column} type="hidden" name="columns" value={column} />
      ))}
      <section className="card">
        <h3>Saved Views</h3>
        <p>Save filters and column order in this browser. Only settings are saved, not donor data.</p>
        <div className="form-grid">
          <label>View<select value={viewId} onChange={event => load(event.target.value)}><option value="">New view</option>{views.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}</select></label>
          <label>View name<input value={name} maxLength={80} onChange={event => setName(event.target.value)} /></label>
        </div>
        <div className="button-row"><button type="button" onClick={save}>{viewId ? "Update view" : "Save view"}</button>{viewId && <button type="button" onClick={() => { if (persist(views.filter(v => v.id !== viewId), "Saved view removed.")) { setViewId(""); setName(""); } }}>Remove saved view</button>}</div>
      </section>
      <section className="card">
        <h3>Report Filters</h3><p>Donors with gifts in the current calendar year.</p>
        <div className="form-grid">
          <label>Donor name, constituent ID, or email<input name="query" value={query} maxLength={200} onChange={event => { invalidate(); setQuery(event.target.value); }} /></label>
          <label>Giving level<select name="givingLevel" value={givingLevel} onChange={event => { invalidate(); setGivingLevel(event.target.value); }}><option value="">All giving levels</option>{givingLevel && !givingLevels.some(l => l.value === givingLevel) && <option value={givingLevel}>{givingLevel} (no current qualifiers)</option>}{givingLevels.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}</select></label>
        </div>
      </section>
      <div className="card">
        <p className="eyebrow">Export Fields</p>
        <p>{selectedColumns.length} selected. Column order below is used for both preview and CSV.</p>
        <div className="button-row"><button type="button" onClick={() => { invalidate(); setSelectedColumns(columns.map(c => c.key)); }}>Select all</button><button type="button" onClick={() => { invalidate(); setSelectedColumns([]); }}>Clear selection</button></div>
        <div className="report-column-list">
          {[...selectedColumns, ...columns.map(c => c.key).filter(key => !selectedColumns.includes(key))].map(key => columns.find(c => c.key === key)!).map((column) => (
            <div className="report-column-row" key={column.key}>
            <label key={column.key} className="toggle-row">
              <input
                type="checkbox"
                checked={selectedColumns.includes(column.key)}
                onChange={(event) => { invalidate();
                  setSelectedColumns((current) =>
                    event.target.checked ? [...current, column.key] : current.filter((value) => value !== column.key)
                  ); }}
              />
              <span>{column.label}</span>
            </label>
            {selectedColumns.includes(column.key) && <div className="button-row"><button type="button" aria-label={`Move ${column.label} up`} disabled={selectedColumns.indexOf(column.key) === 0} onClick={() => move(selectedColumns.indexOf(column.key), -1)}>Up</button><button type="button" aria-label={`Move ${column.label} down`} disabled={selectedColumns.indexOf(column.key) === selectedColumns.length - 1} onClick={() => move(selectedColumns.indexOf(column.key), 1)}>Down</button></div>}
            </div>
          ))}
        </div>
      </div>
      <p role="status" aria-live="polite">{notice}</p>
      <div className="button-row">
        <button type="button" disabled={busy || !selectedColumns.length} onClick={event => { if (event.currentTarget.form) void showPreview(event.currentTarget.form); }}>{busy ? "Loading preview..." : "Preview results"}</button>
        <button type="submit" className="button-link" disabled={!selectedColumns.length}>
          Download CSV
        </button>
      </div>
      {!selectedColumns.length && <p>Select at least one column to preview or download.</p>}
      {preview && <section className="card"><h3>Report Preview</h3><p>{preview.rowCount} matching donors. Showing the first {preview.rows.length}; CSV includes all matches.</p>{preview.rows.length ? <div className="table-scroll" tabIndex={0} aria-label="Report preview: scroll for more columns"><table><thead><tr>{selectedColumns.map(key => <th key={key}>{columns.find(c => c.key === key)?.label}</th>)}</tr></thead><tbody>{preview.rows.map((row, index) => <tr key={index}>{selectedColumns.map(key => <td key={key}>{row[key] || "—"}</td>)}</tr>)}</tbody></table></div> : <p>No donors match these filters.</p>}</section>}
    </form>
  );
}
