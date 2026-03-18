import type { DonorLookupOption } from "@/components/donors/donor-lookup";
import { requireCapability } from "@/server/auth/permissions";
import { DonorLookup } from "@/components/donors/donor-lookup";
import { ParentPledgeField } from "@/components/gifts/parent-pledge-field";
import { PledgeScheduleFields } from "@/components/gifts/pledge-schedule-fields";
import { getDonorLookupRowsByIds } from "@/server/data/donors";
import { listPledgeOptions, listRecentGifts, type PledgeOptionRow, type RecentGiftRow } from "@/server/data/gifts";
import { listCampaigns, listFunds, type LookupRow } from "@/server/data/lookups";

import { createGiftAction } from "./actions";

export default async function GiftsPage({
  searchParams
}: {
  searchParams: Promise<{ donorId?: string }>;
}) {
  await requireCapability("gifts:read");
  const { donorId } = await searchParams;
  const [gifts, funds, campaigns, pledges, lookupDonors] = await Promise.all([
    listRecentGifts(),
    listFunds(),
    listCampaigns(),
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

  return (
    <div className="grid grid-2">
      <section className="card">
        <p className="eyebrow">Gift Entry</p>
        <form action={createGiftAction} className="form-grid">
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
          <DonorLookup label="Manual soft credit" name="softCreditDonorId" />
          <ParentPledgeField
            donorFieldId="gift-donor-id"
            giftTypeFieldId="gift-type"
            initialGiftType="CASH"
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
            <select id="gift-type" name="giftType" defaultValue="CASH" required>
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
            <input name="amount" type="number" min="0.01" step="0.01" required />
          </label>
          <label>
            Gift date
            <input name="giftDate" type="date" required />
          </label>
          <PledgeScheduleFields giftTypeFieldId="gift-type" initialGiftType="CASH" />
          <label>
            Payment method
            <select name="paymentMethod" defaultValue="">
              <option value="">Not applicable</option>
              <option value="ACH">ACH</option>
              <option value="CARD">Card</option>
              <option value="CHECK">Check</option>
              <option value="CASH">Cash</option>
              <option value="WIRE">Wire</option>
              <option value="OTHER">Other</option>
            </select>
          </label>
          <label>
            Reference number
            <input name="referenceNumber" />
          </label>
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
              <th>Gift ID</th>
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
                <td>{gift.gift_number ?? gift.id}</td>
                <td>{gift.gift_date}</td>
                <td>{gift.donor_name}</td>
                <td>{gift.gift_type.replaceAll("_", " ")}</td>
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
