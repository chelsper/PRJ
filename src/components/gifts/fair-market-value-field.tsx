"use client";

import { useEffect, useState } from "react";

export function FairMarketValueField({
  giftTypeFieldId,
  initialGiftType,
  initialFairMarketValue = ""
}: {
  giftTypeFieldId: string;
  initialGiftType: string;
  initialFairMarketValue?: string;
}) {
  const [giftType, setGiftType] = useState(initialGiftType);

  useEffect(() => {
    const giftTypeField = document.getElementById(giftTypeFieldId) as HTMLSelectElement | null;

    if (!giftTypeField) {
      return;
    }

    const syncGiftType = () => setGiftType(giftTypeField.value);

    syncGiftType();
    giftTypeField.addEventListener("change", syncGiftType);

    return () => giftTypeField.removeEventListener("change", syncGiftType);
  }, [giftTypeFieldId]);

  if (giftType !== "GIFT_IN_KIND") {
    return <input type="hidden" name="fairMarketValue" value="" />;
  }

  return (
    <label>
      Fair market value
      <input
        name="fairMarketValue"
        type="number"
        min="0.01"
        step="0.01"
        defaultValue={initialFairMarketValue}
      />
    </label>
  );
}
