import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";

import { getSessionWithCapability } from "@/server/auth/permissions";
import { saveSmsPreference } from "@/server/data/sms";
import { assertSameOrigin } from "@/server/security/csrf";

const preferenceSchema = z.object({
  phone: z.string().trim().regex(/^\+[1-9]\d{7,14}$/, "Use E.164 format, such as +19045550100."),
  consentStatus: z.enum(["UNKNOWN", "OPTED_IN", "OPTED_OUT"]),
  consentSource: z.string().trim().max(50).optional().nullable(),
  consentNote: z.string().trim().max(1000).optional().nullable()
});

export async function POST(request: Request, context: { params: Promise<{ donorId: string }> }) {
  await assertSameOrigin();
  const session = await getSessionWithCapability("donors:write");
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const parsed = preferenceSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid consent details." }, { status: 400 });
  }

  const { donorId } = await context.params;
  const requestHeaders = await headers();
  const ipAddress = requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;

  try {
    await saveSmsPreference({
    donorId,
    ...parsed.data,
    actorUserId: session.userId,
    ipAddress
    });
  } catch (error) {
    console.error("sms.preference.save_failed", { code: (error as { code?: string })?.code ?? "unknown" });
    return NextResponse.json({ error: "The save could not be confirmed. Refresh and check the saved texting preference before retrying." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
