"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { requireCapability } from "@/server/auth/permissions";
import { roles, type Role } from "@/server/auth/roles";
import { createInvitation, updateUserAccess } from "@/server/data/users";
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

  try {
    const invitation = await createInvitation(
      { email, role },
      { userId: session.userId, ipAddress }
    );

    redirect(
      `/users?invite_token=${encodeURIComponent(invitation.token)}&invite_email=${encodeURIComponent(invitation.email)}&invite_role=${encodeURIComponent(invitation.role)}`
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
    redirect("/users?error=invite_failed");
  }
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
    redirect("/users?error=user_update_failed");
  }

  try {
    await updateUserAccess(userId, { role, status }, { userId: session.userId, ipAddress });
  } catch {
    redirect("/users?error=user_update_failed");
  }

  redirect("/users");
}
