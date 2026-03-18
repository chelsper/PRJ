import Link from "next/link";
import { notFound } from "next/navigation";

import { requireCapability } from "@/server/auth/permissions";
import {
  getDonorProfile,
  listDonorConnections,
  listDonorGiving,
  type DonorConnectionRow,
  type DonorGiftRow
} from "@/server/data/donors";

import { updateDonorProfileAction } from "../actions";

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

  const [connections, giving] = await Promise.all([listDonorConnections(id), listDonorGiving(id)]);
  const activeTab = tab === "giving" ? "giving" : "profile";

  return (
    <div className="grid">
      <section className="hero">
        <p className="eyebrow">Donor Profile</p>
        <h1>{donor.full_name}</h1>
        <p className="muted">
          Donor ID {donor.donor_number ?? "Pending"} · {donor.donor_type === "ORGANIZATION" ? "Organization" : "Individual"}
        </p>
        <div className="stats">
          <article className="stat">
            <span className="muted">Lifetime giving</span>
            <strong>${(Number(donor.lifetime_giving_cents) / 100).toLocaleString()}</strong>
          </article>
          <article className="stat">
            <span className="muted">Giving level</span>
            <strong>{donor.giving_level ?? "Unassigned"}</strong>
          </article>
          <article className="stat">
            <span className="muted">Primary email</span>
            <strong>{donor.primary_email ?? "None"}</strong>
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
        <Link href={`/donors/${id}/addresses`} className="tab-link">
          Addresses
        </Link>
      </nav>

      {activeTab === "giving" ? (
        <section className="table-shell">
          <p className="eyebrow">Giving</p>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Fund</th>
                <th>Campaign</th>
                <th>Payment</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              {giving.map((gift: DonorGiftRow) => (
                <tr key={gift.id}>
                  <td>{gift.gift_date}</td>
                  <td>{gift.fund_name}</td>
                  <td>{gift.campaign_name ?? "—"}</td>
                  <td>{gift.payment_method}</td>
                  <td>${(gift.amount_cents / 100).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ) : (
        <section className="card">
          <p className="eyebrow">Profile Details</p>
          <form action={updateDonorProfileAction} className="form-grid">
            <input type="hidden" name="donorId" value={donor.id} />
            <label>
              Donor type
              <select name="donorType" defaultValue={donor.donor_type}>
                <option value="INDIVIDUAL">Individual</option>
                <option value="ORGANIZATION">Organization</option>
              </select>
            </label>
            <label>
              Title
              <select name="title" defaultValue={donor.title ?? ""}>
                <option value="">None</option>
                <option value="Mr.">Mr.</option>
                <option value="Mrs.">Mrs.</option>
                <option value="Ms.">Ms.</option>
                <option value="Dr.">Dr.</option>
              </select>
            </label>
            <label>
              First name
              <input name="firstName" defaultValue={donor.first_name ?? ""} />
            </label>
            <label>
              Middle name
              <input name="middleName" defaultValue={donor.middle_name ?? ""} />
            </label>
            <label>
              Last name
              <input name="lastName" defaultValue={donor.last_name ?? ""} />
            </label>
            <label>
              Preferred name
              <input name="preferredName" defaultValue={donor.preferred_name ?? ""} />
            </label>
            <label className="full">
              Organization name
              <input name="organizationName" defaultValue={donor.organization_name ?? ""} />
            </label>
            <label>
              Organization contact
              <select name="organizationContactDonorId" defaultValue={donor.organization_contact_donor_id ?? ""}>
                <option value="">Select donor</option>
                {connections.map((connection: DonorConnectionRow) => (
                  <option key={connection.id} value={connection.id}>
                    {connection.display_name} {connection.donor_number ? `(${connection.donor_number})` : ""}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Organization contact name
              <input name="organizationContactName" defaultValue={donor.organization_contact_name ?? ""} />
            </label>
            <label>
              Spouse record
              <select name="spouseDonorId" defaultValue={donor.spouse_donor_id ?? ""}>
                <option value="">Select donor</option>
                {connections.map((connection: DonorConnectionRow) => (
                  <option key={connection.id} value={connection.id}>
                    {connection.display_name} {connection.donor_number ? `(${connection.donor_number})` : ""}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Giving level
              <input name="givingLevel" defaultValue={donor.giving_level ?? ""} />
            </label>
            <label>
              Preferred email
              <input name="primaryEmail" type="email" defaultValue={donor.primary_email ?? ""} />
            </label>
            <label>
              Preferred email type
              <input name="primaryEmailType" defaultValue={donor.primary_email_type ?? ""} />
            </label>
            <label>
              Alternative email
              <input name="alternateEmail" type="email" defaultValue={donor.alternate_email ?? ""} />
            </label>
            <label>
              Alternative email type
              <input name="alternateEmailType" defaultValue={donor.alternate_email_type ?? ""} />
            </label>
            <label>
              Primary phone
              <input name="primaryPhone" defaultValue={donor.primary_phone ?? ""} />
            </label>
            <label>
              Built full name
              <input value={donor.full_name} disabled readOnly />
            </label>
            <label>
              Address type
              <input name="addressType" defaultValue={donor.address_type ?? "Primary"} />
            </label>
            <label>
              Street 1
              <input name="street1" defaultValue={donor.street1 ?? ""} />
            </label>
            <label>
              Street 2
              <input name="street2" defaultValue={donor.street2 ?? ""} />
            </label>
            <label>
              City
              <input name="city" defaultValue={donor.city ?? ""} />
            </label>
            <label>
              State / Region
              <input name="stateRegion" defaultValue={donor.state_region ?? ""} />
            </label>
            <label>
              Postal code
              <input name="postalCode" defaultValue={donor.postal_code ?? ""} />
            </label>
            <label>
              Country
              <input name="country" defaultValue={donor.country ?? "United States"} />
            </label>
            <label className="full">
              Notes
              <textarea name="notes" rows={5} defaultValue={donor.notes ?? ""} />
            </label>
            <div className="full button-row">
              <button type="submit">Save profile</button>
              <Link href={`/donors/${id}/addresses`} className="inline-link">
                Manage alternate addresses
              </Link>
            </div>
          </form>
        </section>
      )}
    </div>
  );
}
