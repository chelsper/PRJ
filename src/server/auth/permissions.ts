import { redirect } from "next/navigation";
import { headers } from "next/headers";

import { writeAuditLog } from "@/server/audit";
import { getCurrentSession } from "@/server/auth/session-store";
import { roleHasCapability, type Capability } from "@/server/auth/roles";

export async function requireCapability(capability: Capability) {
  const session = await getCurrentSession();
  const requestHeaders = await headers();
  const ipAddress = requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;

  if (!session) {
    await writeAuditLog({
      actorUserId: null,
      action: "auth.required",
      entityType: "permission",
      entityId: capability,
      status: "denied",
      ipAddress,
      metadata: { capability }
    });
    redirect("/login");
  }

  if (!roleHasCapability(session.role, capability)) {
    await writeAuditLog({
      actorUserId: session.userId,
      action: "permission.denied",
      entityType: "permission",
      entityId: capability,
      status: "denied",
      ipAddress,
      metadata: { capability, role: session.role }
    });
    redirect("/dashboard?denied=1");
  }

  return session;
}

export async function getSessionWithCapability(capability: Capability) {
  const session = await getCurrentSession();

  if (!session) {
    return null;
  }

  if (!roleHasCapability(session.role, capability)) {
    return null;
  }

  return session;
}
