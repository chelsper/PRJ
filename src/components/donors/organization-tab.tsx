"use client";

import Link from "next/link";
import { useState } from "react";

import { DonorLookup, type DonorLookupOption } from "@/components/donors/donor-lookup";
import type { ConfigLookupOption } from "@/server/data/configurations";
import type { DonorProfileRow, OrganizationContactRow, OrganizationRelationshipMemberRow } from "@/server/data/donors";

type FormAction = (formData: FormData) => void | Promise<void>;

function fullNameFromSelection(selection: DonorLookupOption | null) {
  if (!selection) {
    return "";
  }

  return [selection.firstName, selection.middleName, selection.lastName].filter(Boolean).join(" ").trim();
}

export function OrganizationTab({
  donor,
  donorId,
  contacts,
  relationshipMembers,
  titleOptions,
  organizationContactTypeOptions,
  updateAction,
  addContactAction,
  deleteContactAction
}: {
  donor: DonorProfileRow;
  donorId: string;
  contacts: OrganizationContactRow[];
  relationshipMembers: OrganizationRelationshipMemberRow[];
  titleOptions: ConfigLookupOption[];
  organizationContactTypeOptions: ConfigLookupOption[];
  updateAction: FormAction;
  addContactAction: FormAction;
  deleteContactAction: FormAction;
}) {
  const contactTypeLabels = Object.fromEntries(
    organizationContactTypeOptions.map((option) => [option.value, option.label])
  );
  const [mainContactSelection, setMainContactSelection] = useState<DonorLookupOption | null>(
    donor.organization_contact_donor_id
      ? {
          id: donor.organization_contact_donor_id,
          donorNumber: null,
          donorType: "INDIVIDUAL",
          fullName: donor.organization_contact_name ?? "Selected contact",
          email: donor.organization_contact_email,
          title: donor.organization_contact_title,
          firstName: donor.organization_contact_first_name,
          middleName: donor.organization_contact_middle_name,
          lastName: donor.organization_contact_last_name,
          primaryPhone: donor.organization_contact_phone
        }
      : null
  );
  const [newContactSelection, setNewContactSelection] = useState<DonorLookupOption | null>(null);
  const [mainContactTitle, setMainContactTitle] = useState(donor.organization_contact_title ?? "");
  const [mainContactFirstName, setMainContactFirstName] = useState(donor.organization_contact_first_name ?? "");
  const [mainContactMiddleName, setMainContactMiddleName] = useState(donor.organization_contact_middle_name ?? "");
  const [mainContactLastName, setMainContactLastName] = useState(donor.organization_contact_last_name ?? "");
  const [mainContactName, setMainContactName] = useState(donor.organization_contact_name ?? "");
  const [mainContactEmail, setMainContactEmail] = useState(donor.organization_contact_email ?? "");
  const [mainContactPhone, setMainContactPhone] = useState(donor.organization_contact_phone ?? "");
  const [createMainContactAsDonor, setCreateMainContactAsDonor] = useState(false);
  const [newContactTitle, setNewContactTitle] = useState("");
  const [newContactFirstName, setNewContactFirstName] = useState("");
  const [newContactMiddleName, setNewContactMiddleName] = useState("");
  const [newContactLastName, setNewContactLastName] = useState("");
  const [newContactEmail, setNewContactEmail] = useState("");
  const [newContactPhone, setNewContactPhone] = useState("");
  const [createContactAsDonor, setCreateContactAsDonor] = useState(false);

  return (
    <div className="grid">
      <section className="card">
        <p className="eyebrow">Primary Contact</p>
        <form action={updateAction} className="form-grid">
          <input type="hidden" name="donorId" value={donorId} />
          <input type="hidden" name="organizationName" value={donor.organization_name ?? ""} />
          <input type="hidden" name="organizationWebsite" value={donor.organization_website ?? ""} />
          <input type="hidden" name="organizationEmail" value={donor.organization_email ?? ""} />
          <div className="full form-section-heading">
            <p className="eyebrow">Main Contact</p>
            <p className="muted">Link an existing constituent or enter a new contact for this organization.</p>
          </div>
          <DonorLookup
            label="Main Contact"
            name="organizationContactDonorId"
            allowedTypes={["INDIVIDUAL"]}
            initialSelection={mainContactSelection}
            hiddenInputId="organization-main-contact-id"
            placeholder="Search contact by name or donor ID"
            onSelectionChange={(selection) => {
              setMainContactSelection(selection);
              if (selection) {
                setCreateMainContactAsDonor(false);
              }
              setMainContactTitle(selection?.title ?? "");
              setMainContactFirstName(selection?.firstName ?? "");
              setMainContactMiddleName(selection?.middleName ?? "");
              setMainContactLastName(selection?.lastName ?? "");
              setMainContactName(fullNameFromSelection(selection));
              setMainContactEmail(selection?.email ?? "");
              setMainContactPhone(selection?.primaryPhone ?? "");
            }}
          />
          {donor.organization_contact_donor_id ? (
            <div className="full">
              <Link href={`/donors/${donor.organization_contact_donor_id}`} className="inline-link">
                Open linked contact record
              </Link>
            </div>
          ) : null}
          <label className="toggle-row full">
            <input
              type="checkbox"
              name="createOrganizationContactAsDonor"
              checked={createMainContactAsDonor}
              disabled={Boolean(mainContactSelection)}
              onChange={(event) => setCreateMainContactAsDonor(event.target.checked)}
            />
            <span>Create main contact as constituent record</span>
          </label>
          <label>
            Contact Title
            <select name="organizationContactTitle" value={mainContactTitle} onChange={(event) => setMainContactTitle(event.target.value)}>
              <option value="">None</option>
              {titleOptions.map((option) => (
                <option key={option.id} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Contact First Name
            <input
              name="organizationContactFirstName"
              value={mainContactFirstName}
              readOnly={Boolean(mainContactSelection)}
              required={createMainContactAsDonor && !mainContactSelection}
              onChange={(event) => setMainContactFirstName(event.target.value)}
            />
          </label>
          <label>
            Contact Middle Name
            <input
              name="organizationContactMiddleName"
              value={mainContactMiddleName}
              readOnly={Boolean(mainContactSelection)}
              onChange={(event) => setMainContactMiddleName(event.target.value)}
            />
          </label>
          <label>
            Contact Last Name
            <input
              name="organizationContactLastName"
              value={mainContactLastName}
              readOnly={Boolean(mainContactSelection)}
              required={createMainContactAsDonor && !mainContactSelection}
              onChange={(event) => setMainContactLastName(event.target.value)}
            />
          </label>
          <label>
            Contact Display Name
            <input
              name="organizationContactName"
              value={mainContactName}
              readOnly={Boolean(mainContactSelection)}
              onChange={(event) => setMainContactName(event.target.value)}
            />
          </label>
          <label>
            Contact Email
            <input
              name="organizationContactEmail"
              type="email"
              value={mainContactEmail}
              readOnly={Boolean(mainContactSelection)}
              onChange={(event) => setMainContactEmail(event.target.value)}
            />
          </label>
          <label>
            Contact Phone
            <input
              name="organizationContactPhone"
              value={mainContactPhone}
              readOnly={Boolean(mainContactSelection)}
              onChange={(event) => setMainContactPhone(event.target.value)}
            />
          </label>
          <div className="full">
            <button type="submit">Save Contact</button>
          </div>
        </form>
      </section>

      <section className="table-shell">
        <div className="section-header">
          <div>
            <p className="eyebrow">Linked People</p>
            <p className="muted">Employees and linked constituents associated with this organization.</p>
          </div>
        </div>
        {relationshipMembers.length > 0 ? (
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Relationship</th>
                <th>Role</th>
                <th>Contact status</th>
                <th>Email</th>
              </tr>
            </thead>
            <tbody>
              {relationshipMembers.map((member) => (
                <tr key={member.relationship_id}>
                  <td>
                    <Link href={`/donors/${member.donor_id}`} className="table-link">
                      {member.donor_name}
                    </Link>
                    {member.donor_number ? <div className="muted">{member.donor_number}</div> : null}
                  </td>
                  <td>{member.relationship_type.replaceAll("_", " ")}</td>
                  <td>{member.role ?? "—"}</td>
                  <td>{member.is_contact ? contactTypeLabels[member.contact_type ?? ""] ?? "Contact" : "Employee"}</td>
                  <td>{member.primary_email ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="muted">No linked employees or constituents yet.</p>
        )}
      </section>

      <section className="table-shell">
        <div className="section-header">
          <div>
            <p className="eyebrow">Contacts</p>
            <p className="muted">Manage main, stewardship, acknowledgment, and additional contacts for this organization.</p>
          </div>
        </div>
        {contacts.length > 0 ? (
          <table>
            <thead>
              <tr>
                <th>Type</th>
                <th>Name</th>
                <th>Email</th>
                <th>Phone</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {contacts.map((contact: OrganizationContactRow) => (
                <tr key={contact.id}>
                  <td>{contactTypeLabels[contact.contact_type] ?? contact.contact_type.replaceAll("_", " ")}</td>
                  <td>
                    {contact.contact_donor_id && contact.linked_display_name ? (
                      <Link href={`/donors/${contact.contact_donor_id}`} className="table-link">
                        {contact.linked_display_name}
                      </Link>
                    ) : (
                      contact.linked_display_name ??
                      ([contact.first_name, contact.middle_name, contact.last_name].filter(Boolean).join(" ") || "—")
                    )}
                    {contact.linked_donor_number ? <div className="muted">{contact.linked_donor_number}</div> : null}
                  </td>
                  <td>{contact.email ?? "—"}</td>
                  <td>{contact.primary_phone ?? "—"}</td>
                  <td>
                    <form action={deleteContactAction}>
                      <input type="hidden" name="donorId" value={donorId} />
                      <input type="hidden" name="contactId" value={contact.id} />
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
          <p className="muted">No organization contacts yet.</p>
        )}

        <form action={addContactAction} className="form-grid top-gap">
          <input type="hidden" name="donorId" value={donorId} />
          <label>
            Contact Type
            <select name="contactType" defaultValue={organizationContactTypeOptions[0]?.value ?? "ADDITIONAL_CONTACT"}>
              {organizationContactTypeOptions.map((option) => (
                <option key={option.id} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
            <DonorLookup
              label="Search Contact"
              name="contactDonorId"
              allowedTypes={["INDIVIDUAL"]}
              placeholder="Search contact by name or donor ID"
              onSelectionChange={(selection) => {
                setNewContactSelection(selection);
                if (selection) {
                  setCreateContactAsDonor(false);
                }
                setNewContactTitle(selection?.title ?? "");
                setNewContactFirstName(selection?.firstName ?? "");
                setNewContactMiddleName(selection?.middleName ?? "");
                setNewContactLastName(selection?.lastName ?? "");
                setNewContactEmail(selection?.email ?? "");
                setNewContactPhone(selection?.primaryPhone ?? "");
              }}
            />
            <label className="toggle-row full">
              <input
                type="checkbox"
                name="createContactAsDonor"
                checked={createContactAsDonor}
                disabled={Boolean(newContactSelection)}
                onChange={(event) => setCreateContactAsDonor(event.target.checked)}
              />
              <span>Create this contact as a constituent record</span>
            </label>
            <label>
              Contact Title
              <select name="contactTitle" value={newContactTitle} onChange={(event) => setNewContactTitle(event.target.value)}>
                <option value="">None</option>
                {titleOptions.map((option) => (
                  <option key={option.id} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Contact First Name
              <input
                name="contactFirstName"
                value={newContactFirstName}
                required={createContactAsDonor && !newContactSelection}
                onChange={(event) => setNewContactFirstName(event.target.value)}
              />
            </label>
            <label>
              Contact Middle Name
              <input name="contactMiddleName" value={newContactMiddleName} onChange={(event) => setNewContactMiddleName(event.target.value)} />
            </label>
            <label>
              Contact Last Name
              <input
                name="contactLastName"
                value={newContactLastName}
                required={createContactAsDonor && !newContactSelection}
                onChange={(event) => setNewContactLastName(event.target.value)}
              />
            </label>
            <label>
              Contact Email
              <input name="contactEmail" type="email" value={newContactEmail} onChange={(event) => setNewContactEmail(event.target.value)} />
            </label>
            <label>
              Contact Phone
              <input name="contactPrimaryPhone" value={newContactPhone} onChange={(event) => setNewContactPhone(event.target.value)} />
            </label>
          <div className="full">
            <button type="submit">+ Add organization contact</button>
          </div>
        </form>
      </section>
    </div>
  );
}
