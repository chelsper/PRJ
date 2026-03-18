"use client";

import Link from "next/link";
import { useState } from "react";

import type {
  DonorConnectionRow,
  DonorOrganizationRelationshipRow,
  DonorProfileRow
} from "@/server/data/donors";

type FormAction = (formData: FormData) => void | Promise<void>;

export function DonorProfileForm({
  donor,
  donorId,
  connections,
  relationships,
  updateAction,
  addRelationshipAction,
  deleteRelationshipAction
}: {
  donor: DonorProfileRow;
  donorId: string;
  connections: DonorConnectionRow[];
  relationships: DonorOrganizationRelationshipRow[];
  updateAction: FormAction;
  addRelationshipAction: FormAction;
  deleteRelationshipAction: FormAction;
}) {
  const [donorType, setDonorType] = useState<DonorProfileRow["donor_type"]>(donor.donor_type);
  const [hasSpouse, setHasSpouse] = useState(Boolean(donor.spouse_donor_id));
  const [hasOrganizationRelationship, setHasOrganizationRelationship] = useState(relationships.length > 0);

  return (
    <div className="grid">
      <section className="card">
        <p className="eyebrow">Profile Details</p>
        <form action={updateAction} className="form-grid">
          <input type="hidden" name="donorId" value={donor.id} />
          <label>
            Donor type
            <select
              name="donorType"
              value={donorType}
              onChange={(event) => setDonorType(event.target.value as DonorProfileRow["donor_type"])}
            >
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
          {donorType === "ORGANIZATION" ? (
            <label className="full">
              Organization name
              <input name="organizationName" defaultValue={donor.organization_name ?? ""} />
            </label>
          ) : (
            <input type="hidden" name="organizationName" value={donor.organization_name ?? ""} />
          )}
          {donorType === "ORGANIZATION" ? (
            <>
              <label>
                Organization contact donor
                <select name="organizationContactDonorId" defaultValue={donor.organization_contact_donor_id ?? ""}>
                  <option value="">Select donor</option>
                  {connections
                    .filter((connection: DonorConnectionRow) => connection.donor_type === "INDIVIDUAL")
                    .map((connection: DonorConnectionRow) => (
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
            </>
          ) : (
            <>
              <input type="hidden" name="organizationContactDonorId" value={donor.organization_contact_donor_id ?? ""} />
              <input type="hidden" name="organizationContactName" value={donor.organization_contact_name ?? ""} />
            </>
          )}
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
          {donorType === "INDIVIDUAL" ? (
            <div className="full conditional-block">
              <label className="toggle-row">
                <input
                  type="checkbox"
                  checked={hasSpouse}
                  onChange={(event) => setHasSpouse(event.target.checked)}
                />
                <span>Has Spouse</span>
              </label>
              {hasSpouse ? (
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
              ) : (
                <input type="hidden" name="spouseDonorId" value="" />
              )}
            </div>
          ) : (
            <input type="hidden" name="spouseDonorId" value={donor.spouse_donor_id ?? ""} />
          )}
          <div className="full conditional-block">
            <label className="toggle-row">
              <input
                type="checkbox"
                checked={hasOrganizationRelationship}
                onChange={(event) => setHasOrganizationRelationship(event.target.checked)}
              />
              <span>Has Organization Relationship</span>
            </label>
            {hasOrganizationRelationship ? (
              <p className="muted">Use the organization relationships section below to manage multiple linked organizations.</p>
            ) : null}
          </div>
          <label className="full">
            General donor notes
            <textarea name="notes" rows={5} defaultValue={donor.notes ?? ""} />
          </label>
          <div className="full button-row">
            <button type="submit">Save profile</button>
            <Link href={`/donors/${donorId}/addresses`} className="inline-link">
              Manage alternate addresses
            </Link>
          </div>
        </form>
      </section>
      {hasOrganizationRelationship ? (
        <section className="table-shell">
          <div className="section-header">
            <div>
              <p className="eyebrow">Organization Relationships</p>
              <p className="muted">Link existing organization records or keep a named relationship for internal reference.</p>
            </div>
          </div>
          {relationships.length > 0 ? (
            <table>
              <thead>
                <tr>
                  <th>Organization</th>
                  <th>Relationship</th>
                  <th>Notes</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {relationships.map((relationship: DonorOrganizationRelationshipRow) => (
                  <tr key={relationship.id}>
                    <td>{relationship.organization_display_name}</td>
                    <td>{relationship.relationship_type.replaceAll("_", " ")}</td>
                    <td>{relationship.notes ?? "—"}</td>
                    <td>
                      <form action={deleteRelationshipAction}>
                        <input type="hidden" name="donorId" value={donorId} />
                        <input type="hidden" name="relationshipId" value={relationship.id} />
                        <button type="submit" className="secondary">
                          Remove
                        </button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="muted">No organization relationships yet.</p>
          )}
          <form action={addRelationshipAction} className="form-grid top-gap">
            <input type="hidden" name="donorId" value={donorId} />
            <label>
              Relationship type
              <select name="relationshipType" defaultValue="EMPLOYER">
                <option value="EMPLOYER">Employer</option>
                <option value="FOUNDATION">Foundation</option>
                <option value="DONOR_ADVISED_FUND">Donor Advised Fund</option>
                <option value="OTHER">Other</option>
              </select>
            </label>
            <label>
              Existing organization donor
              <select name="organizationDonorId" defaultValue="">
                <option value="">Select donor</option>
                {connections
                  .filter((connection: DonorConnectionRow) => connection.donor_type === "ORGANIZATION")
                  .map((connection: DonorConnectionRow) => (
                    <option key={connection.id} value={connection.id}>
                      {connection.display_name} {connection.donor_number ? `(${connection.donor_number})` : ""}
                    </option>
                  ))}
              </select>
            </label>
            <label className="full">
              Non-constituent organization name
              <input name="organizationName" />
            </label>
            <label className="full">
              Relationship notes
              <input name="relationshipNotes" />
            </label>
            <div className="full">
              <button type="submit">Add organization relationship</button>
            </div>
          </form>
        </section>
      ) : null}
    </div>
  );
}
