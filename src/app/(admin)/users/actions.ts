"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { requireCapability } from "@/server/auth/permissions";
import { roles, type Role } from "@/server/auth/roles";
import { createInvitation, createUserDirectly, regenerateInvitation, updateUserAccess } from "@/server/data/users";
import { assertSameOrigin } from "@/server/security/csrf";
import { assertRateLimit, recordRateLimitEvent } from "@/server/security/rate-limit";
import { env } from "@/server/env";
import { writeAuditLog } from "@/server/audit";

export async function createInvitationAction(formData: FormData) {
  await assertSameOrigin();
  const session = await requireCapability("users:manage");
  const requestHeaders = await headers();
  const ipAddress = requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const role = String(formData.get("role") ?? "") as Role;
  const key = `invite:${session.userId}`;

  await assertRateLimit({
    key,
    action: "user_invite",
    maxAttempts: env.RATE_LIMIT_MAX_INVITES,
    windowSeconds: env.RATE_LIMIT_WINDOW_SECONDS
  });
  await recordRateLimitEvent({ key, action: "user_invite" });

  let invitation: Awaited<ReturnType<typeof createInvitation>>;

  try {
    invitation = await createInvitation(
      { email, role },
      { userId: session.userId, ipAddress }
    );
  } catch (error) {
    await writeAuditLog({
      actorUserId: session.userId,
      action: "user.invite",
      entityType: "user_invitation",
      entityId: null,
      status: "failed",
      ipAddress,
      metadata: { email, role, error: error instanceof Error ? error.message : "Unknown error" }
    });
    redirect("/admin/users?error=invite_failed");
  }

  redirect(
    `/admin/users?invite_token=${encodeURIComponent(invitation.token)}&invite_email=${encodeURIComponent(invitation.email)}&invite_role=${encodeURIComponent(invitation.role)}`
  );
}

export async function createDirectUserAction(formData: FormData) {
  await assertSameOrigin();
  const session = await requireCapability("users:manage");
  const requestHeaders = await headers();
  const ipAddress = requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const role = String(formData.get("role") ?? "") as Role;
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  try {
    await createUserDirectly(
      { email, role, password, confirmPassword },
      { userId: session.userId, ipAddress }
    );
  } catch (error) {
    await writeAuditLog({
      actorUserId: session.userId,
      action: "user.create.direct",
      entityType: "user",
      entityId: null,
      status: "failed",
      ipAddress,
      metadata: { email, role, error: error instanceof Error ? error.message : "Unknown error" }
    });

    let errorCode = "direct_user_failed";
    if (error instanceof Error && error.message.includes("already exists")) {
      errorCode = "direct_user_exists";
    }

    redirect(`/admin/users?error=${encodeURIComponent(errorCode)}`);
  }

  redirect(`/admin/users?created_email=${encodeURIComponent(email)}&created_role=${encodeURIComponent(role)}`);
}

export async function updateUserAction(formData: FormData) {
  await assertSameOrigin();
  const session = await requireCapability("users:manage");
  const requestHeaders = await headers();
  const ipAddress = requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;

  const userId = String(formData.get("userId") ?? "");
  const role = String(formData.get("role") ?? "") as Role;
  const status = String(formData.get("status") ?? "") as "active" | "disabled";

  if (!roles.includes(role) || (status !== "active" && status !== "disabled")) {
    redirect("/admin/users?error=user_update_failed");
  }

  try {
    await updateUserAccess(userId, { role, status }, { userId: session.userId, ipAddress });
  } catch {
    redirect("/admin/users?error=user_update_failed");
  }

  redirect("/admin/users");
}

export async function regenerateInvitationAction(formData: FormData) {
  await assertSameOrigin();
  const session = await requireCapability("users:manage");
  const requestHeaders = await headers();
  const ipAddress = requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  const invitationId = String(formData.get("invitationId") ?? "");
  const key = `invite:${session.userId}`;

  await assertRateLimit({
    key,
    action: "user_invite",
    maxAttempts: env.RATE_LIMIT_MAX_INVITES,
    windowSeconds: env.RATE_LIMIT_WINDOW_SECONDS
  });
  await recordRateLimitEvent({ key, action: "user_invite" });

  let invitation: Awaited<ReturnType<typeof regenerateInvitation>>;

  try {
    invitation = await regenerateInvitation(invitationId, {
      userId: session.userId,
      ipAddress
    });
  } catch (error) {
    await writeAuditLog({
      actorUserId: session.userId,
      action: "user.invite.regenerate",
      entityType: "user_invitation",
      entityId: invitationId || null,
      status: "failed",
      ipAddress,
      metadata: { invitationId, error: error instanceof Error ? error.message : "Unknown error" }
    });
    redirect("/admin/users?error=invite_failed");
  }

  redirect(
    `/admin/users?invite_token=${encodeURIComponent(invitation.token)}&invite_email=${encodeURIComponent(invitation.email)}&invite_role=${encodeURIComponent(invitation.role)}`
  );
}
