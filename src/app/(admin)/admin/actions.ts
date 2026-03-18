"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { requireCapability } from "@/server/auth/permissions";
import { assertSameOrigin } from "@/server/security/csrf";
import { query } from "@/server/db";
import { writeAuditLog } from "@/server/audit";
import { managedOptionSets, type ManagedOptionSetKey } from "@/server/data/configurations";

function adminRedirect(path = "/admin/configurations") {
  revalidatePath("/admin/configurations");
  revalidatePath("/gifts");
  revalidatePath("/donors");
  redirect(path);
}

function isManagedSetKey(value: string): value is ManagedOptionSetKey {
  return managedOptionSets.includes(value as ManagedOptionSetKey);
}

export async function createFundAction(formData: FormData) {
  await assertSameOrigin();
  const session = await requireCapability("users:manage");
  const requestHeaders = await headers();
  const ipAddress = requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;

  const name = String(formData.get("name") ?? "").trim();
  const code = String(formData.get("code") ?? "").trim() || null;

  if (!name) {
    adminRedirect("/admin/configurations?error=fund_name");
  }

  await query(
    `insert into public.funds (name, code)
     values ($1, $2)`,
    [name, code]
  );

  await writeAuditLog({
    actorUserId: session.userId,
    action: "config.fund.create",
    entityType: "fund",
    entityId: null,
    status: "success",
    ipAddress,
    metadata: { name, code }
  });

  adminRedirect();
}

export async function updateFundAction(formData: FormData) {
  await assertSameOrigin();
  const session = await requireCapability("users:manage");
  const requestHeaders = await headers();
  const ipAddress = requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;

  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const code = String(formData.get("code") ?? "").trim() || null;
  const archived = formData.get("archived") === "on";

  await query(
    `update public.funds
     set name = $2,
         code = $3,
         archived_at = case when $4::boolean then coalesce(archived_at, now()) else null end
     where id = $1`,
    [Number(id), name, code, archived]
  );

  await writeAuditLog({
    actorUserId: session.userId,
    action: "config.fund.update",
    entityType: "fund",
    entityId: id,
    status: "success",
    ipAddress,
    metadata: { name, code, archived }
  });

  adminRedirect();
}

export async function createCampaignAction(formData: FormData) {
  await assertSameOrigin();
  const session = await requireCapability("users:manage");
  const requestHeaders = await headers();
  const ipAddress = requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;

  const name = String(formData.get("name") ?? "").trim();
  const code = String(formData.get("code") ?? "").trim() || null;
  const startsOn = String(formData.get("startsOn") ?? "").trim() || null;
  const endsOn = String(formData.get("endsOn") ?? "").trim() || null;

  if (!name) {
    adminRedirect("/admin/configurations?error=campaign_name");
  }

  await query(
    `insert into public.campaigns (name, code, starts_on, ends_on)
     values ($1, $2, $3, $4)`,
    [name, code, startsOn, endsOn]
  );

  await writeAuditLog({
    actorUserId: session.userId,
    action: "config.campaign.create",
    entityType: "campaign",
    entityId: null,
    status: "success",
    ipAddress,
    metadata: { name, code, startsOn, endsOn }
  });

  adminRedirect();
}

export async function updateCampaignAction(formData: FormData) {
  await assertSameOrigin();
  const session = await requireCapability("users:manage");
  const requestHeaders = await headers();
  const ipAddress = requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;

  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const code = String(formData.get("code") ?? "").trim() || null;
  const startsOn = String(formData.get("startsOn") ?? "").trim() || null;
  const endsOn = String(formData.get("endsOn") ?? "").trim() || null;
  const archived = formData.get("archived") === "on";

  await query(
    `update public.campaigns
     set name = $2,
         code = $3,
         starts_on = $4,
         ends_on = $5,
         archived_at = case when $6::boolean then coalesce(archived_at, now()) else null end
     where id = $1`,
    [Number(id), name, code, startsOn, endsOn, archived]
  );

  await writeAuditLog({
    actorUserId: session.userId,
    action: "config.campaign.update",
    entityType: "campaign",
    entityId: id,
    status: "success",
    ipAddress,
    metadata: { name, code, startsOn, endsOn, archived }
  });

  adminRedirect();
}

export async function createFieldOptionAction(formData: FormData) {
  await assertSameOrigin();
  const session = await requireCapability("users:manage");
  const requestHeaders = await headers();
  const ipAddress = requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;

  const setKey = String(formData.get("setKey") ?? "");
  const value = String(formData.get("value") ?? "").trim();
  const label = String(formData.get("label") ?? "").trim();
  const sortOrder = Number(String(formData.get("sortOrder") ?? "100"));

  if (!isManagedSetKey(setKey) || !value || !label) {
    adminRedirect("/admin/configurations?error=field_option");
  }

  await query(
    `insert into public.field_options (set_key, value, label, sort_order, is_active)
     values ($1, $2, $3, $4, true)`,
    [setKey, value, label, Number.isFinite(sortOrder) ? sortOrder : 100]
  );

  await writeAuditLog({
    actorUserId: session.userId,
    action: "config.field_option.create",
    entityType: "field_option",
    entityId: null,
    status: "success",
    ipAddress,
    metadata: { setKey, value, label, sortOrder }
  });

  adminRedirect();
}

export async function updateFieldOptionAction(formData: FormData) {
  await assertSameOrigin();
  const session = await requireCapability("users:manage");
  const requestHeaders = await headers();
  const ipAddress = requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;

  const id = String(formData.get("id") ?? "");
  const label = String(formData.get("label") ?? "").trim();
  const sortOrder = Number(String(formData.get("sortOrder") ?? "100"));
  const isActive = formData.get("isActive") === "on";

  await query(
    `update public.field_options
     set label = $2,
         sort_order = $3,
         is_active = $4
     where id = $1`,
    [Number(id), label, Number.isFinite(sortOrder) ? sortOrder : 100, isActive]
  );

  await writeAuditLog({
    actorUserId: session.userId,
    action: "config.field_option.update",
    entityType: "field_option",
    entityId: id,
    status: "success",
    ipAddress,
    metadata: { label, sortOrder, isActive }
  });

  adminRedirect();
}
