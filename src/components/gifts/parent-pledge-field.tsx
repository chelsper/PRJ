"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type PledgeOption = {
  id: string;
  giftNumber: string | null;
  donorId: string;
  donorName: string;
  giftType: "PLEDGE" | "MATCHING_GIFT_PLEDGE";
  balanceRemainingCents: number;
};

const paymentGiftTypes = new Set(["PLEDGE_PAYMENT", "MATCHING_GIFT_PAYMENT"]);

function labelForPledge(option: PledgeOption) {
  return `${option.giftNumber ?? option.id} · ${option.donorName} · $${(option.balanceRemainingCents / 100).toLocaleString()} open`;
}

export function ParentPledgeField({
  donorFieldId,
  giftTypeFieldId,
  initialGiftType,
  initialDonorId,
  initialValue = "",
  initialOptions = []
}: {
  donorFieldId: string;
  giftTypeFieldId: string;
  initialGiftType: string;
  initialDonorId?: string | null;
  initialValue?: string;
  initialOptions?: PledgeOption[];
}) {
  const [giftType, setGiftType] = useState(initialGiftType);
  const [donorId, setDonorId] = useState(initialDonorId ?? "");
  const [value, setValue] = useState(initialValue);
  const [options, setOptions] = useState<PledgeOption[]>(initialOptions);
  const [loading, setLoading] = useState(false);

  const visible = paymentGiftTypes.has(giftType);

  const filteredOptions = useMemo(() => {
    if (giftType === "PLEDGE_PAYMENT") {
      return options.filter((option: PledgeOption) => option.giftType === "PLEDGE");
    }

    if (giftType === "MATCHING_GIFT_PAYMENT") {
      return options.filter((option: PledgeOption) => option.giftType === "MATCHING_GIFT_PLEDGE");
    }

    return [];
  }, [giftType, options]);

  useEffect(() => {
    const donorField = document.getElementById(donorFieldId) as HTMLInputElement | null;
    const giftTypeField = document.getElementById(giftTypeFieldId) as HTMLSelectElement | null;

    if (!donorField || !giftTypeField) {
      return;
    }

    const syncDonor = () => setDonorId(donorField.value);
    const syncGiftType = () => setGiftType(giftTypeField.value);

    syncDonor();
    syncGiftType();

    donorField.addEventListener("change", syncDonor);
    giftTypeField.addEventListener("change", syncGiftType);

    return () => {
      donorField.removeEventListener("change", syncDonor);
      giftTypeField.removeEventListener("change", syncGiftType);
    };
  }, [donorFieldId, giftTypeFieldId]);

  useEffect(() => {
    if (!visible) {
      setValue("");
      return;
    }

    if (!donorId) {
      setOptions([]);
      setValue("");
      return;
    }

    const controller = new AbortController();
    setLoading(true);

    void fetch(`/api/gifts/pledges?donorId=${encodeURIComponent(donorId)}`, {
      method: "GET",
      credentials: "same-origin",
      signal: controller.signal
    })
      .then(async (response: Response) => {
        if (!response.ok) {
          throw new Error("Pledge lookup failed");
        }

        const payload = (await response.json()) as { pledges: PledgeOption[] };
        setOptions(payload.pledges);
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) {
          return;
        }

        console.error(error);
        setOptions([]);
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      });

    return () => controller.abort();
  }, [donorId, visible]);

  useEffect(() => {
    if (!filteredOptions.some((option: PledgeOption) => option.id === value)) {
      setValue("");
    }
  }, [filteredOptions, value]);

  if (!visible) {
    return null;
  }

  const createGiftType = giftType === "MATCHING_GIFT_PAYMENT" ? "MATCHING_GIFT_PLEDGE" : "PLEDGE";
  const warningVisible = !value;

  return (
    <>
      <label>
        Parent pledge
        <select name="parentPledgeGiftId" value={value} onChange={(event) => setValue(event.target.value)}>
          <option value="">{loading ? "Loading pledges..." : donorId ? "None" : "Select donor first"}</option>
          {filteredOptions.map((option: PledgeOption) => (
            <option key={option.id} value={option.id}>
              {labelForPledge(option)}
            </option>
          ))}
        </select>
      </label>
      {warningVisible ? (
        <div className="full inline-warning">
          <strong>Parent pledge required.</strong>
          <p className="muted">
            Link an existing {giftType === "MATCHING_GIFT_PAYMENT" ? "matching gift pledge" : "pledge"}, create a new parent pledge, or change the gift type.
          </p>
          <div className="button-row">
            {donorId ? (
              <Link href={`/gifts?donorId=${donorId}&giftType=${createGiftType}`} className="button-link secondary-link">
                Create parent pledge
              </Link>
            ) : (
              <span className="muted">Select a donor to create the parent pledge.</span>
            )}
            <button
              type="button"
              className="secondary"
              onClick={() => {
                const giftTypeField = document.getElementById(giftTypeFieldId) as HTMLSelectElement | null;
                giftTypeField?.focus();
              }}
            >
              Choose different gift type
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}
