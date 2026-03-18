import { requireCapability } from "@/server/auth/permissions";
import { listDonors, type DonorListRow } from "@/server/data/donors";
import { listRecentGifts, type RecentGiftRow } from "@/server/data/gifts";
import { listCampaigns, listFunds, type LookupRow } from "@/server/data/lookups";

import { createGiftAction } from "./actions";

export default async function GiftsPage() {
  await requireCapability("gifts:read");
  const [donors, gifts, funds, campaigns] = await Promise.all([
    listDonors(),
    listRecentGifts(),
    listFunds(),
    listCampaigns()
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
            Amount
            <input name="amount" type="number" min="0.01" step="0.01" required />
          </label>
          <label>
            Gift date
            <input name="giftDate" type="date" required />
          </label>
          <label>
            Payment method
            <select name="paymentMethod" defaultValue="ACH">
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
              <th>Date</th>
              <th>Donor</th>
              <th>Fund</th>
              <th>Amount</th>
            </tr>
          </thead>
          <tbody>
            {gifts.map((gift: RecentGiftRow) => (
              <tr key={gift.id}>
                <td>{gift.gift_date}</td>
                <td>{gift.donor_name}</td>
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
