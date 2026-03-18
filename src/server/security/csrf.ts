import { headers } from "next/headers";

import { env } from "@/server/env";

export async function assertSameOrigin() {
  const requestHeaders = await headers();
  const origin = requestHeaders.get("origin");
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  const proto = requestHeaders.get("x-forwarded-proto") ?? "https";

  if (!origin || !host) {
    return;
  }

  const configuredAppUrl = new URL(env.APP_URL);
  const incoming = new URL(origin);
  const forwardedUrl = new URL(`${proto}://${host}`);

  const allowedOrigins = new Set<string>([
    configuredAppUrl.origin,
    forwardedUrl.origin
  ]);

  if (!allowedOrigins.has(incoming.origin)) {
    throw new Error("CSRF validation failed.");
  }
}
