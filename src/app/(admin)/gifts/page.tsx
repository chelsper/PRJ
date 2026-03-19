import Link from "next/link";
import type { DonorLookupOption } from "@/components/donors/donor-lookup";
import { requireCapability } from "@/server/auth/permissions";
import { DonorLookup } from "@/components/donors/donor-lookup";
import { PaymentMethodFields } from "@/components/gifts/payment-method-fields";
import { ParentPledgeField } from "@/components/gifts/parent-pledge-field";
import { PledgeScheduleFields } from "@/components/gifts/pledge-schedule-fields";
import { ReceiptAmountField } from "@/components/gifts/receipt-amount-field";
import { getDonorLookupRowsByIds } from "@/server/data/donors";
import { listPledgeOptions, listRecentGifts, type PledgeOptionRow, type RecentGiftRow } from "@/server/data/gifts";
import { listAppeals, listCampaigns, listFunds, type LookupRow } from "@/server/data/lookups";

import { createGiftAction } from "./actions";

function formatGiftTypeLabel(
  giftType: "PLEDGE" | "PLEDGE_PAYMENT" | "CASH" | "STOCK_PROPERTY" | "GIFT_IN_KIND" | "MATCHING_GIFT_PLEDGE" | "MATCHING_GIFT_PAYMENT"
) {
  switch (giftType) {
    case "PLEDGE":
      return "Pledge";
    case "PLEDGE_PAYMENT":
      return "Pledge Payment";
    case "CASH":
      return "Cash";
    case "STOCK_PROPERTY":
      return "Stock/Property";
    case "GIFT_IN_KIND":
      return "Gift-in-Kind";
    case "MATCHING_GIFT_PLEDGE":
      return "Matching Gift Pledge";
    case "MATCHING_GIFT_PAYMENT":
      return "Matching Gift Payment";
  }
}

export default async function GiftsPage({
  searchParams
}: {
  searchParams: Promise<{ donorId?: string; giftType?: string }>;
}) {
  await requireCapability("gifts:read");
  const { donorId, giftType } = await searchParams;
  const [gifts, funds, campaigns, appeals, pledges, lookupDonors] = await Promise.all([
    listRecentGifts(),
    listFunds(),
    listCampaigns(),
    listAppeals(),
    listPledgeOptions(),
    donorId ? getDonorLookupRowsByIds([donorId]) : Promise.resolve([])
  ]);
  const donorSelection = lookupDonors[0];
  const initialDonorSelection: DonorLookupOption | null = donorSelection
    ? {
        id: donorSelection.id,
        donorNumber: donorSelection.donor_number,
        donorType: donorSelection.donor_type,
        fullName: donorSelection.full_name,
        email: donorSelection.primary_email
      }
    : null;
  const initialGiftType =
    giftType && ["PLEDGE", "PLEDGE_PAYMENT", "CASH", "STOCK_PROPERTY", "GIFT_IN_KIND", "MATCHING_GIFT_PLEDGE", "MATCHING_GIFT_PAYMENT"].includes(giftType)
      ? giftType
      : "CASH";

  return (
    <div className="grid grid-2">
      <section className="card">
        <p className="eyebrow">Gift Entry</p>
        <form action={createGiftAction} className="form-grid">
          <div className="full form-section-heading">
            <p className="eyebrow">Gift Details</p>
            <p className="muted">Choose the donor, gift classification, and contribution context.</p>
          </div>
          <DonorLookup
            label="Donor"
            name="donorId"
            required
            initialSelection={initialDonorSelection}
            hiddenInputId="gift-donor-id"
          />
          <label>
            Fund
            <select name="fundId" required>
              <option value="">Select fund</option>
              {funds.map((fund: LookupRow) => (
                <option key={fund.id} value={fund.id}>
                  {fund.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Campaign
            <select name="campaignId">
              <option value="">None</option>
              {campaigns.map((campaign: LookupRow) => (
                <option key={campaign.id} value={campaign.id}>
                  {campaign.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Appeal
            <select name="appealId">
              <option value="">None</option>
              {appeals.map((appeal: LookupRow) => (
                <option key={appeal.id} value={appeal.id}>
                  {appeal.name}
                </option>
              ))}
            </select>
          </label>
          <DonorLookup label="Manual soft credit" name="softCreditDonorId" />
          <ParentPledgeField
            donorFieldId="gift-donor-id"
            giftTypeFieldId="gift-type"
            initialGiftType={initialGiftType}
            initialDonorId={initialDonorSelection?.id ?? null}
            initialOptions={pledges.map((pledge: PledgeOptionRow) => ({
              id: pledge.id,
              giftNumber: pledge.gift_number,
              donorId: pledge.donor_id,
              donorName: pledge.donor_name,
              giftType: pledge.gift_type,
              balanceRemainingCents: pledge.balance_remaining_cents
            }))}
          />
          <label>
            Gift type
            <select id="gift-type" name="giftType" defaultValue={initialGiftType} required>
              <option value="PLEDGE">Pledge</option>
              <option value="PLEDGE_PAYMENT">Pledge Payment</option>
              <option value="CASH">Cash</option>
              <option value="STOCK_PROPERTY">Stock/Property</option>
              <option value="GIFT_IN_KIND">Gift-in-Kind</option>
              <option value="MATCHING_GIFT_PLEDGE">Matching Gift Pledge</option>
              <option value="MATCHING_GIFT_PAYMENT">Matching Gift Payment</option>
            </select>
          </label>
          <label>
            Amount
            <input id="gift-amount" name="amount" type="number" min="0.01" step="0.01" required />
          </label>
          <ReceiptAmountField amountFieldId="gift-amount" />
          <label>
            Gift date
            <input name="giftDate" type="date" required />
          </label>
          <div className="full form-section-heading">
            <p className="eyebrow">Pledge Details</p>
            <p className="muted">Shown when the selected gift type needs parent pledge or installment tracking.</p>
          </div>
          <PledgeScheduleFields
            giftTypeFieldId="gift-type"
            amountFieldId="gift-amount"
            initialGiftType={initialGiftType}
          />
          <div className="full form-section-heading">
            <p className="eyebrow">Receipt & Payment</p>
            <p className="muted">Receipt amount defaults to the gift amount unless you change it.</p>
          </div>
          <label>
            Payment method
            <select id="gift-payment-method" name="paymentMethod" defaultValue="">
              <option value="">Not applicable</option>
              <option value="ACH">ACH</option>
              <option value="CARD">Card</option>
              <option value="CHECK">Check</option>
              <option value="CASH">Cash</option>
              <option value="WIRE">Wire</option>
              <option value="OTHER">Other</option>
            </select>
          </label>
          <PaymentMethodFields paymentMethodFieldId="gift-payment-method" />
          <div className="full form-section-heading compact">
            <p className="eyebrow">Notes</p>
          </div>
          <label className="full">
            Notes
            <textarea name="notes" rows={4} />
          </label>
          <div className="full">
            <button type="submit">Save gift</button>
          </div>
        </form>
      </section>

      <section className="table-shell">
        <p className="eyebrow">Recent Gifts</p>
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Donor</th>
              <th>Gift type</th>
              <th>Fund</th>
              <th>Amount</th>
            </tr>
          </thead>
          <tbody>
            {gifts.map((gift: RecentGiftRow) => (
              <tr key={gift.id}>
                <td>{gift.gift_date}</td>
                <td>
                  {gift.donor_id ? (
                    <Link href={`/donors/${gift.donor_id}`} className="table-link">
                      {gift.donor_name}
                    </Link>
                  ) : (
                    gift.donor_name
                  )}
                </td>
                <td>{formatGiftTypeLabel(gift.gift_type)}</td>
                <td>{gift.fund_name}</td>
                <td>${(gift.amount_cents / 100).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
