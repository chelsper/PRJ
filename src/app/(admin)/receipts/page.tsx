import Link from "next/link";

import { SendReceiptButton } from "@/components/gifts/send-receipt-button";
import { ReceiptDonorSearch } from "@/components/receipts/receipt-donor-search";
import { requireCapability } from "@/server/auth/permissions";
import { getDonorProfile, listDonorGiving, type DonorGiftRow } from "@/server/data/donors";

export default async function ReceiptsPage({
  searchParams
}: {
  searchParams: Promise<{ donorId?: string }>;
}) {
  await requireCapability("gifts:write");
  const { donorId } = await searchParams;

  const donor = donorId ? await getDonorProfile(donorId) : null;
  const gifts = donor ? await listDonorGiving(donor.id) : [];

  return (
    <div className="grid">
      <section className="hero">
        <p className="eyebrow">Receipts</p>
        <h1>Generate E-Receipts</h1>
        <p className="muted">Search for a constituent, select the donor, then choose a recent gift to open the receipt email.</p>
      </section>

      <section className="card">
        <ReceiptDonorSearch initialLabel={donor?.full_name ?? ""} />
      </section>

      {donor ? (
        <section className="table-shell">
          <div className="section-header">
            <div>
              <p className="eyebrow">Recent Gifts</p>
              <h2>{donor.full_name}</h2>
              <p className="muted">
                {donor.donor_number ?? "Pending donor ID"} · {donor.primary_email ?? "No email on file"}
              </p>
            </div>
            <div className="button-row">
              <Link href={`/donors/${donor.id}?tab=giving`} className="inline-link">
                Open donor giving tab
              </Link>
            </div>
          </div>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Gift ID</th>
                  <th>Date</th>
                  <th>Gift type</th>
                  <th>Fund</th>
                  <th>Amount</th>
                  <th>Receipt amount</th>
                  <th>E-Receipt</th>
                </tr>
              </thead>
              <tbody>
                {gifts.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="muted">
                      No gifts found for this donor.
                    </td>
                  </tr>
                ) : (
                  gifts.map((gift: DonorGiftRow) => (
                    <tr key={gift.id}>
                      <td>{gift.gift_number ?? gift.id}</td>
                      <td>{gift.gift_date}</td>
                      <td>{gift.gift_type.replaceAll("_", " ")}</td>
                      <td>{gift.fund_name}</td>
                      <td>${(gift.amount_cents / 100).toLocaleString()}</td>
                      <td>${((gift.receipt_amount_cents ?? gift.amount_cents) / 100).toLocaleString()}</td>
                      <td>
                        <SendReceiptButton
                          giftId={gift.id}
                          giftNumber={gift.gift_number ?? gift.id}
                          donorName={donor.full_name}
                          donorEmail={donor.primary_email}
                          giftDate={gift.gift_date}
                          receiptAmountCents={gift.receipt_amount_cents ?? gift.amount_cents}
                          fundName={gift.fund_name}
                          campaignName={gift.campaign_name}
                          initiallySent={gift.receipt_sent}
                        />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      ) : (
        <section className="card">
          <p className="eyebrow">Start Here</p>
          <p className="muted">Search for a donor above. Selecting a donor loads their recent gifts here so you can generate a receipt with one click.</p>
        </section>
      )}
    </div>
  );
}
