import { notFound } from "next/navigation";

import { DonorLookup } from "@/components/donors/donor-lookup";
import { requireCapability } from "@/server/auth/permissions";
import { getDonorLookupRowsByIds } from "@/server/data/donors";
import { getGiftById, listPledgeInstallments, listPledgeOptions, type InstallmentRow, type PledgeOptionRow } from "@/server/data/gifts";
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

  const [lookupDonors, funds, campaigns, pledges, installments] = await Promise.all([
    getDonorLookupRowsByIds([gift.donor_id, gift.soft_credit_donor_id ?? ""].filter(Boolean)),
    listFunds(),
    listCampaigns(),
    listPledgeOptions(),
    listPledgeInstallments(giftId)
  ]);
  const donorSelection = lookupDonors.find((donor) => donor.id === gift.donor_id);
  const softCreditSelection = lookupDonors.find((donor) => donor.id === gift.soft_credit_donor_id);

  return (
    <div className="grid">
      <section className="hero">
        <p className="eyebrow">Edit Gift</p>
        <h1>Gift {gift.gift_number ?? gift.id}</h1>
      </section>

      <section className="card">
        <form action={updateGiftAction} className="form-grid">
          <input type="hidden" name="giftId" value={gift.id} />
          <DonorLookup
            label="Donor"
            name="donorId"
            required
            initialSelection={
              donorSelection
                ? {
                    id: donorSelection.id,
                    donorNumber: donorSelection.donor_number,
                    donorType: donorSelection.donor_type,
                    fullName: donorSelection.full_name,
                    email: donorSelection.primary_email
                  }
                : null
            }
          />
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
          <DonorLookup
            label="Manual soft credit"
            name="softCreditDonorId"
            initialSelection={
              softCreditSelection
                ? {
                    id: softCreditSelection.id,
                    donorNumber: softCreditSelection.donor_number,
                    donorType: softCreditSelection.donor_type,
                    fullName: softCreditSelection.full_name,
                    email: softCreditSelection.primary_email
                  }
                : null
            }
          />
          <label>
            Parent pledge
            <select name="parentPledgeGiftId" defaultValue={gift.parent_pledge_gift_id ?? ""}>
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
            Pledge start date
            <input name="pledgeStartDate" type="date" defaultValue={gift.pledge_start_date ?? ""} />
          </label>
          <label>
            Expected fulfillment date
            <input name="expectedFulfillmentDate" type="date" defaultValue={gift.expected_fulfillment_date ?? ""} />
          </label>
          <label>
            Installment count
            <input name="installmentCount" type="number" min="1" step="1" defaultValue={gift.installment_count ?? ""} />
          </label>
          <label>
            Installment frequency
            <select name="installmentFrequency" defaultValue={gift.installment_frequency ?? ""}>
              <option value="">None</option>
              <option value="MONTHLY">Monthly</option>
              <option value="QUARTERLY">Quarterly</option>
              <option value="ANNUAL">Annual</option>
              <option value="CUSTOM">Custom</option>
            </select>
          </label>
          <label className="full">
            <span>Proceed without parent pledge</span>
            <input name="allowUnlinkedPayment" type="checkbox" value="true" defaultChecked={!gift.parent_pledge_gift_id && (gift.gift_type === "PLEDGE_PAYMENT" || gift.gift_type === "MATCHING_GIFT_PAYMENT")} />
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
          {gift.pledge_status ? (
            <div className="full table-shell">
              <p className="eyebrow">Pledge Tracking</p>
              <p className="muted">
                Status: {gift.pledge_status.replaceAll("_", " ")} · Balance remaining: $
                {((gift.balance_remaining_cents ?? 0) / 100).toLocaleString()}
              </p>
              {installments.length > 0 ? (
                <table>
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Due date</th>
                      <th>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {installments.map((installment: InstallmentRow) => (
                      <tr key={installment.id}>
                        <td>{installment.installment_number}</td>
                        <td>{installment.due_date}</td>
                        <td>${(installment.amount_cents / 100).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : null}
            </div>
          ) : null}
          <div className="full">
            <button type="submit">Save gift</button>
          </div>
        </form>
      </section>
    </div>
  );
}
