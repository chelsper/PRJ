"use client";

import { useState } from "react";

export function CopyInviteLinkButton({
  link
}: {
  link: string;
}) {
  const [copied, setCopied] = useState(false);

  return (
    <button
      type="button"
      className="secondary"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(link);
          setCopied(true);
          window.setTimeout(() => setCopied(false), 1500);
        } catch (error) {
          console.error(error);
        }
      }}
    >
      {copied ? "Copied" : "Copy invite link"}
    </button>
  );
}
