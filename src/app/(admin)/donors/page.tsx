import Link from "next/link";

import { DonorPageSearch } from "@/components/donors/donor-page-search";
import { requireCapability } from "@/server/auth/permissions";
import { getDonorLookupRowsByIds, listRecentlyAccessedDonors, type DonorListRow } from "@/server/data/donors";

import { createDonorAction } from "./actions";

export default async function DonorsPage({
  searchParams
}: {
  searchParams: Promise<{
    q?: string;
    donorType?: string;
    firstName?: string;
    lastName?: string;
    organizationName?: string;
    primaryEmail?: string;
    primaryPhone?: string;
    notes?: string;
    duplicateIds?: string;
  }>;
}) {
  await requireCapability("donors:read");
  const params = await searchParams;
  const duplicateIds = (params.duplicateIds ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  const donors = await listRecentlyAccessedDonors();
  const possibleMatches = duplicateIds.length > 0 ? await getDonorLookupRowsByIds(duplicateIds) : [];

  return (
    <div className="grid">
      <section className="card">
        <p className="eyebrow">Donor Lookup</p>
        <DonorPageSearch />
      </section>

      <section className="grid grid-2">
        <article className="card">
          <p className="eyebrow">Create Donor</p>
          <form action={createDonorAction} className="form-grid">
            <label>
              Donor type
              <select name="donorType" defaultValue={params.donorType ?? "INDIVIDUAL"}>
                <option value="INDIVIDUAL">Individual</option>
                <option value="ORGANIZATION">Organization</option>
              </select>
            </label>
            <label>
              First name
              <input name="firstName" defaultValue={params.firstName ?? ""} />
            </label>
            <label>
              Last name
              <input name="lastName" defaultValue={params.lastName ?? ""} />
            </label>
            <label>
              Organization name
              <input name="organizationName" defaultValue={params.organizationName ?? ""} />
            </label>
            <label>
              Email
              <input name="primaryEmail" type="email" defaultValue={params.primaryEmail ?? ""} />
            </label>
            <label>
              Phone
              <input name="primaryPhone" defaultValue={params.primaryPhone ?? ""} />
            </label>
            <label className="full">
              Notes
              <textarea name="notes" rows={4} defaultValue={params.notes ?? ""} />
            </label>
            {possibleMatches.length > 0 ? (
              <div className="full conditional-block">
                <p className="danger">Possible duplicate donors were found. Confirm this constituent is not already in the system before proceeding.</p>
                <div className="table-scroll">
                  <table>
                    <thead>
                      <tr>
                        <th>Possible match</th>
                        <th>Email</th>
                        <th>Recognition Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {possibleMatches.map((match: DonorListRow) => (
                        <tr key={match.id}>
                          <td>
                            <Link href={`/donors/${match.id}`} className="table-link">
                              {match.full_name || "Unnamed donor"}
                            </Link>
                            <div className="muted">{match.donor_number ?? "Pending donor number"}</div>
                          </td>
                          <td>{match.primary_email ?? "—"}</td>
                          <td>${(Number(match.donor_recognition_cents) / 100).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <label className="checkbox-line">
                  <input type="checkbox" name="confirmUnique" required />
                  I confirm this constituent is not the same as an existing donor.
                </label>
              </div>
            ) : null}
            <div className="full">
              <button type="submit">Save donor</button>
            </div>
          </form>
        </article>

        <article className="table-shell">
          <p className="eyebrow">Recently Accessed Donors</p>
          <table>
            <thead>
              <tr>
                <th>Donor</th>
                <th>Email</th>
                <th>Recognition Total</th>
              </tr>
            </thead>
            <tbody>
              {donors.map((donor: DonorListRow) => {
                return (
                  <tr key={donor.id}>
                    <td>
                      <Link href={`/donors/${donor.id}`} className="table-link">
                        {donor.full_name || "Unnamed donor"}
                      </Link>
                      <div className="muted">{donor.donor_number ?? "Pending donor number"}</div>
                    </td>
                    <td>{donor.primary_email ?? "—"}</td>
                    <td>${(Number(donor.donor_recognition_cents) / 100).toLocaleString()}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </article>
      </section>
    </div>
  );
}
