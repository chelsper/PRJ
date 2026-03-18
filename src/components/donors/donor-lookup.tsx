"use client";

import { useDeferredValue, useEffect, useState } from "react";

type DonorLookupOption = {
  id: string;
  donorNumber: string | null;
  donorType: "INDIVIDUAL" | "ORGANIZATION";
  fullName: string;
  email: string | null;
};

function donorLabel(option: DonorLookupOption) {
  return option.fullName;
}

function donorMeta(option: DonorLookupOption) {
  return [option.donorNumber ?? "Pending donor ID", option.donorType, option.email ?? "No email"].join(" · ");
}

export function DonorLookup({
  label,
  name,
  required = false,
  initialSelection = null
}: {
  label: string;
  name: string;
  required?: boolean;
  initialSelection?: DonorLookupOption | null;
}) {
  const [query, setQuery] = useState(initialSelection ? donorLabel(initialSelection) : "");
  const [selected, setSelected] = useState<DonorLookupOption | null>(initialSelection);
  const [results, setResults] = useState<DonorLookupOption[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const deferredQuery = useDeferredValue(query);

  useEffect(() => {
    const search = deferredQuery.trim();

    if (search.length < 2 || (selected && search === donorLabel(selected))) {
      setResults([]);
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    setLoading(true);

    void fetch(`/api/donors/search?q=${encodeURIComponent(search)}`, {
      method: "GET",
      credentials: "same-origin",
      signal: controller.signal
    })
      .then(async (response: Response) => {
        if (!response.ok) {
          throw new Error("Lookup failed");
        }

        const payload = (await response.json()) as { donors: DonorLookupOption[] };
        setResults(payload.donors);
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) {
          return;
        }

        console.error(error);
        setResults([]);
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      });

    return () => controller.abort();
  }, [deferredQuery, selected]);

  return (
    <label className="full donor-lookup">
      <span>{label}</span>
      <input type="hidden" name={name} value={selected?.id ?? ""} required={required} />
      <input
        type="text"
        value={query}
        placeholder="Search donor by name, preferred name, or email"
        autoComplete="off"
        onFocus={() => setOpen(true)}
        onChange={(event) => {
          setQuery(event.target.value);
          setSelected(null);
          setOpen(true);
        }}
      />
      <div className="lookup-selected muted">
        {selected ? `Selected: ${donorLabel(selected)} · ${donorMeta(selected)}` : required ? "Select an existing donor." : "Optional"}
      </div>
      {open ? (
        <div className="lookup-results">
          {loading ? <div className="lookup-result muted">Searching donors...</div> : null}
          {!loading && results.length === 0 && deferredQuery.trim().length >= 2 ? (
            <div className="lookup-result muted">No donor matches found.</div>
          ) : null}
          {results.map((option: DonorLookupOption) => (
            <button
              key={option.id}
              type="button"
              className="lookup-result"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => {
                setSelected(option);
                setQuery(donorLabel(option));
                setResults([]);
                setOpen(false);
              }}
            >
              <strong>{donorLabel(option)}</strong>
              <span className="muted">{donorMeta(option)}</span>
            </button>
          ))}
        </div>
      ) : null}
      {selected ? (
        <div className="button-row">
          <button
            type="button"
            className="secondary"
            onClick={() => {
              setSelected(null);
              setQuery("");
              setOpen(false);
              setResults([]);
            }}
          >
            Clear
          </button>
        </div>
      ) : null}
    </label>
  );
}
