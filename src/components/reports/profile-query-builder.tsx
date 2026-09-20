"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { profileQuerySchema, queryFields, queryOperators, type ProfileQuery } from "@/lib/profile-query";
import type { QueryOptions } from "@/server/data/profile-query-options";
import { exportProfileQuery, previewProfileQuery } from "@/app/(admin)/reports/queries/actions";
import { queryPresets, readSavedQueries, saveQuery, describeQuery, type SavedQuery } from "@/lib/query-workspace";
import { AudienceReview } from "./audience-review";

export function ProfileQueryBuilder({ userId, options, canExport, canReviewAudience }: { userId: string; options: QueryOptions; canExport: boolean; canReviewAudience: boolean }) {
  const [value, setValue] = useState<ProfileQuery>(queryPresets[0].query);
  const [saved, setSaved] = useState<SavedQuery[]>([]);
  const [presetId, setPresetId] = useState(queryPresets[0].id);
  const [loadedName, setLoadedName] = useState("");
  const [replaceConfirm, setReplaceConfirm] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [name, setName] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Awaited<ReturnType<typeof previewProfileQuery>> | null>(null);
  const request = useRef(0);
  const key = `prj-profile-queries:${userId}:v1`;
  useEffect(() => { try {
    const stored: unknown = JSON.parse(localStorage.getItem(key) ?? "[]");
    setSaved(readSavedQueries(stored));
  } catch { setNotice("Saved queries could not be loaded from this browser."); } }, [key]);
  function change(next: ProfileQuery) { request.current++; setValue(next); setResult(null); setBusy(false); setExporting(false); setNotice(""); setReplaceConfirm(false); setDeleteConfirm(false); setPresetId(""); }
  function edit(index: number, patch: Partial<ProfileQuery["rules"][number]>) { change({ ...value, rules: value.rules.map((rule, i) => i === index ? { ...rule, ...patch } : rule) }); }
  function persist() {
    try {
      const next = saveQuery(saved, name, value);
      localStorage.setItem(key, JSON.stringify(next)); setSaved(next); setValue(next[next.length - 1].query); setName(name.trim()); setLoadedName(name.trim()); setReplaceConfirm(false); setNotice("Filters saved in this browser. Results are not stored; run the query for current matches.");
    } catch { setNotice("Could not save. Check the name and conditions, the 30-query limit, and browser storage availability."); }
  }
  const summary = describeQuery(value, options);
  const loaded = saved.find(item => item.name === loadedName);
  return <div className="grid">
    <section className="card"><h2>Start with a common query</h2>
      <label>Preset<select value={presetId} onChange={event => {
        const preset = queryPresets.find(item => item.id === event.target.value);
        if (!preset) return;
        change(structuredClone(preset.query)); setPresetId(preset.id); setLoadedName(""); setName(preset.name);
      }}><option value="">Custom filters</option>{queryPresets.map(preset => <option key={preset.id} value={preset.id}>{preset.name}</option>)}</select></label>
      <p className="muted">{queryPresets.find(preset => preset.id === presetId)?.description ?? "Adjust the conditions below, then show matching profiles."}</p>
      <p>Presets change filters only. They do not export records or send messages.</p>
    </section>
    <section className="card"><h2>Saved Queries</h2><p>Saved in this browser for your account. Only filters are saved, not result records.</p>
      <div className="form-grid"><label>Load query<select value={loadedName} onChange={event => { const selected = saved.find(item => item.name === event.target.value); if (selected) { change(structuredClone(selected.query)); setName(selected.name); setLoadedName(selected.name); } }}><option value="">Choose a saved query</option>{saved.map(item => <option key={item.name} value={item.name}>{item.name}</option>)}</select></label>
        <label>Query name<input maxLength={80} value={name} onChange={event => { setName(event.target.value); setReplaceConfirm(false); }} /></label></div>
      {loaded && JSON.stringify(loaded.query) !== JSON.stringify(value) ? <p>Unsaved filter changes. Saving will require confirmation before replacing a query.</p> : null}
      <div className="button-row">
      <button type="button" onClick={() => { if (!name.trim() || !profileQuerySchema.safeParse(value).success) { setNotice("Enter a name and valid conditions first."); return; }
        if (saved.some(item => item.name.toLowerCase() === name.trim().toLowerCase())) { setReplaceConfirm(true); return; }
        persist();
      }}>Save query</button>
      {loaded && <button type="button" className="secondary" onClick={() => setDeleteConfirm(true)}>Delete saved query</button>}
      </div>
      {replaceConfirm && <div className="conditional-block"><p>Replace the saved filters for "{name.trim()}"?</p><div className="button-row"><button type="button" onClick={persist}>Replace saved filters</button><button type="button" className="secondary" onClick={() => setReplaceConfirm(false)}>Cancel</button></div></div>}
      {deleteConfirm && loaded && <div className="conditional-block"><p>Delete "{loaded.name}" from this browser? No constituent records will be deleted.</p><div className="button-row"><button type="button" onClick={() => {
        try { const next = saved.filter(item => item.name !== loadedName); localStorage.setItem(key, JSON.stringify(next)); setSaved(next); setLoadedName(""); setDeleteConfirm(false); setNotice("Saved query deleted. Current filters are unchanged."); }
        catch { setNotice("The saved query could not be deleted from browser storage."); }
      }}>Confirm deletion</button><button type="button" className="secondary" onClick={() => setDeleteConfirm(false)}>Cancel</button></div></div>}
    </section>
    <form className="card grid" onSubmit={async event => {
      event.preventDefault(); const id = ++request.current; setBusy(true); setExporting(false); setResult(null); setNotice("");
      try { const response = await previewProfileQuery(value); if (id === request.current) setResult(response); }
      catch { if (id === request.current) setNotice("Preview unavailable. Check your connection and sign-in, then try again."); }
      finally { if (id === request.current) setBusy(false); }
    }}>
      <h2>Find Profiles Where…</h2>
      <aside className="conditional-block" aria-label="Current query summary"><strong>{value.mode === "all" ? "Match all conditions" : "Match any condition"}</strong><ul>{summary.rules.map((rule, index) => <li key={index}>{rule}</li>)}</ul><p>{summary.credit} · Gifts: {summary.period}. {value.requireGift ? "At least one credited gift is required." : "Profiles without gifts may match."}</p></aside>
      <div className="form-grid">
        <label>Match<select value={value.mode} onChange={event => change({ ...value, mode: event.target.value as ProfileQuery["mode"] })}><option value="all">All conditions</option><option value="any">Any condition</option></select></label>
        <label>Gift period<select value={value.period} onChange={event => change({ ...value, period: event.target.value as ProfileQuery["period"], requireGift: event.target.value === "custom" ? true : value.requireGift })}><option value="year">This calendar year</option><option value="all">All time</option><option value="custom">Custom date range</option></select></label>
        {value.period === "custom" && <><label>From (inclusive)<input type="date" required value={value.from ?? ""} onChange={event => change({ ...value, from: event.target.value })} /></label><label>Through (inclusive)<input type="date" required value={value.to ?? ""} min={value.from} onChange={event => change({ ...value, to: event.target.value })} /></label></>}
        <label>Giving credit<select value={value.credit} onChange={event => change({ ...value, credit: event.target.value as ProfileQuery["credit"] })}><option value="hard">Hard-credit donors only</option><option value="both">Include soft credits</option></select></label>
      </div>
      <label className="toggle-row"><input type="checkbox" checked={!!value.requireGift} onChange={event => change({ ...value, requireGift: event.target.checked })} />Only profiles with at least one credited gift in this period</label>
      {value.mode === "all" && <label className="toggle-row"><input type="checkbox" checked={!!value.sameGift} onChange={event => change({ ...value, sameGift: event.target.checked })} />Gift conditions must match the same gift</label>}
      <p>Combine constituent conditions with gift conditions using Match all. Date-range endpoints and Between amounts are inclusive. Gift searches include payment records; total recognition excludes pledge payments to avoid counting the pledge twice. Recognition is not cash received.</p>
      <p>{value.sameGift && value.mode === "all" ? "Gift conditions must be true on one gift." : "Different gifts may satisfy different conditions."} Total recognition always covers the whole period, not just gifts matching other conditions. Turn off the gift requirement for constituent-only queries.</p>
      {value.rules.map((rule, index) => {
        const field = queryFields.find(item => item.key === rule.field)!;
        return <fieldset key={index} className="card"><legend>Condition {index + 1}</legend><div className="form-grid">
          <label>Category<select value={field.category} onChange={event => edit(index, event.target.value === "Gifts" ? { field: "total", operator: "gte", value: "" } : { field: "name", operator: "contains", value: "" })}><option>Constituents</option><option>Gifts</option></select></label>
          <label>Field<select value={rule.field} onChange={event => { const next = queryFields.find(item => item.key === event.target.value)!; edit(index, { field: next.key, operator: next.numeric || next.date ? "gte" : next.options ? "equals" : "contains", value: "", valueTo: "" }); }}>{queryFields.filter(item => item.category === field.category).map(item => <option key={item.key} value={item.key}>{item.label}</option>)}</select></label>
          <label>Condition<select value={rule.operator} onChange={event => edit(index, { operator: event.target.value as typeof rule.operator })}>{field.options && rule.operator === "contains" && <option value="contains">Contains (saved query)</option>}{queryOperators(field).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
          {rule.operator !== "blank" && <label>{rule.operator === "between" ? "From" : "Value"}{field.options && rule.operator === "equals" ? <select required value={rule.value} onChange={event => edit(index, { value: event.target.value })}><option value="">Select a value</option>{rule.value && !options[field.key]?.some(option => option.value === rule.value) && <option value={rule.value}>{rule.value} (saved value)</option>}{(options[field.key] ?? []).map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select> : <input required type={field.date ? "date" : field.numeric ? "number" : "text"} min={field.numeric ? 0 : undefined} step={field.numeric ? field.money === false ? "1" : "0.01" : undefined} maxLength={200} value={rule.value} onChange={event => edit(index, { value: event.target.value })} />}</label>}
          {rule.operator === "between" && <label>Through<input required type={field.date ? "date" : "number"} min={rule.value} step={field.numeric ? field.money === false ? "1" : "0.01" : undefined} value={rule.valueTo ?? ""} onChange={event => edit(index, { valueTo: event.target.value })} /></label>}
        </div><button type="button" disabled={value.rules.length === 1} onClick={() => change({ ...value, rules: value.rules.filter((_, i) => i !== index) })}>Remove condition {index + 1}</button></fieldset>;
      })}
      <div className="button-row"><button type="button" disabled={value.rules.length >= 10} onClick={() => change({ ...value, rules: [...value.rules, { field: "name", operator: "contains", value: "" }] })}>Add condition</button><button type="submit" disabled={busy}>{busy ? "Finding profiles..." : "Show matching profiles"}</button></div>
    </form>
    <p role="status">{notice}</p>
    {result?.error && <p role="alert" className="danger">{result.error}</p>}
    {result?.rows && <section className="table-shell"><h2 role="status">{result.count} Matching Profiles</h2><p>Showing {result.rows.length} of {result.count} profiles, once each. Matching is not permission to text. Credit labels summarize the selected period. If duplicate soft credits exist for one gift/profile, only the largest is counted; hard credit takes priority.</p>
      {result.count > 200 ? <p role="alert">Narrow your filters to 200 profiles or fewer before exporting or reviewing a texting audience. No partial list will be used.</p> : null}
      {canExport && result.count > 0 && <div className="button-row"><button type="button" disabled={exporting || result.count > 200} onClick={async () => {
        const id = request.current; setExporting(true); setNotice("");
        try {
          const response = await exportProfileQuery(value, result.count);
          if (id !== request.current) return;
          if (response.error || !response.csv) { setNotice(response.error ?? "Export unavailable."); return; }
          const url = URL.createObjectURL(new Blob(["\uFEFF", response.csv], { type: "text/csv;charset=utf-8" }));
          const link = document.createElement("a"); link.href = url; link.download = "matching-profiles.csv"; document.body.appendChild(link); link.click(); link.remove();
          setTimeout(() => URL.revokeObjectURL(url), 1000);
          setNotice(`CSV prepared for ${response.count} profiles. Check your downloads. Matches were rechecked before export.`);
        } catch { if (id === request.current) setNotice("Export failed. Check your connection and permissions, then try again."); }
        finally { if (id === request.current) setExporting(false); }
      }}>{exporting ? "Preparing CSV..." : `Download ${result.count} matching profiles (CSV)`}</button><span className="muted">Summary columns: ID, name, recognition, credit, and match reasons.</span></div>}
      {!result.rows.length ? <p>No matches. Try removing a condition.</p> : <div className="table-scroll"><table><thead><tr><th>Profile</th><th>Recognition</th><th>Credit in period</th><th>Why matched</th></tr></thead><tbody>{result.rows.map(row => <tr key={row.id}><td><Link href={`/donors/${row.id}`}>{row.name}</Link><br />{row.number}</td><td>${row.total}</td><td>{row.credit}</td><td>{row.reasons.join("; ")}</td></tr>)}</tbody></table></div>}
    </section>}
    {canReviewAudience && result?.rows && result.rows.length > 0 && result.count <= 200 && <AudienceReview key={`${JSON.stringify(value)}:${request.current}`} query={value} />}
  </div>;
}
