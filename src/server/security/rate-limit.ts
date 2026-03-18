import { query } from "@/server/db";

export async function assertRateLimit(input: {
  key: string;
  action: string;
  maxAttempts: number;
  windowSeconds: number;
}) {
  const result = await query<{ allowed: boolean }>(
    `select count(*) < $3 as allowed
     from rate_limit_events
     where limiter_key = $1
       and action = $2
       and created_at >= now() - make_interval(secs => $4)`,
    [input.key, input.action, input.maxAttempts, input.windowSeconds]
  );

  if (!result.rows[0]?.allowed) {
    throw new Error("Rate limit exceeded.");
  }
}

export async function recordRateLimitEvent(input: { key: string; action: string }) {
  await query(
    `insert into rate_limit_events (limiter_key, action)
     values ($1, $2)`,
    [input.key, input.action]
  );
}
