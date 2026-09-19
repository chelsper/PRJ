"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { profileQuerySchema, queryFields, queryOperators, type ProfileQuery } from "@/lib/profile-query";
import type { QueryOptions } from "@/server/data/profile-query-options";
import { previewProfileQuery } from "@/app/(admin)/reports/queries/actions";
import { AudienceReview } from "./audience-review";

const initial: ProfileQuery = { mode: "all", credit: "hard", period: "year", sameGift: true, requireGift: true, rules: [{ field: "total", operator: "gte", value: "500" }] };
type Saved = { name: string; query: ProfileQuery };
export function ProfileQueryBuilder({ userId, options }: { userId: string; options: QueryOptions }) {
  const [value, setValue] = useState<ProfileQuery>(initial);
  const [saved, setSaved] = useState<Saved[]>([]);
  const [name, setName] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Awaited<ReturnType<typeof previewProfileQuery>> | null>(null);
  const request = useRef(0);
  const key = `prj-profile-queries:${userId}:v1`;
  useEffect(() => { try {
    const stored: unknown = JSON.parse(localStorage.getItem(key) ?? "[]");
    if (Array.isArray(stored)) setSaved(stored.filter(item => typeof item?.name === "string" && profileQuerySchema.safeParse(item.query).success).slice(0, 30));
  } catch { setNotice("Saved queries could not be loaded from this browser."); } }, [key]);
  function change(next: ProfileQuery) { request.current++; setValue(next); setResult(null); setBusy(false); setNotice(""); }
  function edit(index: number, patch: Partial<ProfileQuery["rules"][number]>) { change({ ...value, rules: value.rules.map((rule, i) => i === index ? { ...rule, ...patch } : rule) }); }
  return <div className="grid">
    <section className="card"><h2>Saved Queries</h2><p>Saved in this browser for your account. Only filters are saved, not result records.</p>
      <div className="form-grid"><label>Load query<select value="" onChange={event => { const selected = saved[Number(event.target.value)]; if (selected) { change(selected.query); setName(selected.name); } }}><option value="">Choose a saved query</option>{saved.map((item, i) => <option key={item.name} value={i}>{item.name}</option>)}</select></label>
        <label>Query name<input maxLength={80} value={name} onChange={event => setName(event.target.value)} /></label></div>
      <button type="button" onClick={() => { if (!name.trim() || !profileQuerySchema.safeParse(value).success) { setNotice("Enter a name and valid conditions first."); return; }
        const next = [...saved.filter(item => item.name !== name.trim()), { name: name.trim(), query: value }];
        if (next.length > 30) { setNotice("Up to 30 queries can be saved. Reuse an existing name to update one."); return; }
        try { localStorage.setItem(key, JSON.stringify(next)); setSaved(next); setNotice("Query saved. Reusing the name updates it."); } catch { setNotice("This browser could not save the query."); }
      }}>Save query</button>
    </section>
    <form className="card grid" onSubmit={async event => {
      event.preventDefault(); const id = ++request.current; setBusy(true); setResult(null); setNotice("");
      try { const response = await previewProfileQuery(value); if (id === request.current) setResult(response); }
      catch { if (id === request.current) setNotice("Preview unavailable. Check your connection and sign-in, then try again."); }
      finally { if (id === request.current) setBusy(false); }
    }}>
      <h2>Find Profiles Where…</h2>
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
    {result?.rows && <section className="table-shell"><h2>{result.count} Matching Profiles</h2><p>Showing up to 200 profiles, once each. Matching is not permission to text. Credit labels summarize the selected period. If duplicate soft credits exist for one gift/profile, only the largest is counted; hard credit takes priority.</p>
      {!result.rows.length ? <p>No matches. Try removing a condition.</p> : <div className="table-scroll"><table><thead><tr><th>Profile</th><th>Recognition</th><th>Credit in period</th><th>Why matched</th></tr></thead><tbody>{result.rows.map(row => <tr key={row.id}><td><Link href={`/donors/${row.id}`}>{row.name}</Link><br />{row.number}</td><td>${row.total}</td><td>{row.credit}</td><td>{row.reasons.join("; ")}</td></tr>)}</tbody></table></div>}
    </section>}
    {result?.rows && result.rows.length > 0 && <AudienceReview key={JSON.stringify(value)} query={value} />}
  </div>;
}
