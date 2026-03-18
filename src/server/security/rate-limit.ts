import { query } from "@/server/db";

function isMissingRateLimitTable(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "42P01"
  );
}

export async function assertRateLimit(input: {
  key: string;
  action: string;
  maxAttempts: number;
  windowSeconds: number;
}) {
  try {
    const result = await query<{ allowed: boolean }>(
      `select count(*) < $3 as allowed
       from public.rate_limit_events
       where limiter_key = $1
         and action = $2
         and created_at >= now() - make_interval(secs => $4)`,
      [input.key, input.action, input.maxAttempts, input.windowSeconds]
    );

    if (!result.rows[0]?.allowed) {
      throw new Error("Rate limit exceeded.");
    }
  } catch (error) {
    if (isMissingRateLimitTable(error)) {
      return;
    }

    throw error;
  }
}

export async function recordRateLimitEvent(input: { key: string; action: string }) {
  try {
    await query(
      `insert into public.rate_limit_events (limiter_key, action)
       values ($1, $2)`,
      [input.key, input.action]
    );
  } catch (error) {
    if (isMissingRateLimitTable(error)) {
      return;
    }

    throw error;
  }
}
