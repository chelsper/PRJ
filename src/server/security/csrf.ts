import { headers } from "next/headers";

import { env } from "@/server/env";

export async function assertSameOrigin() {
  const requestHeaders = await headers();
  const origin = requestHeaders.get("origin");
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");

  if (!origin || !host) {
    throw new Error("CSRF validation failed.");
  }

  const configuredAppUrl = new URL(env.APP_URL);
  const incoming = new URL(origin);
  const allowedOrigins = new Set<string>([
    configuredAppUrl.origin
  ]);
  for (const hostname of [process.env.VERCEL_URL, process.env.VERCEL_PROJECT_PRODUCTION_URL]) {
    if (hostname) allowedOrigins.add(new URL(`https://${hostname}`).origin);
  }

  if (origin !== incoming.origin || !allowedOrigins.has(incoming.origin)) {
    throw new Error("CSRF validation failed.");
  }
}
