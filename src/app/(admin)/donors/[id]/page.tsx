import Link from "next/link";
import { notFound } from "next/navigation";

import { DonorProfileForm } from "@/components/donors/donor-profile-form";
import { DonorViewShell } from "@/components/donors/donor-view-shell";
import { OrganizationTab } from "@/components/donors/organization-tab";
import { SendReceiptButton } from "@/components/gifts/send-receipt-button";
import { getSessionWithCapability, requireCapability } from "@/server/auth/permissions";
import {
  getDonorProfile,
  getDonorLatestGift,
  listDonorConnections,
  listDonorGiving,
  listDonorNotes,
  listOrganizationContacts,
  listDonorOrganizationRelationships,
  listDonorSoftCredits,
  type DonorConnectionRow,
  type DonorGiftRow
} from "@/server/data/donors";
import type { DonorNoteRow, DonorSoftCreditRow } from "@/server/data/donors";

import {
  addDonorNoteAction,
  addDonorOrganizationRelationshipAction,
  addOrganizationContactAction,
  deleteDonorOrganizationRelationshipAction,
  deleteOrganizationContactAction,
  promoteOrganizationRelationshipToDonorAction,
  promoteSpouseToDonorAction,
  updateOrganizationDetailsAction,
  updateDonorProfileAction
} from "../actions";

export default async function DonorProfilePage({
  params,
  searchParams
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  await requireCapability("donors:read");
  const { id } = await params;
  const { tab } = await searchParams;
  const donor = await getDonorProfile(id);

  if (!donor) {
    notFound();
  }

  const [connections, giving, softCredits, giftWriteSession, latestGift, relationships, notes, donorWriteSession, organizationContacts] = await Promise.all([
    listDonorConnections(id),
    listDonorGiving(id),
    listDonorSoftCredits(id),
    getSessionWithCapability("gifts:write"),
    getDonorLatestGift(id),
    listDonorOrganizationRelationships(id),
    listDonorNotes(id),
    getSessionWithCapability("donors:write"),
    listOrganizationContacts(id)
  ]);
  const activeTab =
    tab === "giving" || tab === "communications" || tab === "notes" || tab === "organization" ? tab : "profile";

  return (
    <DonorViewShell>
      <div className="grid donor-page-grid">
      <section className="hero">
        <p className="eyebrow">Donor Profile</p>
        <h1>{donor.full_name}</h1>
        <p className="muted">
          Donor ID {donor.donor_number ?? "Pending"} · {donor.donor_type === "ORGANIZATION" ? "Organization" : "Individual"}
        </p>
        {giftWriteSession ? (
          <div className="button-row">
            <Link href={`/gifts?donorId=${donor.id}`} className="button-link">
              Add Gift
            </Link>
            <Link href={`/donors/${id}?tab=giving`} className="inline-link">
              Open Giving tab
            </Link>
          </div>
        ) : null}
        <div className="stats donor-summary-stats">
          <article className="stat">
            <span className="muted">Donor recognition total</span>
            <strong className="stat-value">${(Number(donor.donor_recognition_cents) / 100).toLocaleString()}</strong>
          </article>
          <article className="stat">
            <span className="muted">Hard-credit lifetime</span>
            <strong className="stat-value">${(Number(donor.donor_hard_credit_cents) / 100).toLocaleString()}</strong>
          </article>
          <article className="stat">
            <span className="muted">Soft-credit lifetime</span>
            <strong className="stat-value">${(Number(donor.donor_soft_credit_cents) / 100).toLocaleString()}</strong>
          </article>
          <article className="stat">
            <span className="muted">Current-year giving level</span>
            <strong className="stat-value">{donor.giving_level_display ?? "Below giving level threshold"}</strong>
          </article>
          <article className="stat">
            <span className="muted">Current-year recognition</span>
            <strong className="stat-value">${(Number(donor.current_year_recognition_cents) / 100).toLocaleString()}</strong>
          </article>
          <article className="stat">
            <span className="muted">Primary email</span>
            <strong className="stat-value">{donor.primary_email ?? "None"}</strong>
          </article>
          <article className="stat">
            <span className="muted">Last gift</span>
            <strong className="stat-value">
              {latestGift
                ? `${latestGift.gift_date} · $${(latestGift.amount_cents / 100).toLocaleString()}`
                : "No gifts yet"}
            </strong>
          </article>
        </div>
      </section>

      <nav className="tab-row">
        <Link href={`/donors/${id}`} className={activeTab === "profile" ? "tab-link active" : "tab-link"}>
          Profile
        </Link>
        <Link href={`/donors/${id}?tab=giving`} className={activeTab === "giving" ? "tab-link active" : "tab-link"}>
          Giving
        </Link>
        <Link href={`/donors/${id}?tab=communications`} className={activeTab === "communications" ? "tab-link active" : "tab-link"}>
          Communications
        </Link>
        {donor.donor_type === "ORGANIZATION" ? (
          <Link href={`/donors/${id}?tab=organization`} className={activeTab === "organization" ? "tab-link active" : "tab-link"}>
            Organization
          </Link>
        ) : null}
        <Link href={`/donors/${id}?tab=notes`} className={activeTab === "notes" ? "tab-link active" : "tab-link"}>
          Notes
        </Link>
        <Link href={`/donors/${id}/addresses`} className="tab-link">
          Addresses
        </Link>
      </nav>

      {activeTab === "giving" ? (
        <div className="grid">
          <section className="table-shell">
            <div className="section-header">
              <div>
                <p className="eyebrow">Direct Gifts</p>
                <p className="muted">Record and review gifts without leaving this donor context.</p>
              </div>
              {giftWriteSession ? (
                <Link href={`/gifts?donorId=${donor.id}`} className="button-link secondary-link">
                  Add Gift
                </Link>
              ) : null}
            </div>
            <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Gift ID</th>
                  <th>Date</th>
                  <th>Gift type</th>
                  <th>Fund</th>
                  <th>Campaign</th>
                  <th>Payment</th>
                  <th>Amount</th>
                  <th>E-Receipt</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {giving.map((gift: DonorGiftRow) => (
                  <tr key={gift.id}>
                    <td>{gift.gift_number ?? gift.id}</td>
                    <td>{gift.gift_date}</td>
                    <td>{gift.gift_type.replaceAll("_", " ")}</td>
                    <td>{gift.fund_name}</td>
                    <td>{gift.campaign_name ?? "—"}</td>
                    <td>{gift.payment_method ?? "—"}</td>
                    <td>${(gift.amount_cents / 100).toLocaleString()}</td>
                    <td>
                      <SendReceiptButton
                        giftId={gift.id}
                        giftNumber={gift.gift_number ?? gift.id}
                        donorName={donor.full_name}
                        donorEmail={donor.primary_email}
                        giftDate={gift.gift_date}
                        amountCents={gift.amount_cents}
                        fundName={gift.fund_name}
                        campaignName={gift.campaign_name}
                        initiallySent={gift.receipt_sent}
                      />
                    </td>
                    <td>
                      <Link href={`/gifts/${gift.id}/edit`} className="inline-link">
                        Edit gift
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </section>

          <section className="table-shell">
            <p className="eyebrow">Soft Credits</p>
            <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Gift ID</th>
                  <th>Date</th>
                  <th>Gift type</th>
                  <th>Legal donor</th>
                  <th>Fund</th>
                  <th>Campaign</th>
                  <th>Credit type</th>
                  <th>Amount</th>
                </tr>
              </thead>
              <tbody>
                {softCredits.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="muted">
                      No soft credits recorded.
                    </td>
                  </tr>
                ) : (
                  softCredits.map((credit: DonorSoftCreditRow) => (
                    <tr key={credit.soft_credit_id}>
                      <td>{credit.gift_number ?? credit.gift_id}</td>
                      <td>{credit.gift_date}</td>
                      <td>{credit.gift_type.replaceAll("_", " ")}</td>
                      <td>{credit.legal_donor_name}</td>
                      <td>{credit.fund_name}</td>
                      <td>{credit.campaign_name ?? "—"}</td>
                      <td>{credit.credit_type === "AUTO_SPOUSE" ? "Auto spouse" : "Manual"}</td>
                      <td>${(credit.amount_cents / 100).toLocaleString()}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            </div>
          </section>
        </div>
      ) : activeTab === "communications" ? (
        <div className="grid grid-2">
          <section className="card">
            <p className="eyebrow">Communication Summary</p>
            <div className="stats donor-summary-stats">
              <article className="stat">
                <span className="muted">Preferred email</span>
                <strong className="stat-value">{donor.primary_email ?? "No email on file"}</strong>
              </article>
              <article className="stat">
                <span className="muted">Preferred email type</span>
                <strong className="stat-value">{donor.primary_email_type ?? "Unspecified"}</strong>
              </article>
              <article className="stat">
                <span className="muted">Most recent gift</span>
                <strong className="stat-value">{latestGift ? `${latestGift.gift_date} · $${(latestGift.amount_cents / 100).toLocaleString()}` : "No gifts yet"}</strong>
              </article>
            </div>
          </section>

          <section className="table-shell">
            <p className="eyebrow">Receipts and Acknowledgments</p>
            <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Last relevant gift</th>
                  <th>Delivery target</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Gift receipt</td>
                  <td>{latestGift ? "Ready for future automation" : "Waiting for gift activity"}</td>
                  <td>{latestGift ? `${latestGift.gift_number ?? latestGift.id} · ${latestGift.gift_date}` : "—"}</td>
                  <td>{donor.primary_email ?? "No email on file"}</td>
                </tr>
                <tr>
                  <td>Acknowledgment</td>
                  <td>{latestGift ? "Ready for future workflow" : "Waiting for gift activity"}</td>
                  <td>{latestGift ? `${latestGift.gift_type.replaceAll("_", " ")} · $${(latestGift.amount_cents / 100).toLocaleString()}` : "—"}</td>
                  <td>{donor.primary_email ?? donor.primary_phone ?? "No contact method on file"}</td>
                </tr>
              </tbody>
            </table>
            </div>
          </section>

          <section className="table-shell full">
            <div className="section-header">
              <div>
                <p className="eyebrow">Communication History</p>
                <p className="muted">This tab is structured for future receipt sending, acknowledgment tracking, and contact history.</p>
              </div>
            </div>
            <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Channel</th>
                  <th>Category</th>
                  <th>Status</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td colSpan={5} className="muted">
                    No communication history is stored yet. Future updates can add receipt sends, acknowledgment entries, and manual outreach notes here.
                  </td>
                </tr>
              </tbody>
            </table>
            </div>
          </section>
        </div>
      ) : activeTab === "organization" && donor.donor_type === "ORGANIZATION" ? (
        <OrganizationTab
          donor={donor}
          donorId={id}
          contacts={organizationContacts}
          updateAction={updateOrganizationDetailsAction}
          addContactAction={addOrganizationContactAction}
          deleteContactAction={deleteOrganizationContactAction}
        />
      ) : activeTab === "notes" ? (
        <div className="grid grid-2">
          {donorWriteSession ? (
            <section className="card">
              <p className="eyebrow">Add Note</p>
              <form action={addDonorNoteAction} className="form-grid">
                <input type="hidden" name="donorId" value={donor.id} />
                <label>
                  Category
                  <select name="category" defaultValue="GENERAL">
                    <option value="GENERAL">General</option>
                    <option value="COMMUNICATION">Communication</option>
                    <option value="STEWARDSHIP">Stewardship</option>
                    <option value="FOLLOW_UP">Follow Up</option>
                  </select>
                </label>
                <label className="full">
                  Note
                  <textarea name="noteBody" rows={6} required />
                </label>
                <div className="full">
                  <button type="submit">Add note</button>
                </div>
              </form>
            </section>
          ) : null}
          <section className={donorWriteSession ? "table-shell" : "table-shell full"}>
            <p className="eyebrow">Notes</p>
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Category</th>
                  <th>Author</th>
                  <th>Note</th>
                </tr>
              </thead>
              <tbody>
                {notes.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="muted">
                      No notes recorded yet.
                    </td>
                  </tr>
                ) : (
                  notes.map((note: DonorNoteRow) => (
                    <tr key={note.id}>
                      <td>{note.created_at.slice(0, 19).replace("T", " ")}</td>
                      <td>{note.category.replaceAll("_", " ")}</td>
                      <td>{note.author_email ?? "Unknown"}</td>
                      <td>{note.note_body}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </section>
        </div>
      ) : (
        <DonorProfileForm
          donor={donor}
          donorId={id}
          connections={connections}
          relationships={relationships}
          updateAction={updateDonorProfileAction}
          addRelationshipAction={addDonorOrganizationRelationshipAction}
          deleteRelationshipAction={deleteDonorOrganizationRelationshipAction}
          promoteSpouseAction={promoteSpouseToDonorAction}
          promoteRelationshipAction={promoteOrganizationRelationshipToDonorAction}
        />
      )}
      </div>
    </DonorViewShell>
  );
}
