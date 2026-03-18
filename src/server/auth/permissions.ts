import { redirect } from "next/navigation";

import { getCurrentSession } from "@/server/auth/session-store";
import { roleHasCapability, type Capability } from "@/server/auth/roles";

export async function requireCapability(capability: Capability) {
  const session = await getCurrentSession();

  if (!session) {
    redirect("/login");
  }

  if (!roleHasCapability(session.role, capability)) {
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
