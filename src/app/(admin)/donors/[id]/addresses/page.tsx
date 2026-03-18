import Link from "next/link";
import { notFound } from "next/navigation";

import { requireCapability } from "@/server/auth/permissions";
import { listConfigOptions } from "@/server/data/configurations";
import { getDonorProfile, listDonorAddresses, type DonorAddressRow } from "@/server/data/donors";

import { addDonorAddressAction } from "../../actions";

export default async function DonorAddressesPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  await requireCapability("donors:read");
  const { id } = await params;
  const donor = await getDonorProfile(id);

  if (!donor) {
    notFound();
  }

  const [addresses, addressTypeOptions] = await Promise.all([listDonorAddresses(id), listConfigOptions("address_types")]);

  return (
    <div className="grid">
      <section className="hero">
        <p className="eyebrow">Addresses</p>
        <h1>{donor.full_name}</h1>
        <p className="muted">Primary and alternate address records.</p>
      </section>

      <nav className="tab-row">
        <Link href={`/donors/${id}`} className="tab-link">
          Back to profile
        </Link>
      </nav>

      <section className="grid grid-2">
        <article className="table-shell">
          <p className="eyebrow">Address List</p>
          <table>
            <thead>
              <tr>
                <th>Type</th>
                <th>Address</th>
                <th>Primary</th>
              </tr>
            </thead>
            <tbody>
              {addresses.map((address: DonorAddressRow) => (
                <tr key={address.id}>
                  <td>{address.address_type}</td>
                  <td>
                    {[address.street1, address.street2, address.city, address.state_region, address.postal_code]
                      .filter(Boolean)
                      .join(", ")}
                  </td>
                  <td>{address.is_primary ? "Yes" : "No"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </article>

        <article className="card">
          <p className="eyebrow">Add Address</p>
          <form action={addDonorAddressAction} className="form-grid">
            <input type="hidden" name="donorId" value={donor.id} />
            <label>
              Address type
              <select name="addressType" defaultValue={addressTypeOptions[0]?.value ?? "Primary"}>
                {addressTypeOptions.map((option) => (
                  <option key={option.id} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Street 1
              <input name="street1" required />
            </label>
            <label>
              Street 2
              <input name="street2" />
            </label>
            <label>
              City
              <input name="city" required />
            </label>
            <label>
              State / Region
              <input name="stateRegion" />
            </label>
            <label>
              Postal code
              <input name="postalCode" />
            </label>
            <label>
              Country
              <input name="country" defaultValue="United States" />
            </label>
            <label className="checkbox-line">
              <input type="checkbox" name="isPrimary" />
              Mark as primary
            </label>
            <div className="full">
              <button type="submit">Add address</button>
            </div>
          </form>
        </article>
      </section>
    </div>
  );
}
