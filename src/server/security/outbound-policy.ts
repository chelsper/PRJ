type Environment = Record<string, string | undefined>;

export function assertOutboundSmsAllowed(environment: Environment = process.env) {
  if (environment.OUTBOUND_SMS_DISABLED === "true") {
    throw new Error("Text sending is disabled by the safety switch.");
  }
  // NODE_ENV is also production for Vercel previews: it is not sufficient.
  if (environment.VERCEL_ENV !== "production") {
    throw new Error("Text sending is disabled outside the production deployment.");
  }
}
