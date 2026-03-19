import Link from "next/link";

import { AdminSectionNav } from "@/components/admin/admin-section-nav";
import { requireCapability } from "@/server/auth/permissions";
import {
  listConfigOptionsBySet,
  listManagedAppeals,
  listManagedCampaigns,
  listManagedFunds,
  managedOptionSets,
  type ManagedAppealRow,
  type ConfigLookupOption,
  type ManagedCampaignRow,
  type ManagedFundRow,
  type ManagedOptionSetKey
} from "@/server/data/configurations";

import {
  createAppealAction,
  createCampaignAction,
  createFieldOptionAction,
  createFundAction,
  reorderFieldOptionAction,
  updateAppealAction,
  updateCampaignAction,
  updateFieldOptionAction,
  updateFundAction
} from "../actions";

const setLabels: Record<ManagedOptionSetKey, string> = {
  titles: "Titles",
  genders: "Genders",
  email_types: "Email Types",
  address_types: "Address Types",
  states: "States",
  note_categories: "Note Categories",
  donor_relationship_types: "Organization Relationship Types",
  organization_contact_types: "Organization Contact Types"
};

type SortDirection = "asc" | "desc";
type FundSortKey = "name" | "code" | "archived";
type CampaignSortKey = "name" | "code" | "starts" | "ends" | "archived";
type AppealSortKey = "name" | "code" | "archived";
type OptionSortKey = "value" | "label" | "sort_order" | "active";

function normalizedDirection(value: string | undefined): SortDirection {
  return value === "desc" ? "desc" : "asc";
}

function nextDirection(active: boolean, direction: SortDirection): SortDirection {
  if (!active) {
    return "asc";
  }

  return direction === "asc" ? "desc" : "asc";
}

function sortArrow(active: boolean, direction: SortDirection) {
  if (!active) {
    return "↕";
  }

  return direction === "asc" ? "↑" : "↓";
}

function compareText(left: string | null | undefined, right: string | null | undefined, direction: SortDirection) {
  const result = (left ?? "").localeCompare(right ?? "", undefined, { sensitivity: "base" });
  return direction === "asc" ? result : result * -1;
}

function compareBoolean(left: boolean, right: boolean, direction: SortDirection) {
  const result = Number(left) - Number(right);
  return direction === "asc" ? result : result * -1;
}

function compareNumber(left: number, right: number, direction: SortDirection) {
  const result = left - right;
  return direction === "asc" ? result : result * -1;
}

function SortLink({
  label,
  active,
  direction,
  href
}: {
  label: string;
  active: boolean;
  direction: SortDirection;
  href: string;
}) {
  return (
    <Link href={href} className={active ? "sort-link active" : "sort-link"}>
      <span>{label}</span>
      <span aria-hidden="true">{sortArrow(active, direction)}</span>
    </Link>
  );
}

export default async function AdminConfigurationsPage({
  searchParams
}: {
  searchParams: Promise<{
    fundSort?: string;
    fundDir?: string;
    campaignSort?: string;
    campaignDir?: string;
    appealSort?: string;
    appealDir?: string;
    optionSort?: string;
    optionDir?: string;
  }>;
}) {
  await requireCapability("users:manage");
  const params = await searchParams;
  const [funds, campaigns, appeals, optionSets] = await Promise.all([
    listManagedFunds(),
    listManagedCampaigns(),
    listManagedAppeals(),
    listConfigOptionsBySet(true)
  ]);

  const fundSort = (["name", "code", "archived"] as FundSortKey[]).includes(params.fundSort as FundSortKey)
    ? (params.fundSort as FundSortKey)
    : "name";
  const fundDir = normalizedDirection(params.fundDir);

  const campaignSort = (["name", "code", "starts", "ends", "archived"] as CampaignSortKey[]).includes(params.campaignSort as CampaignSortKey)
    ? (params.campaignSort as CampaignSortKey)
    : "name";
  const campaignDir = normalizedDirection(params.campaignDir);

  const appealSort = (["name", "code", "archived"] as AppealSortKey[]).includes(params.appealSort as AppealSortKey)
    ? (params.appealSort as AppealSortKey)
    : "name";
  const appealDir = normalizedDirection(params.appealDir);

  const optionSort = (["value", "label", "sort_order", "active"] as OptionSortKey[]).includes(params.optionSort as OptionSortKey)
    ? (params.optionSort as OptionSortKey)
    : "sort_order";
  const optionDir = normalizedDirection(params.optionDir);

  const sortedFunds = [...funds].sort((left, right) => {
    if (fundSort === "code") {
      return compareText(left.code, right.code, fundDir);
    }

    if (fundSort === "archived") {
      return compareBoolean(Boolean(left.archived_at), Boolean(right.archived_at), fundDir);
    }

    return compareText(left.name, right.name, fundDir);
  });

  const sortedCampaigns = [...campaigns].sort((left, right) => {
    if (campaignSort === "code") {
      return compareText(left.code, right.code, campaignDir);
    }

    if (campaignSort === "starts") {
      return compareText(left.starts_on, right.starts_on, campaignDir);
    }

    if (campaignSort === "ends") {
      return compareText(left.ends_on, right.ends_on, campaignDir);
    }

    if (campaignSort === "archived") {
      return compareBoolean(Boolean(left.archived_at), Boolean(right.archived_at), campaignDir);
    }

    return compareText(left.name, right.name, campaignDir);
  });

  const sortedAppeals = [...appeals].sort((left, right) => {
    if (appealSort === "code") {
      return compareText(left.code, right.code, appealDir);
    }

    if (appealSort === "archived") {
      return compareBoolean(Boolean(left.archived_at), Boolean(right.archived_at), appealDir);
    }

    return compareText(left.name, right.name, appealDir);
  });

  const sortedOptionSets = Object.fromEntries(
    managedOptionSets.map((setKey) => {
      const sortedOptions = [...optionSets[setKey]].sort((left, right) => {
        if (optionSort === "value") {
          return compareText(left.value, right.value, optionDir);
        }

        if (optionSort === "label") {
          return compareText(left.label, right.label, optionDir);
        }

        if (optionSort === "active") {
          return compareBoolean(left.is_active, right.is_active, optionDir);
        }

        return compareNumber(left.sort_order, right.sort_order, optionDir);
      });

      return [setKey, sortedOptions];
    })
  ) as Record<ManagedOptionSetKey, ConfigLookupOption[]>;

  function buildSortHref(updates: Record<string, string>) {
    const next = new URLSearchParams();

    if (params.fundSort) next.set("fundSort", params.fundSort);
    if (params.fundDir) next.set("fundDir", params.fundDir);
    if (params.campaignSort) next.set("campaignSort", params.campaignSort);
    if (params.campaignDir) next.set("campaignDir", params.campaignDir);
    if (params.appealSort) next.set("appealSort", params.appealSort);
    if (params.appealDir) next.set("appealDir", params.appealDir);
    if (params.optionSort) next.set("optionSort", params.optionSort);
    if (params.optionDir) next.set("optionDir", params.optionDir);

    Object.entries(updates).forEach(([key, value]) => next.set(key, value));

    return `/admin/configurations?${next.toString()}`;
  }

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
                <th>
                  <SortLink
                    label="Name"
                    active={fundSort === "name"}
                    direction={fundDir}
                    href={buildSortHref({ fundSort: "name", fundDir: nextDirection(fundSort === "name", fundDir) })}
                  />
                </th>
                <th>
                  <SortLink
                    label="Code"
                    active={fundSort === "code"}
                    direction={fundDir}
                    href={buildSortHref({ fundSort: "code", fundDir: nextDirection(fundSort === "code", fundDir) })}
                  />
                </th>
                <th>
                  <SortLink
                    label="Archived"
                    active={fundSort === "archived"}
                    direction={fundDir}
                    href={buildSortHref({ fundSort: "archived", fundDir: nextDirection(fundSort === "archived", fundDir) })}
                  />
                </th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {sortedFunds.map((fund: ManagedFundRow) => {
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
            <p className="eyebrow">Appeals</p>
            <p className="muted">Appeals are available in gift entry, imports, and later fundraising reporting.</p>
          </div>
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>
                  <SortLink
                    label="Name"
                    active={appealSort === "name"}
                    direction={appealDir}
                    href={buildSortHref({ appealSort: "name", appealDir: nextDirection(appealSort === "name", appealDir) })}
                  />
                </th>
                <th>
                  <SortLink
                    label="Code"
                    active={appealSort === "code"}
                    direction={appealDir}
                    href={buildSortHref({ appealSort: "code", appealDir: nextDirection(appealSort === "code", appealDir) })}
                  />
                </th>
                <th>
                  <SortLink
                    label="Archived"
                    active={appealSort === "archived"}
                    direction={appealDir}
                    href={buildSortHref({ appealSort: "archived", appealDir: nextDirection(appealSort === "archived", appealDir) })}
                  />
                </th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {sortedAppeals.map((appeal: ManagedAppealRow) => {
                const formId = `appeal-${appeal.id}`;

                return (
                  <tr key={appeal.id}>
                    <td>
                      <input name="name" form={formId} defaultValue={appeal.name} />
                    </td>
                    <td>
                      <input name="code" form={formId} defaultValue={appeal.code ?? ""} />
                    </td>
                    <td>
                      <label className="checkbox-line">
                        <input type="checkbox" name="archived" form={formId} defaultChecked={Boolean(appeal.archived_at)} />
                        Archived
                      </label>
                    </td>
                    <td>
                      <form id={formId} action={updateAppealAction}>
                        <input type="hidden" name="id" value={appeal.id} />
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
                  <form action={createAppealAction} className="form-grid">
                    <label>
                      New appeal name
                      <input name="name" required />
                    </label>
                    <label>
                      Code
                      <input name="code" />
                    </label>
                    <div>
                      <button type="submit">Add appeal</button>
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
                <th>
                  <SortLink
                    label="Name"
                    active={campaignSort === "name"}
                    direction={campaignDir}
                    href={buildSortHref({ campaignSort: "name", campaignDir: nextDirection(campaignSort === "name", campaignDir) })}
                  />
                </th>
                <th>
                  <SortLink
                    label="Code"
                    active={campaignSort === "code"}
                    direction={campaignDir}
                    href={buildSortHref({ campaignSort: "code", campaignDir: nextDirection(campaignSort === "code", campaignDir) })}
                  />
                </th>
                <th>
                  <SortLink
                    label="Starts"
                    active={campaignSort === "starts"}
                    direction={campaignDir}
                    href={buildSortHref({ campaignSort: "starts", campaignDir: nextDirection(campaignSort === "starts", campaignDir) })}
                  />
                </th>
                <th>
                  <SortLink
                    label="Ends"
                    active={campaignSort === "ends"}
                    direction={campaignDir}
                    href={buildSortHref({ campaignSort: "ends", campaignDir: nextDirection(campaignSort === "ends", campaignDir) })}
                  />
                </th>
                <th>
                  <SortLink
                    label="Archived"
                    active={campaignSort === "archived"}
                    direction={campaignDir}
                    href={buildSortHref({ campaignSort: "archived", campaignDir: nextDirection(campaignSort === "archived", campaignDir) })}
                  />
                </th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {sortedCampaigns.map((campaign: ManagedCampaignRow) => {
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
                  <th>
                    <SortLink
                      label="Internal value"
                      active={optionSort === "value"}
                      direction={optionDir}
                      href={buildSortHref({ optionSort: "value", optionDir: nextDirection(optionSort === "value", optionDir) })}
                    />
                  </th>
                  <th>
                    <SortLink
                      label="Display label"
                      active={optionSort === "label"}
                      direction={optionDir}
                      href={buildSortHref({ optionSort: "label", optionDir: nextDirection(optionSort === "label", optionDir) })}
                    />
                  </th>
                  <th>
                    Sort order
                  </th>
                  <th>
                    <SortLink
                      label="Active"
                      active={optionSort === "active"}
                      direction={optionDir}
                      href={buildSortHref({ optionSort: "active", optionDir: nextDirection(optionSort === "active", optionDir) })}
                    />
                  </th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {sortedOptionSets[setKey].map((option: ConfigLookupOption) => {
                  const formId = `${setKey}-${option.id}`;

                  return (
                    <tr key={option.id}>
                      <td>{option.value}</td>
                      <td>
                        <input name="label" form={formId} defaultValue={option.label} />
                      </td>
                      <td>
                        <div className="config-order-cell">
                          <input name="sortOrder" form={formId} type="number" defaultValue={option.sort_order} />
                          <div className="button-row">
                            <form action={reorderFieldOptionAction}>
                              <input type="hidden" name="id" value={option.id} />
                              <input type="hidden" name="direction" value="up" />
                              <button type="submit" className="secondary config-arrow-button" aria-label={`Move ${option.label} up`}>
                                ↑
                              </button>
                            </form>
                            <form action={reorderFieldOptionAction}>
                              <input type="hidden" name="id" value={option.id} />
                              <input type="hidden" name="direction" value="down" />
                              <button type="submit" className="secondary config-arrow-button" aria-label={`Move ${option.label} down`}>
                                ↓
                              </button>
                            </form>
                          </div>
                        </div>
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
