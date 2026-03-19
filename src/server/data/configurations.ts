import { query } from "@/server/db";

export type ConfigLookupOption = {
  id: string;
  set_key: string;
  value: string;
  label: string;
  sort_order: number;
  is_active: boolean;
};

export type ManagedFundRow = {
  id: string;
  name: string;
  code: string | null;
  archived_at: string | null;
};

export type ManagedCampaignRow = {
  id: string;
  name: string;
  code: string | null;
  starts_on: string | null;
  ends_on: string | null;
  archived_at: string | null;
};

export type ManagedAppealRow = {
  id: string;
  name: string;
  code: string | null;
  archived_at: string | null;
};

export const managedOptionSets = [
  "titles",
  "genders",
  "email_types",
  "address_types",
  "states",
  "note_categories",
  "donor_relationship_types",
  "organization_contact_types"
] as const;

export type ManagedOptionSetKey = (typeof managedOptionSets)[number];

export async function listConfigOptions(setKey: ManagedOptionSetKey, includeInactive = false): Promise<ConfigLookupOption[]> {
  const result = await query<{
    id: string;
    set_key: string;
    value: string;
    label: string;
    sort_order: string;
    is_active: boolean;
  }>(
    `select
      id::text,
      set_key,
      value,
      label,
      sort_order::text,
      is_active
     from public.field_options
     where set_key = $1
       and ($2::boolean = true or is_active = true)
     order by sort_order asc, label asc`,
    [setKey, includeInactive]
  );

  return result.rows.map((row) => ({
    id: row.id,
    set_key: row.set_key,
    value: row.value,
    label: row.label,
    sort_order: Number(row.sort_order),
    is_active: row.is_active
  }));
}

export async function listConfigOptionsBySet(includeInactive = false): Promise<Record<ManagedOptionSetKey, ConfigLookupOption[]>> {
  const optionLists = await Promise.all(managedOptionSets.map((setKey) => listConfigOptions(setKey, includeInactive)));

  return managedOptionSets.reduce(
    (accumulator, setKey, index) => {
      accumulator[setKey] = optionLists[index];
      return accumulator;
    },
    {} as Record<ManagedOptionSetKey, ConfigLookupOption[]>
  );
}

export async function listManagedFunds(): Promise<ManagedFundRow[]> {
  const result = await query<ManagedFundRow>(
    `select
      id::text,
      name,
      code,
      archived_at::text
     from public.funds
     order by archived_at asc nulls first, name asc`
  );

  return result.rows;
}

export async function listManagedCampaigns(): Promise<ManagedCampaignRow[]> {
  const result = await query<ManagedCampaignRow>(
    `select
      id::text,
      name,
      code,
      starts_on::text,
      ends_on::text,
      archived_at::text
     from public.campaigns
     order by archived_at asc nulls first, name asc`
  );

  return result.rows;
}

export async function listManagedAppeals(): Promise<ManagedAppealRow[]> {
  const result = await query<ManagedAppealRow>(
    `select
      id::text,
      name,
      code,
      archived_at::text
     from public.appeals
     order by archived_at asc nulls first, name asc`
  );

  return result.rows;
}
