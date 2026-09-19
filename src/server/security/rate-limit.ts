import { transaction } from "@/server/db";

export class RateLimitError extends Error {
  constructor() { super("Too many requests. Please wait before trying again."); }
}

export async function consumeRateLimit(input: {
  key: string;
  action: string;
  maxAttempts: number;
  windowSeconds: number;
}) {
  await transaction(async client => {
    await client.query("select pg_advisory_xact_lock(hashtextextended($1, 0))", [`rate:${input.action}:${input.key}`]);
    const result = await client.query<{ allowed: boolean }>(
      `select count(*) < $3 as allowed
       from public.rate_limit_events
       where limiter_key = $1
         and action = $2
         and created_at >= now() - make_interval(secs => $4)`,
      [input.key, input.action, input.maxAttempts, input.windowSeconds]
    );

    if (!result.rows[0]?.allowed) {
      throw new RateLimitError();
    }
    await client.query(
      `insert into public.rate_limit_events (limiter_key, action)
       values ($1, $2)`,
      [input.key, input.action]
    );
  });
}
