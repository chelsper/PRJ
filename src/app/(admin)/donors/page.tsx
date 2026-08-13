import Link from "next/link";

import { DonorPageSearch } from "@/components/donors/donor-page-search";
import { requireCapability } from "@/server/auth/permissions";
import { getDonorLookupRowsByIds, listDonors, listRecentlyAccessedDonors, type DonorListRow } from "@/server/data/donors";

import { createDonorAction } from "./actions";

export default async function DonorsPage({
  searchParams
}: {
  searchParams: Promise<{
    q?: string;
    donorType?: string;
    donorTypeFilter?: string;
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
  const tableSearch = params.q?.trim() ?? "";
  const donorTypeFilter = params.donorTypeFilter === "INDIVIDUAL" || params.donorTypeFilter === "ORGANIZATION" ? params.donorTypeFilter : "";
  const donorRows = tableSearch ? await listDonors(tableSearch) : await listRecentlyAccessedDonors();
  const donors = donorTypeFilter ? donorRows.filter((donor) => donor.donor_type === donorTypeFilter) : donorRows;
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
          <div className="section-header"><div><p className="eyebrow">{tableSearch || donorTypeFilter ? "Constituent Search" : "Recently Accessed Donors"}</p><h2>{donors.length} {donors.length === 1 ? "record" : "records"}</h2></div></div>
          <form action="/donors" className="table-workspace-toolbar">
            <label className="table-workspace-search">Search constituents<input name="q" defaultValue={tableSearch} placeholder="Name, constituent ID, email, or organization" /></label>
            <label>Type<select name="donorTypeFilter" defaultValue={donorTypeFilter}><option value="">All types</option><option value="INDIVIDUAL">Individuals</option><option value="ORGANIZATION">Organizations</option></select></label>
            <div className="table-workspace-actions"><button type="submit">Search</button><Link href="/donors" className="button-link secondary-link">Clear</Link></div>
          </form>
          <div className="table-scroll"><table>
            <thead>
              <tr>
                <th>Donor</th>
                <th>Type</th>
                <th>Email</th>
                <th>Recognition Total</th>
                <th><span className="sr-only">Open</span></th>
              </tr>
            </thead>
            <tbody>
              {donors.length ? donors.map((donor: DonorListRow) => {
                return (
                  <tr key={donor.id} className="table-row-actionable">
                    <td>
                      <Link href={`/donors/${donor.id}`} className="table-link">
                        {donor.full_name || "Unnamed donor"}
                      </Link>
                      <div className="muted">{donor.donor_number ?? "Pending donor number"}</div>
                    </td>
                    <td>{donor.donor_type === "ORGANIZATION" ? "Organization" : "Individual"}</td>
                    <td>{donor.primary_email ?? "—"}</td>
                    <td>${(Number(donor.donor_recognition_cents) / 100).toLocaleString()}</td>
                    <td><Link href={`/donors/${donor.id}`} className="table-open-link">Open</Link></td>
                  </tr>
                );
              }) : <tr><td colSpan={5} className="table-empty-state">No constituent records match these filters.</td></tr>}
            </tbody>
          </table></div>
        </article>
      </section>
    </div>
  );
}
