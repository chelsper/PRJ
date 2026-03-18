"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { acceptInvitation } from "@/server/data/users";
import { assertSameOrigin } from "@/server/security/csrf";
import { assertRateLimit, recordRateLimitEvent } from "@/server/security/rate-limit";
import { env } from "@/server/env";
import { writeAuditLog } from "@/server/audit";
import { createSessionToken } from "@/server/auth/session";
import { AUTH_COOKIE } from "@/server/auth/constants";
import { cookies } from "next/headers";

async function establishSession(input: { userId: string; email: string; role: "admin" | "staff" | "read_only" }) {
  const token = await createSessionToken(input);
  const cookieStore = await cookies();
  cookieStore.set(AUTH_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: true,
    path: "/",
    maxAge: 60 * 60 * 12
  });
}

export async function acceptInvitationAction(formData: FormData) {
  await assertSameOrigin();
  const requestHeaders = await headers();
  const ipAddress = requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  const token = String(formData.get("token") ?? "");
  const key = `invite_accept:${ipAddress || "unknown"}`;

  await assertRateLimit({
    key,
    action: "invite_accept",
    maxAttempts: env.RATE_LIMIT_MAX_AUTH_ATTEMPTS,
    windowSeconds: env.RATE_LIMIT_WINDOW_SECONDS
  });
  await recordRateLimitEvent({ key, action: "invite_accept" });

  let user: Awaited<ReturnType<typeof acceptInvitation>>;

  try {
    user = await acceptInvitation(
      {
        token,
        password: String(formData.get("password") ?? ""),
        confirmPassword: String(formData.get("confirmPassword") ?? "")
      },
      { ipAddress }
    );
  } catch (error) {
    await writeAuditLog({
      actorUserId: null,
      action: "user.invite.accept",
      entityType: "user_invitation",
      entityId: null,
      status: "failed",
      ipAddress,
      metadata: { error: error instanceof Error ? error.message : "Unknown error" }
    });
    redirect(`/invite?token=${encodeURIComponent(token)}&error=invalid`);
  }

  await establishSession(user);
  redirect("/dashboard");
}
