"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

import { AUTH_COOKIE } from "@/server/auth/constants";
import { createSessionToken } from "@/server/auth/session";
import { env } from "@/server/env";
import { query } from "@/server/db";
import { verifyPassword } from "@/server/auth/passwords";
import { assertSameOrigin } from "@/server/security/csrf";
import { assertRateLimit, recordRateLimitEvent } from "@/server/security/rate-limit";
import { writeAuditLog } from "@/server/audit";

export async function loginAction(formData: FormData) {
  await assertSameOrigin();

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const requestHeaders = await headers();
  const ipAddress = requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;

  await assertRateLimit({
    key: `auth:${email || ipAddress || "unknown"}`,
    action: "login",
    maxAttempts: env.RATE_LIMIT_MAX_AUTH_ATTEMPTS,
    windowSeconds: env.RATE_LIMIT_WINDOW_SECONDS
  });
  await recordRateLimitEvent({ key: `auth:${email || ipAddress || "unknown"}`, action: "login" });

  const result = await query<{
    id: string;
    email: string;
    password_hash: string;
    role: "admin" | "staff" | "read_only";
    status: string;
  }>(
    `select id::text, email, password_hash, role, status
     from users
     where email = $1`,
    [email]
  );

  const user = result.rows[0];
  if (!user || user.status !== "active" || !verifyPassword(password, user.password_hash)) {
    await writeAuditLog({
      actorUserId: user?.id ?? null,
      action: "auth.login",
      entityType: "user",
      entityId: user?.id ?? null,
      status: "failed",
      ipAddress,
      metadata: { email }
    });
    return { error: "Invalid credentials." };
  }

  const token = await createSessionToken({
    userId: user.id,
    email: user.email,
    role: user.role
  });

  const cookieStore = await cookies();
  cookieStore.set(AUTH_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: true,
    path: "/",
    maxAge: 60 * 60 * 12
  });

  await writeAuditLog({
    actorUserId: user.id,
    action: "auth.login",
    entityType: "user",
    entityId: user.id,
    status: "success",
    ipAddress
  });

  redirect("/dashboard");
}

export async function logoutAction() {
  const cookieStore = await cookies();
  cookieStore.delete(AUTH_COOKIE);
  redirect("/login");
}
