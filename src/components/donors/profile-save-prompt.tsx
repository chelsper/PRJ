"use client";

import { useEffect, useState } from "react";
import { useFormStatus } from "react-dom";

// Compare submitted values, including notes associated through the form attribute.
function snapshot(form: HTMLFormElement) {
  return JSON.stringify([...new FormData(form)].filter(([, value]) => typeof value === "string"));
}

export function ProfileSavePrompt({ formId, revision }: { formId: string; revision: string }) {
  const [dirty, setDirty] = useState(false);
  const { pending } = useFormStatus();
  useEffect(() => {
    const form = document.getElementById(formId) as HTMLFormElement | null;
    if (!form) return;
    let baseline = snapshot(form);
    let frame = 0;
    setDirty(false);
    const compare = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => setDirty(snapshot(form) !== baseline));
    };
    const reset = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => { baseline = snapshot(form); setDirty(false); });
    };
    document.addEventListener("input", compare);
    document.addEventListener("change", compare);
    form.addEventListener("reset", reset);
    const observer = new MutationObserver(compare);
    observer.observe(form, { subtree: true, childList: true, attributes: true, attributeFilter: ["value", "checked", "disabled"] });
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("input", compare);
      document.removeEventListener("change", compare);
      form.removeEventListener("reset", reset);
      observer.disconnect();
    };
  }, [formId, revision]);

  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  if (!dirty && !pending) return null;
  return <div className="profile-save-prompt full">
    <span role="status">{pending ? "Saving profile…" : "Unsaved profile changes"}</span>
    <button type="submit" disabled={pending}>{pending ? "Saving…" : "Save profile"}</button>
  </div>;
}
