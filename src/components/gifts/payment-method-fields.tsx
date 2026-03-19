"use client";

import { useEffect, useState } from "react";

export function PaymentMethodFields({
  paymentMethodFieldId,
  initialPaymentMethod = "",
  initialCheckDate = "",
  initialReferenceNumber = ""
}: {
  paymentMethodFieldId: string;
  initialPaymentMethod?: string;
  initialCheckDate?: string;
  initialReferenceNumber?: string;
}) {
  const [paymentMethod, setPaymentMethod] = useState(initialPaymentMethod);

  useEffect(() => {
    const paymentMethodField = document.getElementById(paymentMethodFieldId) as HTMLSelectElement | null;

    if (!paymentMethodField) {
      return;
    }

    const syncPaymentMethod = () => setPaymentMethod(paymentMethodField.value);

    syncPaymentMethod();
    paymentMethodField.addEventListener("change", syncPaymentMethod);

    return () => paymentMethodField.removeEventListener("change", syncPaymentMethod);
  }, [paymentMethodFieldId]);

  if (paymentMethod === "CHECK") {
    return (
      <>
        <label>
          Check date
          <input name="checkDate" type="date" defaultValue={initialCheckDate} />
        </label>
        <label>
          Check #
          <input name="referenceNumber" defaultValue={initialReferenceNumber} />
        </label>
      </>
    );
  }

  return (
    <>
      <input type="hidden" name="checkDate" value="" />
      <label>
        Reference
        <input name="referenceNumber" defaultValue={initialReferenceNumber} />
      </label>
    </>
  );
}
