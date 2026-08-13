"use client";

import Link from "next/link";
import { useDeferredValue, useEffect, useRef, useState } from "react";

type GlobalSearchResult = {
  id: string;
  type: "constituent" | "provider" | "gift" | "patient_case";
  title: string;
  detail: string;
  href: string;
};

const labels: Record<GlobalSearchResult["type"], string> = {
  constituent: "Constituent",
  provider: "Provider",
  gift: "Gift",
  patient_case: "Patient case"
};

export function GlobalSearch() {
  const [value, setValue] = useState("");
  const [results, setResults] = useState<GlobalSearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const deferredValue = useDeferredValue(value);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const search = deferredValue.trim();

    if (search.length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    setLoading(true);
    setOpen(true);

    void fetch(`/api/global-search?q=${encodeURIComponent(search)}`, { credentials: "same-origin", signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("Search unavailable");
        }

        const payload = (await response.json()) as { results: GlobalSearchResult[] };
        setResults(payload.results);
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          console.error(error);
          setResults([]);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      });

    return () => controller.abort();
  }, [deferredValue]);

  useEffect(() => {
    const closeOnOutsideClick = (event: MouseEvent | TouchEvent) => {
      if (event.target instanceof Node && containerRef.current && !containerRef.current.contains(event.target)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", closeOnOutsideClick);
    document.addEventListener("touchstart", closeOnOutsideClick);
    return () => {
      document.removeEventListener("mousedown", closeOnOutsideClick);
      document.removeEventListener("touchstart", closeOnOutsideClick);
    };
  }, []);

  return (
    <div className="global-search" ref={containerRef}>
      <label className="global-search-field">
        <span className="sr-only">Search the CRM</span>
        <input
          value={value}
          onChange={(event) => setValue(event.target.value)}
          onFocus={() => setOpen(true)}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              setOpen(false);
            }
          }}
          placeholder="Search constituents, gifts, providers, or cases"
          autoComplete="off"
        />
      </label>
      {open && value.trim().length >= 2 ? (
        <div className="global-search-results">
          {loading ? <p className="global-search-empty muted">Searching...</p> : null}
          {!loading && results.length === 0 ? <p className="global-search-empty muted">No matching records found.</p> : null}
          {results.map((result) => (
            <Link key={result.id} href={result.href} className="global-search-result" onClick={() => setOpen(false)}>
              <span className={`global-search-type global-search-type-${result.type}`}>{labels[result.type]}</span>
              <strong>{result.title}</strong>
              <span className="muted">{result.detail}</span>
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  );
}
