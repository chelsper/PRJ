import { AdminSectionNav } from "@/components/admin/admin-section-nav";
import { requireCapability } from "@/server/auth/permissions";
import {
  listConfigOptionsBySet,
  listManagedCampaigns,
  listManagedFunds,
  managedOptionSets,
  type ConfigLookupOption,
  type ManagedOptionSetKey,
  type ManagedCampaignRow,
  type ManagedFundRow
} from "@/server/data/configurations";

import {
  createCampaignAction,
  createFieldOptionAction,
  createFundAction,
  updateCampaignAction,
  updateFieldOptionAction,
  updateFundAction
} from "../actions";

const setLabels: Record<ManagedOptionSetKey, string> = {
  titles: "Titles",
  email_types: "Email Types",
  address_types: "Address Types",
  note_categories: "Note Categories",
  donor_relationship_types: "Organization Relationship Types",
  organization_contact_types: "Organization Contact Types"
};

export default async function AdminConfigurationsPage() {
  await requireCapability("users:manage");
  const [funds, campaigns, optionSets] = await Promise.all([
    listManagedFunds(),
    listManagedCampaigns(),
    listConfigOptionsBySet(true)
  ]);

  return (
    <div className="grid">
      <section className="hero">
        <p className="eyebrow">Admin</p>
        <h1>Configurations</h1>
        <p className="muted">Manage funds, campaigns, and the system lookup values used across donor, notes, and organization workflows.</p>
      </section>

      <AdminSectionNav active="configurations" />

      <section className="table-shell">
        <div className="section-header">
          <div>
            <p className="eyebrow">Funds</p>
            <p className="muted">Funds appear in gift entry and reporting.</p>
          </div>
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Code</th>
                <th>Archived</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {funds.map((fund: ManagedFundRow) => {
                const formId = `fund-${fund.id}`;

                return (
                  <tr key={fund.id}>
                    <td>
                      <input name="name" form={formId} defaultValue={fund.name} />
                    </td>
                    <td>
                      <input name="code" form={formId} defaultValue={fund.code ?? ""} />
                    </td>
                    <td>
                      <label className="checkbox-line">
                        <input type="checkbox" name="archived" form={formId} defaultChecked={Boolean(fund.archived_at)} />
                        Archived
                      </label>
                    </td>
                    <td>
                      <form id={formId} action={updateFundAction}>
                        <input type="hidden" name="id" value={fund.id} />
                        <button type="submit" className="secondary">
                          Save
                        </button>
                      </form>
                    </td>
                  </tr>
                );
              })}
              <tr>
                <td colSpan={4}>
                  <form action={createFundAction} className="form-grid">
                    <label>
                      New fund name
                      <input name="name" required />
                    </label>
                    <label>
                      Code
                      <input name="code" />
                    </label>
                    <div>
                      <button type="submit">Add fund</button>
                    </div>
                  </form>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className="table-shell">
        <div className="section-header">
          <div>
            <p className="eyebrow">Campaigns</p>
            <p className="muted">Campaigns are available in gift entry and summary reporting.</p>
          </div>
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Code</th>
                <th>Starts</th>
                <th>Ends</th>
                <th>Archived</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {campaigns.map((campaign: ManagedCampaignRow) => {
                const formId = `campaign-${campaign.id}`;

                return (
                  <tr key={campaign.id}>
                    <td>
                      <input name="name" form={formId} defaultValue={campaign.name} />
                    </td>
                    <td>
                      <input name="code" form={formId} defaultValue={campaign.code ?? ""} />
                    </td>
                    <td>
                      <input name="startsOn" form={formId} type="date" defaultValue={campaign.starts_on ?? ""} />
                    </td>
                    <td>
                      <input name="endsOn" form={formId} type="date" defaultValue={campaign.ends_on ?? ""} />
                    </td>
                    <td>
                      <label className="checkbox-line">
                        <input type="checkbox" name="archived" form={formId} defaultChecked={Boolean(campaign.archived_at)} />
                        Archived
                      </label>
                    </td>
                    <td>
                      <form id={formId} action={updateCampaignAction}>
                        <input type="hidden" name="id" value={campaign.id} />
                        <button type="submit" className="secondary">
                          Save
                        </button>
                      </form>
                    </td>
                  </tr>
                );
              })}
              <tr>
                <td colSpan={6}>
                  <form action={createCampaignAction} className="form-grid">
                    <label>
                      New campaign name
                      <input name="name" required />
                    </label>
                    <label>
                      Code
                      <input name="code" />
                    </label>
                    <label>
                      Starts on
                      <input name="startsOn" type="date" />
                    </label>
                    <label>
                      Ends on
                      <input name="endsOn" type="date" />
                    </label>
                    <div className="full">
                      <button type="submit">Add campaign</button>
                    </div>
                  </form>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {managedOptionSets.map((setKey) => (
        <section className="table-shell" key={setKey}>
          <div className="section-header">
            <div>
              <p className="eyebrow">{setLabels[setKey]}</p>
              <p className="muted">These options drive select fields across the donor and organization workflows.</p>
            </div>
          </div>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Internal value</th>
                  <th>Display label</th>
                  <th>Sort order</th>
                  <th>Active</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {optionSets[setKey].map((option: ConfigLookupOption) => {
                  const formId = `${setKey}-${option.id}`;

                  return (
                    <tr key={option.id}>
                      <td>{option.value}</td>
                      <td>
                        <input name="label" form={formId} defaultValue={option.label} />
                      </td>
                      <td>
                        <input name="sortOrder" form={formId} type="number" defaultValue={option.sort_order} />
                      </td>
                      <td>
                        <label className="checkbox-line">
                          <input type="checkbox" name="isActive" form={formId} defaultChecked={option.is_active} />
                          Active
                        </label>
                      </td>
                      <td>
                        <form id={formId} action={updateFieldOptionAction}>
                          <input type="hidden" name="id" value={option.id} />
                          <button type="submit" className="secondary">
                            Save
                          </button>
                        </form>
                      </td>
                    </tr>
                  );
                })}
                <tr>
                  <td colSpan={5}>
                    <form action={createFieldOptionAction} className="form-grid">
                      <input type="hidden" name="setKey" value={setKey} />
                      <label>
                        New internal value
                        <input name="value" required />
                      </label>
                      <label>
                        Display label
                        <input name="label" required />
                      </label>
                      <label>
                        Sort order
                        <input name="sortOrder" type="number" defaultValue={100} />
                      </label>
                      <div>
                        <button type="submit">Add option</button>
                      </div>
                    </form>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      ))}
    </div>
  );
}
