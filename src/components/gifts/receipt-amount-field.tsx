"use client";

import { useEffect, useRef, useState } from "react";

export function ReceiptAmountField({
  amountFieldId,
  initialAmount = "",
  initialReceiptAmount = ""
}: {
  amountFieldId: string;
  initialAmount?: string;
  initialReceiptAmount?: string;
}) {
  const [amount, setAmount] = useState(initialAmount);
  const [receiptAmount, setReceiptAmount] = useState(initialReceiptAmount || initialAmount);
  const userEditedRef = useRef(Boolean(initialReceiptAmount && initialReceiptAmount !== initialAmount));

  useEffect(() => {
    const amountField = document.getElementById(amountFieldId) as HTMLInputElement | null;

    if (!amountField) {
      return;
    }

    const syncAmount = () => {
      const nextAmount = amountField.value;
      setAmount(nextAmount);

      if (!userEditedRef.current) {
        setReceiptAmount(nextAmount);
      }
    };

    syncAmount();
    amountField.addEventListener("input", syncAmount);

    return () => amountField.removeEventListener("input", syncAmount);
  }, [amountFieldId]);

  return (
    <label>
      Receipt amount
      <input
        name="receiptAmount"
        type="number"
        min="0.01"
        step="0.01"
        value={receiptAmount}
        onChange={(event) => {
          userEditedRef.current = event.target.value !== amount;
          setReceiptAmount(event.target.value);
        }}
      />
    </label>
  );
}
