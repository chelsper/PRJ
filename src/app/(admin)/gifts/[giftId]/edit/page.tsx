import { notFound } from "next/navigation";

import { requireCapability } from "@/server/auth/permissions";
import { listDonors, type DonorListRow } from "@/server/data/donors";
import { getGiftById } from "@/server/data/gifts";
import { listCampaigns, listFunds, type LookupRow } from "@/server/data/lookups";

import { updateGiftAction } from "../../actions";

export default async function EditGiftPage({
  params
}: {
  params: Promise<{ giftId: string }>;
}) {
  await requireCapability("gifts:write");
  const { giftId } = await params;
  const gift = await getGiftById(giftId);

  if (!gift) {
    notFound();
  }

  const [donors, funds, campaigns] = await Promise.all([listDonors(), listFunds(), listCampaigns()]);

  return (
    <div className="grid">
      <section className="hero">
        <p className="eyebrow">Edit Gift</p>
        <h1>Gift {gift.gift_number ?? gift.id}</h1>
      </section>

      <section className="card">
        <form action={updateGiftAction} className="form-grid">
          <input type="hidden" name="giftId" value={gift.id} />
          <label>
            Donor
            <select name="donorId" defaultValue={gift.donor_id} required>
              {donors.map((donor: DonorListRow) => (
                <option key={donor.id} value={donor.id}>
                  {donor.full_name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Fund
            <select name="fundId" defaultValue={gift.fund_id} required>
              {funds.map((fund: LookupRow) => (
                <option key={fund.id} value={fund.id}>
                  {fund.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Campaign
            <select name="campaignId" defaultValue={gift.campaign_id ?? ""}>
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
            <select name="softCreditDonorId" defaultValue={gift.soft_credit_donor_id ?? ""}>
              <option value="">None</option>
              {donors.map((donor: DonorListRow) => (
                <option key={donor.id} value={donor.id}>
                  {donor.full_name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Gift type
            <select name="giftType" defaultValue={gift.gift_type} required>
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
            <input name="amount" type="number" min="0.01" step="0.01" defaultValue={(gift.amount_cents / 100).toFixed(2)} required />
          </label>
          <label>
            Gift date
            <input name="giftDate" type="date" defaultValue={gift.gift_date} required />
          </label>
          <label>
            Payment method
            <select name="paymentMethod" defaultValue={gift.payment_method ?? ""}>
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
            <input name="referenceNumber" defaultValue={gift.reference_number ?? ""} />
          </label>
          <label className="full">
            Notes
            <textarea name="notes" rows={4} defaultValue={gift.notes ?? ""} />
          </label>
          <div className="full">
            <button type="submit">Save gift</button>
          </div>
        </form>
      </section>
    </div>
  );
}
