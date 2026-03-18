"use client";

import { useEffect, useState } from "react";

const pledgeGiftTypes = new Set(["PLEDGE", "MATCHING_GIFT_PLEDGE"]);

export function PledgeScheduleFields({
  giftTypeFieldId,
  initialGiftType,
  initialPledgeStartDate = "",
  initialExpectedFulfillmentDate = "",
  initialInstallmentCount = "",
  initialInstallmentFrequency = ""
}: {
  giftTypeFieldId: string;
  initialGiftType: string;
  initialPledgeStartDate?: string;
  initialExpectedFulfillmentDate?: string;
  initialInstallmentCount?: string;
  initialInstallmentFrequency?: string;
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

  if (!pledgeGiftTypes.has(giftType)) {
    return null;
  }

  return (
    <>
      <label>
        Pledge start date
        <input name="pledgeStartDate" type="date" defaultValue={initialPledgeStartDate} />
      </label>
      <label>
        Expected fulfillment date
        <input name="expectedFulfillmentDate" type="date" defaultValue={initialExpectedFulfillmentDate} />
      </label>
      <label>
        Installment count
        <input name="installmentCount" type="number" min="1" step="1" defaultValue={initialInstallmentCount} />
      </label>
      <label>
        Installment frequency
        <select name="installmentFrequency" defaultValue={initialInstallmentFrequency}>
          <option value="">None</option>
          <option value="MONTHLY">Monthly</option>
          <option value="QUARTERLY">Quarterly</option>
          <option value="ANNUAL">Annual</option>
          <option value="CUSTOM">Custom</option>
        </select>
      </label>
    </>
  );
}
