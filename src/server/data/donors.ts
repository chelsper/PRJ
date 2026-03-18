import { query, transaction } from "@/server/db";
import { writeAuditLog } from "@/server/audit";
import { donorInputSchema } from "@/server/validation/donors";

type Actor = { userId: string; ipAddress?: string | null };

export type DonorListRow = {
  id: string;
  donor_type: "INDIVIDUAL" | "ORGANIZATION";
  first_name: string | null;
  last_name: string | null;
  organization_name: string | null;
  primary_email: string | null;
  lifetime_giving_cents: string | null;
};

export async function listDonors(search?: string): Promise<DonorListRow[]> {
  const result = await query<DonorListRow>(
    `select
      d.id::text,
      d.donor_type,
      d.first_name,
      d.last_name,
      d.organization_name,
      d.primary_email,
      coalesce(sum(g.amount_cents), 0)::text as lifetime_giving_cents
    from donors d
    left join gifts g on g.donor_id = d.id and g.deleted_at is null
    where d.deleted_at is null
      and (
        $1::text is null
        or concat_ws(' ', d.first_name, d.last_name, d.organization_name) ilike '%' || $1 || '%'
      )
    group by d.id
    order by d.last_name nulls last, d.organization_name nulls last
    limit 100`,
    [search ?? null]
  );

  return result.rows;
}

export async function createDonor(input: unknown, actor: Actor) {
  const values = donorInputSchema.parse(input);

  return transaction(async (client) => {
    const inserted = await client.query<{ id: string }>(
      `insert into donors (
        donor_type,
        first_name,
        last_name,
        organization_name,
        primary_email,
        primary_phone,
        notes,
        created_by,
        updated_by
      ) values ($1, $2, $3, $4, $5, $6, $7, $8, $8)
      returning id::text`,
      [
        values.donorType,
        values.firstName ?? null,
        values.lastName ?? null,
        values.organizationName ?? null,
        values.primaryEmail ?? null,
        values.primaryPhone ?? null,
        values.notes ?? null,
        actor.userId
      ]
    );

    const donorId = inserted.rows[0].id;

    await client.query(
      `insert into audit_log (actor_user_id, action, entity_type, entity_id, status, ip_address, metadata)
       values ($1, 'donor.create', 'donor', $2, 'success', $3, $4::jsonb)`,
      [actor.userId, donorId, actor.ipAddress ?? null, JSON.stringify({ donorType: values.donorType })]
    );

    return donorId;
  });
}

export async function softDeleteDonor(donorId: string, actor: Actor) {
  await query(
    `update donors
     set deleted_at = now(),
         updated_at = now(),
         updated_by = $2
     where id = $1 and deleted_at is null`,
    [donorId, actor.userId]
  );

  await writeAuditLog({
    actorUserId: actor.userId,
    action: "donor.delete",
    entityType: "donor",
    entityId: donorId,
    status: "success",
    ipAddress: actor.ipAddress ?? null
  });
}
