"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { ZodError } from "zod";

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
    const params = new URLSearchParams({ token });

    if (error instanceof ZodError) {
      const confirmPasswordIssue = error.issues.find((issue) => issue.path.includes("confirmPassword"));
      const passwordIssue = error.issues.find((issue) => issue.path.includes("password"));

      if (confirmPasswordIssue) {
        params.set("error", "password_mismatch");
      } else if (passwordIssue) {
        params.set("error", "password_too_short");
      } else {
        params.set("error", "validation");
      }
    } else if (error instanceof Error) {
      if (error.message.includes("already registered")) {
        params.set("error", "already_registered");
      } else if (error.message.includes("invalid or expired")) {
        params.set("error", "invalid");
      } else {
        params.set("error", "setup_failed");
      }
    } else {
      params.set("error", "setup_failed");
    }

    await writeAuditLog({
      actorUserId: null,
      action: "user.invite.accept",
      entityType: "user_invitation",
      entityId: null,
      status: "failed",
      ipAddress,
      metadata: {
        error: error instanceof Error ? error.message : "Unknown error",
        tokenPresent: Boolean(token)
      }
    });
    redirect(`/invite?${params.toString()}`);
  }

  await establishSession(user);
  redirect("/dashboard");
}
