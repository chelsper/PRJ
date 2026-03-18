import Link from "next/link";

import { requireCapability } from "@/server/auth/permissions";
import { listDonors, type DonorListRow } from "@/server/data/donors";
import { DeleteDonorForm } from "@/components/donors/delete-donor-form";

import { createDonorAction } from "./actions";

export default async function DonorsPage({
  searchParams
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  await requireCapability("donors:read");
  const params = await searchParams;
  const donors = await listDonors(params.q);

  return (
    <div className="grid">
      <section className="card">
        <p className="eyebrow">Donor Lookup</p>
        <form method="get" className="form-grid">
          <label className="full">
            Search donor name
            <input name="q" defaultValue={params.q ?? ""} />
          </label>
          <div className="full">
            <button type="submit" className="secondary">
              Filter
            </button>
          </div>
        </form>
      </section>

      <section className="grid grid-2">
        <article className="card">
          <p className="eyebrow">Create Donor</p>
          <form action={createDonorAction} className="form-grid">
            <label>
              Donor type
              <select name="donorType" defaultValue="INDIVIDUAL">
                <option value="INDIVIDUAL">Individual</option>
                <option value="ORGANIZATION">Organization</option>
              </select>
            </label>
            <label>
              First name
              <input name="firstName" />
            </label>
            <label>
              Last name
              <input name="lastName" />
            </label>
            <label>
              Organization name
              <input name="organizationName" />
            </label>
            <label>
              Email
              <input name="primaryEmail" type="email" />
            </label>
            <label>
              Phone
              <input name="primaryPhone" />
            </label>
            <label className="full">
              Notes
              <textarea name="notes" rows={4} />
            </label>
            <div className="full">
              <button type="submit">Save donor</button>
            </div>
          </form>
        </article>

        <article className="table-shell">
          <p className="eyebrow">Results</p>
          <table>
            <thead>
              <tr>
                <th>Donor</th>
                <th>Email</th>
                <th>Lifetime Giving</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {donors.map((donor: DonorListRow) => {
                return (
                  <tr key={donor.id}>
                    <td>
                      <Link href={`/donors/${donor.id}`}>{donor.full_name || "Unnamed donor"}</Link>
                      <div className="muted">{donor.donor_number ?? "Pending donor number"}</div>
                    </td>
                    <td>{donor.primary_email ?? "—"}</td>
                    <td>${(Number(donor.lifetime_giving_cents ?? "0") / 100).toLocaleString()}</td>
                    <td>
                      <DeleteDonorForm donorId={donor.id} />
                    </td>
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
