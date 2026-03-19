"use client";

import { useMemo, useState } from "react";

type ExportColumn = {
  key: string;
  label: string;
};

export function ReportsExportBuilder({
  report,
  columns
}: {
  report: string;
  columns: ExportColumn[];
}) {
  const [selectedColumns, setSelectedColumns] = useState<string[]>(columns.map((column) => column.key));

  const downloadHref = useMemo(() => {
    const params = new URLSearchParams({ report });

    selectedColumns.forEach((column) => params.append("columns", column));

    return `/api/exports/donors?${params.toString()}`;
  }, [report, selectedColumns]);

  return (
    <div className="grid">
      <div className="card">
        <p className="eyebrow">Export Fields</p>
        <div className="grid">
          {columns.map((column) => (
            <label key={column.key} className="toggle-row">
              <input
                type="checkbox"
                checked={selectedColumns.includes(column.key)}
                onChange={(event) =>
                  setSelectedColumns((current) =>
                    event.target.checked ? [...current, column.key] : current.filter((value) => value !== column.key)
                  )
                }
              />
              <span>{column.label}</span>
            </label>
          ))}
        </div>
      </div>
      <div className="button-row">
        <a href={downloadHref} className="button-link">
          Download CSV
        </a>
      </div>
    </div>
  );
}
