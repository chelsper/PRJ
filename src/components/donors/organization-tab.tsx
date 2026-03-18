"use client";

import { useState } from "react";

import { DonorLookup, type DonorLookupOption } from "@/components/donors/donor-lookup";
import type { ConfigLookupOption } from "@/server/data/configurations";
import type { DonorProfileRow, OrganizationContactRow } from "@/server/data/donors";

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
  titleOptions,
  organizationContactTypeOptions,
  updateAction,
  addContactAction,
  deleteContactAction
}: {
  donor: DonorProfileRow;
  donorId: string;
  contacts: OrganizationContactRow[];
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
  const [newContactTitle, setNewContactTitle] = useState("");
  const [newContactFirstName, setNewContactFirstName] = useState("");
  const [newContactMiddleName, setNewContactMiddleName] = useState("");
  const [newContactLastName, setNewContactLastName] = useState("");
  const [newContactEmail, setNewContactEmail] = useState("");
  const [newContactPhone, setNewContactPhone] = useState("");

  return (
    <div className="grid">
      <section className="card">
        <p className="eyebrow">Organization</p>
        <form action={updateAction} className="form-grid">
          <input type="hidden" name="donorId" value={donorId} />
          <label className="full">
            Organization name
            <input name="organizationName" defaultValue={donor.organization_name ?? ""} required />
          </label>
          <label>
            Organization website
            <input name="organizationWebsite" type="url" defaultValue={donor.organization_website ?? ""} />
          </label>
          <label>
            Organization email
            <input name="organizationEmail" type="email" defaultValue={donor.organization_email ?? ""} />
          </label>
          <DonorLookup
            label="Main Contact"
            name="organizationContactDonorId"
            allowedTypes={["INDIVIDUAL"]}
            initialSelection={mainContactSelection}
            hiddenInputId="organization-main-contact-id"
            placeholder="Search contact by name or donor ID"
            onSelectionChange={(selection) => {
              setMainContactSelection(selection);
              setMainContactTitle(selection?.title ?? "");
              setMainContactFirstName(selection?.firstName ?? "");
              setMainContactMiddleName(selection?.middleName ?? "");
              setMainContactLastName(selection?.lastName ?? "");
              setMainContactName(fullNameFromSelection(selection));
              setMainContactEmail(selection?.email ?? "");
              setMainContactPhone(selection?.primaryPhone ?? "");
            }}
          />
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
            <button type="submit">Save organization</button>
          </div>
        </form>
      </section>

      <section className="table-shell">
        <div className="section-header">
          <div>
            <p className="eyebrow">Organization Contacts</p>
            <p className="muted">Add linked or manual contacts for stewardship and acknowledgments.</p>
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
                  <td>{contact.linked_display_name ?? ([contact.first_name, contact.middle_name, contact.last_name].filter(Boolean).join(" ") || "—")}</td>
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
                setNewContactTitle(selection?.title ?? "");
                setNewContactFirstName(selection?.firstName ?? "");
                setNewContactMiddleName(selection?.middleName ?? "");
                setNewContactLastName(selection?.lastName ?? "");
                setNewContactEmail(selection?.email ?? "");
                setNewContactPhone(selection?.primaryPhone ?? "");
              }}
            />
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
              <input name="contactFirstName" value={newContactFirstName} onChange={(event) => setNewContactFirstName(event.target.value)} />
            </label>
            <label>
              Contact Middle Name
              <input name="contactMiddleName" value={newContactMiddleName} onChange={(event) => setNewContactMiddleName(event.target.value)} />
            </label>
            <label>
              Contact Last Name
              <input name="contactLastName" value={newContactLastName} onChange={(event) => setNewContactLastName(event.target.value)} />
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
