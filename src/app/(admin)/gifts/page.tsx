import { requireCapability } from "@/server/auth/permissions";
import { listDonors, type DonorListRow } from "@/server/data/donors";
import { listPledgeOptions, listRecentGifts, type PledgeOptionRow, type RecentGiftRow } from "@/server/data/gifts";
import { listCampaigns, listFunds, type LookupRow } from "@/server/data/lookups";

import { createGiftAction } from "./actions";

export default async function GiftsPage() {
  await requireCapability("gifts:read");
  const [donors, gifts, funds, campaigns, pledges] = await Promise.all([
    listDonors(),
    listRecentGifts(),
    listFunds(),
    listCampaigns(),
    listPledgeOptions()
  ]);

  return (
    <div className="grid grid-2">
      <section className="card">
        <p className="eyebrow">Gift Entry</p>
        <form action={createGiftAction} className="form-grid">
          <label>
            Donor
            <select name="donorId" required>
              <option value="">Select donor</option>
              {donors.map((donor: DonorListRow) => {
                return (
                  <option key={donor.id} value={donor.id}>
                    {donor.full_name}
                  </option>
                );
              })}
            </select>
          </label>
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
            Manual soft credit
            <select name="softCreditDonorId">
              <option value="">None</option>
              {donors.map((donor: DonorListRow) => (
                <option key={donor.id} value={donor.id}>
                  {donor.full_name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Parent pledge
            <select name="parentPledgeGiftId">
              <option value="">None</option>
              {pledges.map((pledge: PledgeOptionRow) => (
                <option key={pledge.id} value={pledge.id}>
                  {(pledge.gift_number ?? pledge.id) + " · " + pledge.donor_name + " · $" + (pledge.balance_remaining_cents / 100).toLocaleString() + " open"}
                </option>
              ))}
            </select>
          </label>
          <label>
            Gift type
            <select name="giftType" defaultValue="CASH" required>
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
          <label>
            Pledge start date
            <input name="pledgeStartDate" type="date" />
          </label>
          <label>
            Expected fulfillment date
            <input name="expectedFulfillmentDate" type="date" />
          </label>
          <label>
            Installment count
            <input name="installmentCount" type="number" min="1" step="1" />
          </label>
          <label>
            Installment frequency
            <select name="installmentFrequency" defaultValue="">
              <option value="">None</option>
              <option value="MONTHLY">Monthly</option>
              <option value="QUARTERLY">Quarterly</option>
              <option value="ANNUAL">Annual</option>
              <option value="CUSTOM">Custom</option>
            </select>
          </label>
          <label className="full">
            <span>Proceed without parent pledge</span>
            <input name="allowUnlinkedPayment" type="checkbox" value="true" />
          </label>
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
