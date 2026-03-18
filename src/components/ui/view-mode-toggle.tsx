"use client";

import { useEffect, useState } from "react";

type ViewMode = "web" | "mobile";

const STORAGE_KEY = "prj-app-view-mode";

function applyViewModeClass(mode: ViewMode) {
  document.body.classList.remove("app-view-web", "app-view-mobile");
  document.body.classList.add(mode === "mobile" ? "app-view-mobile" : "app-view-web");
}

export function ViewModeToggle() {
  const [viewMode, setViewMode] = useState<ViewMode>("web");

  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    const nextMode: ViewMode = saved === "mobile" ? "mobile" : "web";
    setViewMode(nextMode);
    applyViewModeClass(nextMode);
  }, []);

  function updateViewMode(nextMode: ViewMode) {
    setViewMode(nextMode);
    window.localStorage.setItem(STORAGE_KEY, nextMode);
    applyViewModeClass(nextMode);
  }

  return (
    <div className="topbar-view-mode">
      <span className="view-mode-label">View</span>
      <div className="view-mode-toggle" role="tablist" aria-label="App layout">
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
  );
}
