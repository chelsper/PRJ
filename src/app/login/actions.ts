"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

import { AUTH_COOKIE } from "@/server/auth/constants";
import { createSessionToken } from "@/server/auth/session";
import { env } from "@/server/env";
import { query } from "@/server/db";
import { getCurrentSession } from "@/server/auth/session-store";
import { hashPassword, verifyPassword } from "@/server/auth/passwords";
import { countUsers } from "@/server/data/users";
import { assertSameOrigin } from "@/server/security/csrf";
import { assertRateLimit, recordRateLimitEvent } from "@/server/security/rate-limit";
import { writeAuditLog } from "@/server/audit";
import { signUpSchema } from "@/server/validation/auth";
import type { Role } from "@/server/auth/roles";

async function establishSession(input: { userId: string; email: string; role: Role }) {
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
     from public.users
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
    redirect("/login?error=invalid");
  }

  await establishSession({
    userId: user.id,
    email: user.email,
    role: user.role
  });

  await query(
    `update public.users
     set last_login_at = now(),
         updated_at = now()
     where id = $1`,
    [Number(user.id)]
  );

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

export async function signUpAction(formData: FormData) {
  await assertSameOrigin();

  const existingUsers = await countUsers();

  if (existingUsers > 0) {
    await writeAuditLog({
      actorUserId: null,
      action: "auth.bootstrap_signup",
      entityType: "user",
      entityId: null,
      status: "denied",
      metadata: { reason: "bootstrap_closed" }
    });
    redirect("/login?error=invite_required");
  }

  const values = signUpSchema.parse({
    email: String(formData.get("email") ?? "").trim().toLowerCase(),
    password: String(formData.get("password") ?? ""),
    confirmPassword: String(formData.get("confirmPassword") ?? "")
  });

  const requestHeaders = await headers();
  const ipAddress = requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;

  await assertRateLimit({
    key: `signup:${values.email || ipAddress || "unknown"}`,
    action: "signup",
    maxAttempts: env.RATE_LIMIT_MAX_AUTH_ATTEMPTS,
    windowSeconds: env.RATE_LIMIT_WINDOW_SECONDS
  });
  await recordRateLimitEvent({ key: `signup:${values.email || ipAddress || "unknown"}`, action: "signup" });

  const existingUserResult = await query<{ id: string }>(
    `select id::text
     from public.users
     where email = $1`,
    [values.email]
  );

  if (existingUserResult.rows[0]) {
    await writeAuditLog({
      actorUserId: null,
      action: "auth.signup",
      entityType: "user",
      entityId: null,
      status: "failed",
      ipAddress,
      metadata: { email: values.email, reason: "email_exists" }
    });
    redirect("/signup?error=exists");
  }

  const role: Role = "admin";

  const inserted = await query<{ id: string }>(
    `insert into public.users (email, password_hash, role, status, last_login_at)
     values ($1, $2, $3, 'active', now())
     returning id::text`,
    [values.email, hashPassword(values.password), role]
  );

  const userId = inserted.rows[0].id;

  await writeAuditLog({
    actorUserId: userId,
    action: "auth.signup",
    entityType: "user",
    entityId: userId,
    status: "success",
    ipAddress,
    metadata: { role }
  });

  await establishSession({
    userId,
    email: values.email,
    role
  });

  redirect("/dashboard");
}

export async function logoutAction() {
  const session = await getCurrentSession();
  const requestHeaders = await headers();
  const ipAddress = requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;

  if (session) {
    await writeAuditLog({
      actorUserId: session.userId,
      action: "auth.logout",
      entityType: "user",
      entityId: session.userId,
      status: "success",
      ipAddress
    });
  }

  const cookieStore = await cookies();
  cookieStore.delete(AUTH_COOKIE);
  redirect("/login");
}
