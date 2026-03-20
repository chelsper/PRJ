"use client";

import Link from "next/link";
import { useDeferredValue, useEffect, useState } from "react";

type DonorSearchOption = {
  id: string;
  donorNumber: string | null;
  donorType: "INDIVIDUAL" | "ORGANIZATION";
  fullName: string;
  email: string | null;
};

function donorMeta(option: DonorSearchOption) {
  return [option.donorNumber ?? "Pending donor ID", option.donorType, option.email ?? "No email"].join(" · ");
}

export function DonorPageSearch({ compact = false }: { compact?: boolean }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<DonorSearchOption[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const deferredQuery = useDeferredValue(query);

  useEffect(() => {
    const search = deferredQuery.trim();

    if (search.length < 2) {
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

        const payload = (await response.json()) as { donors: DonorSearchOption[] };
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
  }, [deferredQuery]);

  return (
    <div className={compact ? "dashboard-donor-search" : "form-grid"}>
      <label className="full donor-lookup">
        Search donor name
        <input
          name="q"
          value={query}
          placeholder="Search donor by name, donor ID, or email"
          autoComplete="off"
          onFocus={() => setOpen(true)}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
          }}
        />
        <div className="lookup-selected muted">Start typing to open a donor record directly from search results.</div>
        {open && query.trim().length >= 2 ? (
          <div className="lookup-results">
            {loading ? <div className="lookup-result muted">Searching donors...</div> : null}
            {!loading && results.length === 0 ? <div className="lookup-result muted">No donor matches found.</div> : null}
            {results.map((option: DonorSearchOption) => (
              <Link
                key={option.id}
                href={`/donors/${option.id}`}
                className="lookup-result"
                onClick={() => {
                  setOpen(false);
                }}
              >
                <strong>{option.fullName}</strong>
                <span className="muted">{donorMeta(option)}</span>
              </Link>
            ))}
          </div>
        ) : null}
      </label>
    </div>
  );
}
