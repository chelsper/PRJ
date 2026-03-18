"use client";

import Link from "next/link";
import { useState } from "react";

import { DonorLookup } from "@/components/donors/donor-lookup";
import type { ConfigLookupOption } from "@/server/data/configurations";
import type { DonorConnectionRow, DonorOrganizationRelationshipRow, DonorProfileRow } from "@/server/data/donors";

type FormAction = (formData: FormData) => void | Promise<void>;

export function DonorProfileForm({
  donor,
  donorId,
  connections,
  relationships,
  titleOptions,
  emailTypeOptions,
  addressTypeOptions,
  stateOptions,
  relationshipTypeOptions,
  updateAction,
  addRelationshipAction,
  deleteRelationshipAction,
  promoteSpouseAction,
  promoteRelationshipAction
}: {
  donor: DonorProfileRow;
  donorId: string;
  connections: DonorConnectionRow[];
  relationships: DonorOrganizationRelationshipRow[];
  titleOptions: ConfigLookupOption[];
  emailTypeOptions: ConfigLookupOption[];
  addressTypeOptions: ConfigLookupOption[];
  stateOptions: ConfigLookupOption[];
  relationshipTypeOptions: ConfigLookupOption[];
  updateAction: FormAction;
  addRelationshipAction: FormAction;
  deleteRelationshipAction: FormAction;
  promoteSpouseAction: FormAction;
  promoteRelationshipAction: FormAction;
}) {
  const relationshipTypeLabels = Object.fromEntries(
    relationshipTypeOptions.map((option) => [option.value, option.label])
  );
  const [hasSpouse, setHasSpouse] = useState(
    Boolean(
      donor.spouse_donor_id ||
        donor.spouse_first_name ||
        donor.spouse_last_name ||
        donor.spouse_preferred_email ||
        donor.spouse_primary_phone
    )
  );
  const [createSpouseDraft, setCreateSpouseDraft] = useState(
    !donor.spouse_donor_id &&
      Boolean(
        donor.spouse_first_name ||
          donor.spouse_last_name ||
          donor.spouse_preferred_email ||
          donor.spouse_primary_phone
      )
  );
  const [hasOrganizationRelationship, setHasOrganizationRelationship] = useState(relationships.length > 0);
  const [createOrganizationDraft, setCreateOrganizationDraft] = useState(false);

  const spouseSelection =
    donor.spouse_donor_id && donor.spouse_name
      ? {
          id: donor.spouse_donor_id,
          donorNumber: donor.spouse_donor_number,
          donorType: "INDIVIDUAL" as const,
          fullName: donor.spouse_name,
          email: donor.spouse_primary_email_record
        }
      : null;

  return (
    <div className="grid">
      <section className="card">
        <p className="eyebrow">Profile Details</p>
        <form action={updateAction} className="form-grid">
          <input type="hidden" name="donorId" value={donor.id} />
          <input type="hidden" name="donorType" value={donor.donor_type} />
          <label>
            Constituent ID
            <input value={donor.donor_number ?? "Pending"} readOnly disabled />
          </label>
          <label>
            Donor type
            <input value={donor.donor_type === "ORGANIZATION" ? "Organization" : "Individual"} readOnly disabled />
          </label>
          {donor.donor_type === "INDIVIDUAL" ? (
            <>
              <label>
                Title
                <select name="title" defaultValue={donor.title ?? ""}>
                  <option value="">None</option>
                  {titleOptions.map((option) => (
                    <option key={option.id} value={option.value}>
                      {option.label}
                    </option>
                  ))}
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
            </>
          ) : (
            <>
              <input type="hidden" name="title" value={donor.title ?? ""} />
              <input type="hidden" name="firstName" value={donor.first_name ?? ""} />
              <input type="hidden" name="middleName" value={donor.middle_name ?? ""} />
              <input type="hidden" name="lastName" value={donor.last_name ?? ""} />
              <input type="hidden" name="preferredName" value={donor.preferred_name ?? ""} />
            </>
          )}
          <input type="hidden" name="organizationName" value={donor.organization_name ?? ""} />
          <input type="hidden" name="organizationWebsite" value={donor.organization_website ?? ""} />
          <input type="hidden" name="organizationEmail" value={donor.organization_email ?? ""} />
          <input type="hidden" name="organizationContactDonorId" value={donor.organization_contact_donor_id ?? ""} />
          <input type="hidden" name="organizationContactTitle" value={donor.organization_contact_title ?? ""} />
          <input type="hidden" name="organizationContactFirstName" value={donor.organization_contact_first_name ?? ""} />
          <input type="hidden" name="organizationContactMiddleName" value={donor.organization_contact_middle_name ?? ""} />
          <input type="hidden" name="organizationContactLastName" value={donor.organization_contact_last_name ?? ""} />
          <input type="hidden" name="organizationContactName" value={donor.organization_contact_name ?? ""} />
          <input type="hidden" name="organizationContactEmail" value={donor.organization_contact_email ?? ""} />
          <input type="hidden" name="organizationContactPhone" value={donor.organization_contact_phone ?? ""} />
          <label>
            Preferred email
            <input name="primaryEmail" type="email" defaultValue={donor.primary_email ?? ""} />
          </label>
          <label>
            Preferred email type
            <select name="primaryEmailType" defaultValue={donor.primary_email_type ?? ""}>
              <option value="">None</option>
              {emailTypeOptions.map((option) => (
                <option key={option.id} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Alternative email
            <input name="alternateEmail" type="email" defaultValue={donor.alternate_email ?? ""} />
          </label>
          <label>
            Alternative email type
            <select name="alternateEmailType" defaultValue={donor.alternate_email_type ?? ""}>
              <option value="">None</option>
              {emailTypeOptions.map((option) => (
                <option key={option.id} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
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
            <select name="addressType" defaultValue={donor.address_type ?? addressTypeOptions[0]?.value ?? "Primary"}>
              {addressTypeOptions.map((option) => (
                <option key={option.id} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
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
            <select name="stateRegion" defaultValue={donor.state_region ?? ""}>
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
            <input name="postalCode" defaultValue={donor.postal_code ?? ""} />
          </label>
          <label>
            Country
            <input name="country" defaultValue={donor.country ?? "United States"} />
          </label>
          {donor.donor_type === "INDIVIDUAL" ? (
            <div className="full conditional-block">
              <label className="toggle-row">
                <input
                  type="checkbox"
                  checked={hasSpouse}
                  onChange={(event) => {
                    const next = event.target.checked;
                    setHasSpouse(next);
                    if (!next) {
                      setCreateSpouseDraft(false);
                    }
                  }}
                />
                <span>Has Spouse</span>
              </label>
              {hasSpouse ? (
                <>
                  <DonorLookup
                    label="Spouse record"
                    name="spouseDonorId"
                    allowedTypes={["INDIVIDUAL"]}
                    initialSelection={spouseSelection}
                    hiddenInputId="spouse-donor-id"
                    placeholder="Search spouse by name or email"
                  />
                  <label className="toggle-row">
                    <input
                      type="checkbox"
                      checked={createSpouseDraft}
                      onChange={(event) => setCreateSpouseDraft(event.target.checked)}
                    />
                    <span>Create spouse if no record is found</span>
                  </label>
                  {createSpouseDraft ? (
                    <div className="form-grid full">
                      <label>
                        Spouse title
                        <select name="spouseTitle" defaultValue={donor.spouse_title ?? ""}>
                          <option value="">None</option>
                          {titleOptions.map((option) => (
                            <option key={option.id} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label>
                        Spouse first name
                        <input name="spouseFirstName" defaultValue={donor.spouse_first_name ?? ""} />
                      </label>
                      <label>
                        Spouse middle name
                        <input name="spouseMiddleName" defaultValue={donor.spouse_middle_name ?? ""} />
                      </label>
                      <label>
                        Spouse last name
                        <input name="spouseLastName" defaultValue={donor.spouse_last_name ?? ""} />
                      </label>
                      <label>
                        Spouse preferred email
                        <input name="spousePreferredEmail" type="email" defaultValue={donor.spouse_preferred_email ?? ""} />
                      </label>
                      <label>
                        Spouse additional email
                        <input name="spouseAlternateEmail" type="email" defaultValue={donor.spouse_alternate_email ?? ""} />
                      </label>
                      <label>
                        Spouse primary phone
                        <input name="spousePrimaryPhone" defaultValue={donor.spouse_primary_phone ?? ""} />
                      </label>
                      <label className="toggle-row full">
                        <input type="checkbox" name="spouseSameAddress" defaultChecked={donor.spouse_same_address} />
                        <span>Address is the same</span>
                      </label>
                      <div className="full button-row">
                        <button type="submit" formAction={promoteSpouseAction} className="secondary">
                          Promote spouse to full donor record
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <input type="hidden" name="spouseTitle" value={donor.spouse_title ?? ""} />
                      <input type="hidden" name="spouseFirstName" value={donor.spouse_first_name ?? ""} />
                      <input type="hidden" name="spouseMiddleName" value={donor.spouse_middle_name ?? ""} />
                      <input type="hidden" name="spouseLastName" value={donor.spouse_last_name ?? ""} />
                      <input type="hidden" name="spousePreferredEmail" value={donor.spouse_preferred_email ?? ""} />
                      <input type="hidden" name="spouseAlternateEmail" value={donor.spouse_alternate_email ?? ""} />
                      <input type="hidden" name="spousePrimaryPhone" value={donor.spouse_primary_phone ?? ""} />
                      <input type="hidden" name="spouseSameAddress" value={donor.spouse_same_address ? "on" : ""} />
                    </>
                  )}
                </>
              ) : (
                <>
                  <input type="hidden" name="spouseDonorId" value="" />
                  <input type="hidden" name="spouseTitle" value="" />
                  <input type="hidden" name="spouseFirstName" value="" />
                  <input type="hidden" name="spouseMiddleName" value="" />
                  <input type="hidden" name="spouseLastName" value="" />
                  <input type="hidden" name="spousePreferredEmail" value="" />
                  <input type="hidden" name="spouseAlternateEmail" value="" />
                  <input type="hidden" name="spousePrimaryPhone" value="" />
                  <input type="hidden" name="spouseSameAddress" value="" />
                </>
              )}
            </div>
          ) : (
            <>
              <input type="hidden" name="spouseDonorId" value={donor.spouse_donor_id ?? ""} />
              <input type="hidden" name="spouseTitle" value={donor.spouse_title ?? ""} />
              <input type="hidden" name="spouseFirstName" value={donor.spouse_first_name ?? ""} />
              <input type="hidden" name="spouseMiddleName" value={donor.spouse_middle_name ?? ""} />
              <input type="hidden" name="spouseLastName" value={donor.spouse_last_name ?? ""} />
              <input type="hidden" name="spousePreferredEmail" value={donor.spouse_preferred_email ?? ""} />
              <input type="hidden" name="spouseAlternateEmail" value={donor.spouse_alternate_email ?? ""} />
              <input type="hidden" name="spousePrimaryPhone" value={donor.spouse_primary_phone ?? ""} />
              <input type="hidden" name="spouseSameAddress" value={donor.spouse_same_address ? "on" : ""} />
            </>
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
              <p className="muted">Use the organization relationships section below to search for existing organizations, create draft organizations, and promote them into full donor records.</p>
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
              <p className="muted">Link existing organization records or store lightweight organization details until you are ready to promote them.</p>
            </div>
          </div>
          {relationships.length > 0 ? (
            <table>
              <thead>
                <tr>
                  <th>Organization</th>
                  <th>Relationship</th>
                  <th>Contact</th>
                  <th>Primary email</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {relationships.map((relationship: DonorOrganizationRelationshipRow) => (
                  <tr key={relationship.id}>
                    <td>
                      {relationship.organization_display_name}
                      {relationship.organization_donor_number ? (
                        <div className="muted">{relationship.organization_donor_number}</div>
                      ) : null}
                    </td>
                    <td>{relationshipTypeLabels[relationship.relationship_type] ?? relationship.relationship_type.replaceAll("_", " ")}</td>
                    <td>{relationship.contact_name ?? "—"}</td>
                    <td>{relationship.primary_email ?? "—"}</td>
                    <td>
                      <div className="button-row">
                        {!relationship.organization_donor_id && relationship.organization_name ? (
                          <form action={promoteRelationshipAction}>
                            <input type="hidden" name="donorId" value={donorId} />
                            <input type="hidden" name="relationshipId" value={relationship.id} />
                            <button type="submit" className="secondary">
                              Promote to donor record
                            </button>
                          </form>
                        ) : null}
                        <form action={deleteRelationshipAction}>
                          <input type="hidden" name="donorId" value={donorId} />
                          <input type="hidden" name="relationshipId" value={relationship.id} />
                          <button type="submit" className="secondary">
                            Remove
                          </button>
                        </form>
                      </div>
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
              <select name="relationshipType" defaultValue={relationshipTypeOptions[0]?.value ?? "EMPLOYER"}>
                {relationshipTypeOptions.map((option) => (
                  <option key={option.id} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <DonorLookup
              label="Existing organization donor"
              name="organizationDonorId"
              allowedTypes={["ORGANIZATION"]}
              placeholder="Search organization by name or donor ID"
            />
            <label className="toggle-row full">
              <input
                type="checkbox"
                checked={createOrganizationDraft}
                onChange={(event) => setCreateOrganizationDraft(event.target.checked)}
              />
              <span>Create organization if no record is found</span>
            </label>
            {createOrganizationDraft ? (
              <>
                <label className="full">
                  Organization name
                  <input name="organizationName" />
                </label>
                <label>
                  Contact name
                  <input name="contactName" />
                </label>
                <label>
                  Primary email
                  <input name="organizationPrimaryEmail" type="email" />
                </label>
                <label>
                  Additional email
                  <input name="organizationAlternateEmail" type="email" />
                </label>
                <label>
                  Primary phone
                  <input name="organizationPrimaryPhone" />
                </label>
                <label>
                  Address type
                  <select name="organizationAddressType" defaultValue={addressTypeOptions[0]?.value ?? "Primary"}>
                    {addressTypeOptions.map((option) => (
                      <option key={option.id} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="full">
                  Street 1
                  <input name="organizationStreet1" />
                </label>
                <label className="full">
                  Street 2
                  <input name="organizationStreet2" />
                </label>
                <label>
                  City
                  <input name="organizationCity" />
                </label>
                <label>
                  State / Region
                  <select name="organizationStateRegion" defaultValue="">
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
                  <input name="organizationPostalCode" />
                </label>
                <label>
                  Country
                  <input name="organizationCountry" defaultValue="United States" />
                </label>
              </>
            ) : (
              <>
                <input type="hidden" name="organizationName" value="" />
                <input type="hidden" name="contactName" value="" />
                <input type="hidden" name="organizationPrimaryEmail" value="" />
                <input type="hidden" name="organizationAlternateEmail" value="" />
                <input type="hidden" name="organizationPrimaryPhone" value="" />
                <input type="hidden" name="organizationAddressType" value="" />
                <input type="hidden" name="organizationStreet1" value="" />
                <input type="hidden" name="organizationStreet2" value="" />
                <input type="hidden" name="organizationCity" value="" />
                <input type="hidden" name="organizationStateRegion" value="" />
                <input type="hidden" name="organizationPostalCode" value="" />
                <input type="hidden" name="organizationCountry" value="" />
              </>
            )}
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
