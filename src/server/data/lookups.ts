import { query } from "@/server/db";

export type LookupRow = { id: string; name: string };

export async function listFunds(): Promise<LookupRow[]> {
  const result = await query<LookupRow>(
    `select id::text, name
     from public.funds
     where archived_at is null
     order by name asc`
  );

  return result.rows;
}

export async function listCampaigns(): Promise<LookupRow[]> {
  const result = await query<LookupRow>(
    `select id::text, name
     from public.campaigns
     where archived_at is null
     order by name asc`
  );

  return result.rows;
}

export async function listAppeals(): Promise<LookupRow[]> {
  const result = await query<LookupRow>(
    `select id::text, name
     from public.appeals
     where archived_at is null
     order by name asc`
  );

  return result.rows;
}
