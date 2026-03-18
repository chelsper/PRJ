import { query } from "@/src/server/db";

export async function listFunds() {
  const result = await query<{ id: string; name: string }>(
    `select id::text, name
     from funds
     where archived_at is null
     order by name asc`
  );

  return result.rows;
}

export async function listCampaigns() {
  const result = await query<{ id: string; name: string }>(
    `select id::text, name
     from campaigns
     where archived_at is null
     order by name asc`
  );

  return result.rows;
}
