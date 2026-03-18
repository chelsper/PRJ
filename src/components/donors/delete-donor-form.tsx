"use client";

import { deleteDonorAction } from "@/app/(admin)/donors/actions";

export function DeleteDonorForm({ donorId }: { donorId: string }) {
  return (
    <form
      action={deleteDonorAction}
      onSubmit={(event) => {
        const confirmed = window.confirm(
          "Delete this donor record? This is a soft delete, but the donor will disappear from normal views."
        );

        if (!confirmed) {
          event.preventDefault();
        }
      }}
    >
      <input type="hidden" name="donorId" value={donorId} />
      <button type="submit" className="secondary">
        Delete donor
      </button>
    </form>
  );
}
