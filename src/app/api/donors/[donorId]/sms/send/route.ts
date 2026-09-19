import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { consumeRateLimit, RateLimitError } from "@/server/security/rate-limit";

import { getSessionWithCapability } from "@/server/auth/permissions";
import { queueSmsMessage } from "@/server/data/sms";
import { isTwilioConfigured, sendQueuedSmsMessage } from "@/server/messaging/twilio";
import { assertSameOrigin } from "@/server/security/csrf";

const messageSchema = z.object({
  body: z.string().trim().min(1).max(1000),
  category: z.enum(["GENERAL", "THANK_YOU", "PLEDGE_REMINDER", "EVENT_REMINDER", "CAMPAIGN"]),
  scheduledFor: z.string().datetime().optional().nullable()
});

export async function POST(request: Request, context: { params: Promise<{ donorId: string }> }) {
  await assertSameOrigin();
  const session = await getSessionWithCapability("donors:write");
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!isTwilioConfigured()) {
    return NextResponse.json({ error: "Twilio environment variables have not been configured." }, { status: 503 });
  }

  const parsed = messageSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid message." }, { status: 400 });
  }

  const { donorId } = await context.params;
  const requestHeaders = await headers();
  const ipAddress = requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;

  try {
    await consumeRateLimit({ key: `sms:${session.userId}`, action: "sms_send", maxAttempts: 20, windowSeconds: 900 });
    const scheduledFor = parsed.data.scheduledFor ? new Date(parsed.data.scheduledFor) : null;
    if (scheduledFor) {
      const leadTime = scheduledFor.getTime() - Date.now();
      const minimumLeadTime = 16 * 60 * 1000;
      const maximumLeadTime = 35 * 24 * 60 * 60 * 1000;
      if (leadTime < minimumLeadTime || leadTime > maximumLeadTime) {
        return NextResponse.json(
          { error: "Scheduled texts must be 16 minutes to 35 days in the future." },
          { status: 400 }
        );
      }
    }

    const queued = await queueSmsMessage({
      donorId,
      body: parsed.data.body,
      category: parsed.data.category,
      scheduledFor,
      actorUserId: session.userId,
      ipAddress
    });

    await sendQueuedSmsMessage(queued.messageId);
    return NextResponse.json({ ok: true, scheduled: queued.scheduled });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "The text message could not be sent." },
      { status: error instanceof RateLimitError ? 429 : 400 }
    );
  }
}
