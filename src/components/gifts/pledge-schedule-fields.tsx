"use client";

import { useEffect, useMemo, useState } from "react";

const pledgeGiftTypes = new Set(["PLEDGE", "MATCHING_GIFT_PLEDGE"]);

type ScheduleRow = {
  dueDate: string;
  amount: string;
};

function computeDueDate(startDate: Date, frequency: "MONTHLY" | "QUARTERLY" | "ANNUAL" | "CUSTOM", index: number) {
  const dueDate = new Date(startDate);

  if (frequency === "MONTHLY") {
    dueDate.setMonth(dueDate.getMonth() + index);
  } else if (frequency === "QUARTERLY") {
    dueDate.setMonth(dueDate.getMonth() + index * 3);
  } else if (frequency === "ANNUAL") {
    dueDate.setFullYear(dueDate.getFullYear() + index);
  } else {
    dueDate.setMonth(dueDate.getMonth() + index);
  }

  return dueDate.toISOString().slice(0, 10);
}

function generateScheduleRows(input: {
  amount: string;
  count: string;
  frequency: string;
  startDate: string;
}) {
  const count = Number(input.count);
  const amountCents = Math.round(Number(input.amount || "0") * 100);

  if (!count || count < 1 || !Number.isFinite(amountCents) || amountCents <= 0) {
    return [] as ScheduleRow[];
  }

  const startDate = new Date(input.startDate || new Date().toISOString().slice(0, 10));
  const baseAmount = Math.floor(amountCents / count);
  let remainder = amountCents - baseAmount * count;

  return Array.from({ length: count }, (_: unknown, index: number) => {
    const cents = baseAmount + (remainder > 0 ? 1 : 0);
    remainder = Math.max(0, remainder - 1);

    return {
      dueDate: computeDueDate(startDate, (input.frequency as "MONTHLY" | "QUARTERLY" | "ANNUAL" | "CUSTOM") || "CUSTOM", index),
      amount: (cents / 100).toFixed(2)
    };
  });
}

export function PledgeScheduleFields({
  giftTypeFieldId,
  amountFieldId,
  initialGiftType,
  initialAmount = "",
  initialPledgeStartDate = "",
  initialExpectedFulfillmentDate = "",
  initialInstallmentCount = "",
  initialInstallmentFrequency = "",
  initialSchedule = []
}: {
  giftTypeFieldId: string;
  amountFieldId: string;
  initialGiftType: string;
  initialAmount?: string;
  initialPledgeStartDate?: string;
  initialExpectedFulfillmentDate?: string;
  initialInstallmentCount?: string;
  initialInstallmentFrequency?: string;
  initialSchedule?: Array<{ dueDate: string; amount: string }>;
}) {
  const [giftType, setGiftType] = useState(initialGiftType);
  const [amount, setAmount] = useState(initialAmount);
  const [pledgeStartDate, setPledgeStartDate] = useState(initialPledgeStartDate);
  const [expectedFulfillmentDate, setExpectedFulfillmentDate] = useState(initialExpectedFulfillmentDate);
  const [installmentCount, setInstallmentCount] = useState(initialInstallmentCount);
  const [installmentFrequency, setInstallmentFrequency] = useState(initialInstallmentFrequency);
  const [scheduleRows, setScheduleRows] = useState<ScheduleRow[]>(initialSchedule);
  const [manualMode, setManualMode] = useState(initialSchedule.length > 0);

  useEffect(() => {
    const giftTypeField = document.getElementById(giftTypeFieldId) as HTMLSelectElement | null;
    const amountField = document.getElementById(amountFieldId) as HTMLInputElement | null;

    if (!giftTypeField || !amountField) {
      return;
    }

    const syncGiftType = () => setGiftType(giftTypeField.value);
    const syncAmount = () => setAmount(amountField.value);

    syncGiftType();
    syncAmount();

    giftTypeField.addEventListener("change", syncGiftType);
    amountField.addEventListener("input", syncAmount);

    return () => {
      giftTypeField.removeEventListener("change", syncGiftType);
      amountField.removeEventListener("input", syncAmount);
    };
  }, [giftTypeFieldId, amountFieldId]);

  useEffect(() => {
    if (!pledgeGiftTypes.has(giftType)) {
      setScheduleRows([]);
      setManualMode(false);
      return;
    }

    if (!manualMode) {
      setScheduleRows(
        generateScheduleRows({
          amount,
          count: installmentCount,
          frequency: installmentFrequency,
          startDate: pledgeStartDate
        })
      );
    }
  }, [giftType, amount, installmentCount, installmentFrequency, pledgeStartDate, manualMode]);

  if (!pledgeGiftTypes.has(giftType)) {
    return null;
  }

  const scheduleJson = JSON.stringify(
    scheduleRows
      .filter((row: ScheduleRow) => row.dueDate && Number(row.amount) > 0)
      .map((row: ScheduleRow) => ({
        dueDate: row.dueDate,
        amount: Number(row.amount)
      }))
  );
  const totalScheduled = useMemo(
    () => scheduleRows.reduce((sum: number, row: ScheduleRow) => sum + Number(row.amount || "0"), 0),
    [scheduleRows]
  );

  return (
    <>
      <label>
        Pledge start date
        <input
          name="pledgeStartDate"
          type="date"
          value={pledgeStartDate}
          onChange={(event) => {
            setPledgeStartDate(event.target.value);
            setManualMode(false);
          }}
        />
      </label>
      <label>
        Expected fulfillment date
        <input
          name="expectedFulfillmentDate"
          type="date"
          value={expectedFulfillmentDate}
          onChange={(event) => setExpectedFulfillmentDate(event.target.value)}
        />
      </label>
      <label>
        Installment count
        <input
          name="installmentCount"
          type="number"
          min="1"
          step="1"
          value={installmentCount}
          onChange={(event) => {
            setInstallmentCount(event.target.value);
            setManualMode(false);
          }}
        />
      </label>
      <label>
        Installment frequency
        <select
          name="installmentFrequency"
          value={installmentFrequency}
          onChange={(event) => {
            setInstallmentFrequency(event.target.value);
            setManualMode(false);
          }}
        >
          <option value="">None</option>
          <option value="MONTHLY">Monthly</option>
          <option value="QUARTERLY">Quarterly</option>
          <option value="ANNUAL">Annual</option>
          <option value="CUSTOM">Custom</option>
        </select>
      </label>
      <input type="hidden" name="installmentSchedule" value={scheduleJson} />
      {scheduleRows.length > 0 ? (
        <div className="full table-shell">
          <div className="section-header">
            <div>
              <p className="eyebrow">Installment Schedule</p>
              <p className="muted">
                Scheduled total: ${totalScheduled.toFixed(2)} {manualMode ? "· Manual edits applied" : "· Auto-generated from pledge fields"}
              </p>
            </div>
            <div className="button-row">
              <button
                type="button"
                className="secondary"
                onClick={() => {
                  setScheduleRows(
                    generateScheduleRows({
                      amount,
                      count: installmentCount,
                      frequency: installmentFrequency,
                      startDate: pledgeStartDate
                    })
                  );
                  setManualMode(false);
                }}
              >
                Reset schedule
              </button>
            </div>
          </div>
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Due date</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              {scheduleRows.map((row: ScheduleRow, index: number) => (
                <tr key={`${index + 1}-${row.dueDate}`}>
                  <td>{index + 1}</td>
                  <td>
                    <input
                      type="date"
                      value={row.dueDate}
                      onChange={(event) => {
                        setManualMode(true);
                        setScheduleRows((current: ScheduleRow[]) =>
                          current.map((currentRow: ScheduleRow, currentIndex: number) =>
                            currentIndex === index ? { ...currentRow, dueDate: event.target.value } : currentRow
                          )
                        );
                      }}
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={row.amount}
                      onChange={(event) => {
                        setManualMode(true);
                        setScheduleRows((current: ScheduleRow[]) =>
                          current.map((currentRow: ScheduleRow, currentIndex: number) =>
                            currentIndex === index ? { ...currentRow, amount: event.target.value } : currentRow
                          )
                        );
                      }}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </>
  );
}
