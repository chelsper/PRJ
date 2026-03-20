"use client";

import Link from "next/link";
import { useDeferredValue, useEffect, useRef, useState } from "react";

type DonorLookupOption = {
  id: string;
  donorNumber: string | null;
  donorType: "INDIVIDUAL" | "ORGANIZATION";
  fullName: string;
  email: string | null;
  title?: string | null;
  firstName?: string | null;
  middleName?: string | null;
  lastName?: string | null;
  primaryPhone?: string | null;
};

export type { DonorLookupOption };

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
  initialSelection = null,
  hiddenInputId,
  allowedTypes,
  placeholder,
  onSelectionChange,
  selectedHref,
  selectedActionLabel,
  suppressNoResults = false
}: {
  label: string;
  name: string;
  required?: boolean;
  initialSelection?: DonorLookupOption | null;
  hiddenInputId?: string;
  allowedTypes?: Array<DonorLookupOption["donorType"]>;
  placeholder?: string;
  onSelectionChange?: (selection: DonorLookupOption | null) => void;
  selectedHref?: string | null;
  selectedActionLabel?: string;
  suppressNoResults?: boolean;
}) {
  const [query, setQuery] = useState(initialSelection ? donorLabel(initialSelection) : "");
  const [selected, setSelected] = useState<DonorLookupOption | null>(initialSelection);
  const [results, setResults] = useState<DonorLookupOption[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const deferredQuery = useDeferredValue(query);
  const hiddenInputRef = useRef<HTMLInputElement | null>(null);
  const containerRef = useRef<HTMLLabelElement | null>(null);

  useEffect(() => {
    if (!hiddenInputRef.current) {
      return;
    }

    hiddenInputRef.current.dispatchEvent(new Event("change", { bubbles: true }));
    onSelectionChange?.(selected);
  }, [onSelectionChange, selected]);

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
        const filtered = allowedTypes?.length
          ? payload.donors.filter((donor: DonorLookupOption) => allowedTypes.includes(donor.donorType))
          : payload.donors;
        setResults(filtered);
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
  }, [allowedTypes, deferredQuery, selected]);

  useEffect(() => {
    if (!suppressNoResults) {
      return;
    }

    setResults([]);
    setLoading(false);
    setOpen(false);
  }, [suppressNoResults]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      if (!containerRef.current) {
        return;
      }

      const target = event.target;

      if (target instanceof Node && !containerRef.current.contains(target)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
    };
  }, [open]);

  return (
    <label ref={containerRef} className="full donor-lookup">
      <span>{label}</span>
      <input
        ref={hiddenInputRef}
        id={hiddenInputId}
        type="hidden"
        name={name}
        value={selected?.id ?? ""}
        required={required}
      />
      <input
        type="text"
        value={query}
        placeholder={placeholder ?? "Search donor by name, preferred name, or email"}
        autoComplete="off"
        onFocus={() => {
          if (!(selected && deferredQuery.trim() === donorLabel(selected))) {
            setOpen(true);
          }
        }}
        onChange={(event) => {
          setQuery(event.target.value);
          setSelected(null);
          setOpen(true);
        }}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            setOpen(false);
          }
        }}
      />
      <div className="lookup-selected muted">
        {selected ? `Selected: ${donorLabel(selected)} · ${donorMeta(selected)}` : required ? "Select an existing donor." : "Optional"}
      </div>
      {open ? (
        <div className="lookup-results">
        {loading ? <div className="lookup-result muted">Searching donors...</div> : null}
          {!loading &&
          results.length === 0 &&
          deferredQuery.trim().length >= 2 &&
          !suppressNoResults &&
          !(selected && deferredQuery.trim() === donorLabel(selected)) ? (
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
          {selectedHref ? (
            <Link href={selectedHref} className="button-link secondary-link">
              {selectedActionLabel ?? "Open linked record"}
            </Link>
          ) : null}
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
