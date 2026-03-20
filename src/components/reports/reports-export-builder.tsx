"use client";

import { useState } from "react";

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

  return (
    <form className="grid" action="/api/exports/donors" method="post">
      <input type="hidden" name="report" value={report} />
      {selectedColumns.map((column) => (
        <input key={column} type="hidden" name="columns" value={column} />
      ))}
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
        <button type="submit" className="button-link">
          Download CSV
        </button>
      </div>
    </form>
  );
}
