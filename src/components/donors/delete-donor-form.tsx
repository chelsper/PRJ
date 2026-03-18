"use client";

import { deleteDonorAction } from "@/app/(admin)/donors/actions";

export function DeleteDonorForm({
  donorId,
  label = "Delete donor",
  className = "secondary",
  compact = false
}: {
  donorId: string;
  label?: string;
  className?: string;
  compact?: boolean;
}) {
  return (
    <form
      action={deleteDonorAction}
      onSubmit={(event) => {
        const confirmed = window.confirm(
          "Delete this donor record? This is a soft delete, but the donor will disappear from normal views. Continue?"
        );

        if (!confirmed) {
          event.preventDefault();
        }
      }}
    >
      <input type="hidden" name="donorId" value={donorId} />
      <button type="submit" className={compact ? `${className} button-compact` : className}>
        {label}
      </button>
    </form>
  );
}
