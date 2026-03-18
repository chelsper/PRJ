import { createHash, randomBytes } from "crypto";

import { writeAuditLog } from "@/server/audit";
import type { Role } from "@/server/auth/roles";
import { hashPassword } from "@/server/auth/passwords";
import { query, transaction } from "@/server/db";
import { acceptInvitationSchema, adminCreateUserSchema, inviteUserSchema } from "@/server/validation/auth";

type Actor = { userId: string; ipAddress?: string | null };

export type UserRow = {
  id: string;
  email: string;
  role: Role;
  status: "active" | "disabled";
  last_login_at: string | null;
  created_at: string;
};

export type UserInvitationRow = {
  id: string;
  email: string;
  role: Role;
  expires_at: string;
  used_at: string | null;
  created_at: string;
  invited_by_email: string | null;
};

function hashInviteToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function countUsers() {
  const result = await query<{ count: string }>("select count(*)::text as count from public.users");
  return Number(result.rows[0]?.count ?? "0");
}

export async function listUsers(): Promise<UserRow[]> {
  const result = await query<UserRow>(
    `select
      id::text,
      email,
      role,
      status,
      last_login_at::text,
      created_at::text
     from public.users
     order by email asc`
  );

  return result.rows;
}

export async function listInvitations(): Promise<UserInvitationRow[]> {
  const result = await query<UserInvitationRow>(
    `select
      i.id::text,
      i.email,
      i.role,
      i.expires_at::text,
      i.used_at::text,
      i.created_at::text,
      u.email as invited_by_email
     from public.user_invitations i
     left join public.users u on u.id = i.invited_by
     order by i.created_at desc
     limit 50`
  );

  return result.rows;
}

export async function createInvitation(
  input: unknown,
  actor: Actor
): Promise<{ invitationId: string; email: string; role: Role; token: string; expiresAt: string }> {
  const values = inviteUserSchema.parse(input);
  const token = randomBytes(32).toString("hex");
  const tokenHash = hashInviteToken(token);

  const existingUser = await query<{ id: string }>(
    `select id::text
     from public.users
     where email = $1`,
    [values.email]
  );

  if (existingUser.rows[0]) {
    throw new Error("A user with that email already exists.");
  }

  const inserted = await query<{
    id: string;
    expires_at: string;
  }>(
    `insert into public.user_invitations (email, role, token_hash, expires_at, invited_by)
     values ($1, $2, $3, now() + interval '72 hours', $4)
     returning id::text, expires_at::text`,
    [values.email, values.role, tokenHash, actor.userId]
  );

  const row = inserted.rows[0];

  await writeAuditLog({
    actorUserId: actor.userId,
    action: "user.invite",
    entityType: "user_invitation",
    entityId: row.id,
    status: "success",
    ipAddress: actor.ipAddress,
    metadata: {
      email: values.email,
      role: values.role,
      expiresAt: row.expires_at
    }
  });

  return {
    invitationId: row.id,
    email: values.email,
    role: values.role,
    token,
    expiresAt: row.expires_at
  };
}

export async function createUserDirectly(
  input: unknown,
  actor: Actor
): Promise<{ userId: string; email: string; role: Role }> {
  const values = adminCreateUserSchema.parse(input);

  const existingUser = await query<{ id: string }>(
    `select id::text
     from public.users
     where email = $1`,
    [values.email]
  );

  if (existingUser.rows[0]) {
    throw new Error("A user with that email already exists.");
  }

  await query(
    `delete from public.user_invitations
     where email = $1
       and used_at is null`,
    [values.email]
  );

  const inserted = await query<{ id: string }>(
    `insert into public.users (email, password_hash, role, status)
     values ($1, $2, $3, 'active')
     returning id::text`,
    [values.email, hashPassword(values.password), values.role]
  );

  await writeAuditLog({
    actorUserId: actor.userId,
    action: "user.create.direct",
    entityType: "user",
    entityId: inserted.rows[0].id,
    status: "success",
    ipAddress: actor.ipAddress,
    metadata: {
      email: values.email,
      role: values.role
    }
  });

  return {
    userId: inserted.rows[0].id,
    email: values.email,
    role: values.role
  };
}

export async function regenerateInvitation(
  invitationId: string,
  actor: Actor
): Promise<{ invitationId: string; email: string; role: Role; token: string; expiresAt: string }> {
  const existingInvitation = await query<{
    id: string;
    email: string;
    role: Role;
    used_at: string | null;
  }>(
    `select id::text, email, role, used_at::text
     from public.user_invitations
     where id = $1`,
    [Number(invitationId)]
  );

  const invitation = existingInvitation.rows[0];

  if (!invitation) {
    throw new Error("Invitation not found.");
  }

  if (invitation.used_at) {
    throw new Error("Accepted invitations cannot be regenerated.");
  }

  const existingUser = await query<{ id: string }>(
    `select id::text
     from public.users
     where email = $1`,
    [invitation.email]
  );

  if (existingUser.rows[0]) {
    throw new Error("A user with that email already exists.");
  }

  const token = randomBytes(32).toString("hex");
  const tokenHash = hashInviteToken(token);

  const updated = await query<{ expires_at: string }>(
    `update public.user_invitations
     set token_hash = $2,
         expires_at = now() + interval '72 hours',
         invited_by = $3
     where id = $1
     returning expires_at::text`,
    [Number(invitationId), tokenHash, actor.userId]
  );

  await writeAuditLog({
    actorUserId: actor.userId,
    action: "user.invite.regenerate",
    entityType: "user_invitation",
    entityId: invitationId,
    status: "success",
    ipAddress: actor.ipAddress,
    metadata: {
      email: invitation.email,
      role: invitation.role,
      expiresAt: updated.rows[0]?.expires_at ?? null
    }
  });

  return {
    invitationId,
    email: invitation.email,
    role: invitation.role,
    token,
    expiresAt: updated.rows[0].expires_at
  };
}

export async function getInvitationByToken(token: string): Promise<{
  id: string;
  email: string;
  role: Role;
  expires_at: string;
  used_at: string | null;
} | null> {
  const tokenHash = hashInviteToken(token);
  const result = await query<{
    id: string;
    email: string;
    role: Role;
    expires_at: string;
    used_at: string | null;
  }>(
    `select id::text, email, role, expires_at::text, used_at::text
     from public.user_invitations
     where token_hash = $1`,
    [tokenHash]
  );

  return result.rows[0] ?? null;
}

export async function acceptInvitation(
  input: unknown,
  actor: { ipAddress?: string | null }
): Promise<{ userId: string; email: string; role: Role }> {
  const values = acceptInvitationSchema.parse(input);
  const tokenHash = hashInviteToken(values.token);

  return transaction(async (client) => {
    const invitationResult = await client.query<{
      id: string;
      email: string;
      role: Role;
      expires_at: string;
      used_at: string | null;
    }>(
      `select id::text, email, role, expires_at::text, used_at::text
       from public.user_invitations
       where token_hash = $1
       limit 1`,
      [tokenHash]
    );

    const invitation = invitationResult.rows[0];

    if (!invitation || invitation.used_at || new Date(invitation.expires_at).getTime() < Date.now()) {
      throw new Error("This invitation is invalid or expired.");
    }

    const existingUser = await client.query<{ id: string }>(
      `select id::text
       from public.users
       where email = $1`,
      [invitation.email]
    );

    if (existingUser.rows[0]) {
      throw new Error("That email is already registered.");
    }

    const insertedUser = await client.query<{ id: string }>(
      `insert into public.users (email, password_hash, role, status, last_login_at)
       values ($1, $2, $3, 'active', now())
       returning id::text`,
      [invitation.email, hashPassword(values.password), invitation.role]
    );

    const userId = insertedUser.rows[0].id;

    await client.query(
      `update public.user_invitations
       set used_at = now(),
           accepted_by = $2
       where id = $1`,
      [Number(invitation.id), Number(userId)]
    );

    await client.query(
      `insert into public.audit_log (actor_user_id, action, entity_type, entity_id, status, ip_address, metadata)
       values ($1, 'user.invite.accept', 'user', $1, 'success', $2, $3::jsonb)`,
      [userId, actor.ipAddress ?? null, JSON.stringify({ invitationId: invitation.id, role: invitation.role })]
    );

    return {
      userId,
      email: invitation.email,
      role: invitation.role
    };
  });
}

export async function updateUserAccess(
  userId: string,
  input: { role: Role; status: "active" | "disabled" },
  actor: Actor
) {
  const before = await query<{ role: Role; status: "active" | "disabled" }>(
    `select role, status
     from public.users
     where id = $1`,
    [Number(userId)]
  );

  const previous = before.rows[0];

  if (!previous) {
    throw new Error("User not found.");
  }

  const removingActiveAdmin =
    previous.role === "admin" &&
    previous.status === "active" &&
    (input.role !== "admin" || input.status !== "active");

  if (removingActiveAdmin) {
    const adminCount = await query<{ count: string }>(
      `select count(*)::text as count
       from public.users
       where role = 'admin'
         and status = 'active'`
    );

    if (Number(adminCount.rows[0]?.count ?? "0") <= 1) {
      throw new Error("At least one active admin is required.");
    }
  }

  await query(
    `update public.users
     set role = $2,
         status = $3,
         updated_at = now()
     where id = $1`,
    [Number(userId), input.role, input.status]
  );

  await writeAuditLog({
    actorUserId: actor.userId,
    action: "user.update",
    entityType: "user",
    entityId: userId,
    status: "success",
    ipAddress: actor.ipAddress,
    metadata: {
      before: previous,
      after: input
    }
  });
}
