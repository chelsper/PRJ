import Link from "next/link";
import { notFound } from "next/navigation";

import { requireCapability } from "@/server/auth/permissions";
import { listConfigOptions } from "@/server/data/configurations";
import { getDonorProfile, listDonorAddresses, type DonorAddressRow } from "@/server/data/donors";

import { addDonorAddressAction, setPrimaryDonorAddressAction } from "../../actions";

export default async function DonorAddressesPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  function formatAddressTypeLabel(value: string) {
    if (value === "PREVIOUS") {
      return "Previous Address";
    }

    return value;
  }

  await requireCapability("donors:read");
  const { id } = await params;
  const donor = await getDonorProfile(id);

  if (!donor) {
    notFound();
  }

  const [addresses, addressTypeOptions, stateOptions] = await Promise.all([
    listDonorAddresses(id),
    listConfigOptions("address_types"),
    listConfigOptions("states")
  ]);
  const effectiveAddresses = [...addresses];

  if (
    donor.street1 &&
    donor.city &&
    !effectiveAddresses.some((address) => address.is_primary)
  ) {
    effectiveAddresses.unshift({
      id: "profile-primary",
      address_type: donor.address_type ?? "PRIMARY",
      street1: donor.street1,
      street2: donor.street2,
      city: donor.city,
      state_region: donor.state_region,
      postal_code: donor.postal_code,
      country: donor.country ?? "United States",
      is_primary: true
    });
  }

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
                <th></th>
              </tr>
            </thead>
            <tbody>
              {effectiveAddresses.map((address: DonorAddressRow) => (
                <tr key={address.id}>
                  <td>{formatAddressTypeLabel(address.address_type)}</td>
                  <td>
                    {[address.street1, address.street2, address.city, address.state_region, address.postal_code]
                      .filter(Boolean)
                      .join(", ")}
                  </td>
                  <td>
                    <label className="checkbox-line">
                      <input type="checkbox" checked={address.is_primary} readOnly aria-label={address.is_primary ? "Primary address" : "Not primary"} />
                      <span>{address.is_primary ? "Primary" : "Not primary"}</span>
                    </label>
                  </td>
                  <td>
                    {!address.is_primary && address.id !== "profile-primary" ? (
                      <form action={setPrimaryDonorAddressAction}>
                        <input type="hidden" name="donorId" value={donor.id} />
                        <input type="hidden" name="addressId" value={address.id} />
                        {donor.donor_type === "INDIVIDUAL" && donor.spouse_donor_id ? (
                          <label className="checkbox-line">
                            <input type="checkbox" name="syncSpousePrimaryAddress" />
                            <span>Update spouse too</span>
                          </label>
                        ) : null}
                        <button type="submit" className="secondary button-compact">
                          Make primary
                        </button>
                      </form>
                    ) : null}
                  </td>
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
              <select name="stateRegion" defaultValue="">
                <option value="">None</option>
                {stateOptions.map((option) => (
                  <option key={option.id} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
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
            {donor.donor_type === "INDIVIDUAL" && donor.spouse_donor_id ? (
              <label className="full checkbox-line">
                <input type="checkbox" name="syncSpousePrimaryAddress" />
                <span>If this becomes the primary address, update the linked spouse primary address too.</span>
              </label>
            ) : null}
            <div className="full">
              <button type="submit">Add address</button>
            </div>
          </form>
        </article>
      </section>
    </div>
  );
}
