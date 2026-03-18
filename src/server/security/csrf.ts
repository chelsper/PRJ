import { headers } from "next/headers";

import { env } from "@/server/env";

export async function assertSameOrigin() {
  const requestHeaders = await headers();
  const origin = requestHeaders.get("origin");
  const host = requestHeaders.get("host");

  if (!origin || !host) {
    return;
  }

  const allowed = new URL(env.APP_URL);
  const incoming = new URL(origin);

  if (incoming.host !== host || incoming.host !== allowed.host) {
    throw new Error("CSRF validation failed.");
  }
}
