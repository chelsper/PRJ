"use client";

import { useEffect, useState } from "react";

type ViewMode = "web" | "mobile";

const STORAGE_KEY = "prj-donor-view-mode";

export function DonorViewShell({ children }: { children: React.ReactNode }) {
  const [viewMode, setViewMode] = useState<ViewMode>("web");

  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY);

    if (saved === "web" || saved === "mobile") {
      setViewMode(saved);
    }
  }, []);

  function updateViewMode(nextMode: ViewMode) {
    setViewMode(nextMode);
    window.localStorage.setItem(STORAGE_KEY, nextMode);
  }

  return (
    <div className={`donor-view-shell donor-view-${viewMode}`}>
      <div className="view-mode-toolbar">
        <span className="view-mode-label">View</span>
        <div className="view-mode-toggle" role="tablist" aria-label="Donor page layout">
          <button
            type="button"
            className={viewMode === "web" ? "view-mode-button active" : "view-mode-button"}
            onClick={() => updateViewMode("web")}
            aria-pressed={viewMode === "web"}
          >
            Web
          </button>
          <button
            type="button"
            className={viewMode === "mobile" ? "view-mode-button active" : "view-mode-button"}
            onClick={() => updateViewMode("mobile")}
            aria-pressed={viewMode === "mobile"}
          >
            Mobile
          </button>
        </div>
      </div>
      {children}
    </div>
  );
}
