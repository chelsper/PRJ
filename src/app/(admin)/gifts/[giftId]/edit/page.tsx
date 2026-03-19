import { notFound } from "next/navigation";

import { DonorLookup } from "@/components/donors/donor-lookup";
import { PaymentMethodFields } from "@/components/gifts/payment-method-fields";
import { ParentPledgeField } from "@/components/gifts/parent-pledge-field";
import { PledgeScheduleFields } from "@/components/gifts/pledge-schedule-fields";
import { ReceiptAmountField } from "@/components/gifts/receipt-amount-field";
import { requireCapability } from "@/server/auth/permissions";
import { getDonorLookupRowsByIds } from "@/server/data/donors";
import { getGiftById, listPledgeInstallments, listPledgeOptions, type InstallmentRow, type PledgeOptionRow } from "@/server/data/gifts";
import { listAppeals, listCampaigns, listFunds, type LookupRow } from "@/server/data/lookups";

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

  const [lookupDonors, funds, campaigns, appeals, pledges, installments] = await Promise.all([
    getDonorLookupRowsByIds([gift.donor_id, gift.soft_credit_donor_id ?? ""].filter(Boolean)),
    listFunds(),
    listCampaigns(),
    listAppeals(),
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
          <div className="full form-section-heading">
            <p className="eyebrow">Gift Details</p>
            <p className="muted">Update the donor, classification, and core contribution fields.</p>
          </div>
          <DonorLookup
            label="Donor"
            name="donorId"
            required
            hiddenInputId="gift-donor-id"
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
          <label>
            Appeal
            <select name="appealId" defaultValue={gift.appeal_id ?? ""}>
              <option value="">None</option>
              {appeals.map((appeal: LookupRow) => (
                <option key={appeal.id} value={appeal.id}>
                  {appeal.name}
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
          <ParentPledgeField
            donorFieldId="gift-donor-id"
            giftTypeFieldId="gift-type"
            initialGiftType={gift.gift_type}
            initialDonorId={gift.donor_id}
            initialValue={gift.parent_pledge_gift_id ?? ""}
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
            <select id="gift-type" name="giftType" defaultValue={gift.gift_type} required>
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
            <input id="gift-amount" name="amount" type="number" min="0.01" step="0.01" defaultValue={(gift.amount_cents / 100).toFixed(2)} required />
          </label>
          <ReceiptAmountField
            amountFieldId="gift-amount"
            initialAmount={(gift.amount_cents / 100).toFixed(2)}
            initialReceiptAmount={((gift.receipt_amount_cents ?? gift.amount_cents) / 100).toFixed(2)}
          />
          <label>
            Gift date
            <input name="giftDate" type="date" defaultValue={gift.gift_date} required />
          </label>
          <div className="full form-section-heading">
            <p className="eyebrow">Pledge Details</p>
            <p className="muted">Parent pledge and installment schedule options appear here when applicable.</p>
          </div>
          <PledgeScheduleFields
            giftTypeFieldId="gift-type"
            amountFieldId="gift-amount"
            initialGiftType={gift.gift_type}
            initialAmount={(gift.amount_cents / 100).toFixed(2)}
            initialPledgeStartDate={gift.pledge_start_date ?? ""}
            initialExpectedFulfillmentDate={gift.expected_fulfillment_date ?? ""}
            initialInstallmentCount={gift.installment_count ? String(gift.installment_count) : ""}
            initialInstallmentFrequency={gift.installment_frequency ?? ""}
            initialSchedule={installments.map((installment: InstallmentRow) => ({
              dueDate: installment.due_date,
              amount: (installment.amount_cents / 100).toFixed(2)
            }))}
          />
          <div className="full form-section-heading">
            <p className="eyebrow">Receipt & Payment</p>
            <p className="muted">Receipt amount can stay aligned with the gift amount or be overridden.</p>
          </div>
          <label>
            Payment method
            <select id="gift-payment-method" name="paymentMethod" defaultValue={gift.payment_method ?? ""}>
              <option value="">Not applicable</option>
              <option value="ACH">ACH</option>
              <option value="CARD">Card</option>
              <option value="CHECK">Check</option>
              <option value="CASH">Cash</option>
              <option value="WIRE">Wire</option>
              <option value="OTHER">Other</option>
            </select>
          </label>
          <PaymentMethodFields
            paymentMethodFieldId="gift-payment-method"
            initialPaymentMethod={gift.payment_method ?? ""}
            initialCheckDate={gift.check_date ?? ""}
            initialReferenceNumber={gift.reference_number ?? ""}
          />
          <div className="full form-section-heading compact">
            <p className="eyebrow">Notes</p>
          </div>
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
