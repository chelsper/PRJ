import { headers } from "next/headers";
import { NextResponse } from "next/server";

import { getSessionWithCapability } from "@/server/auth/permissions";
import { markGiftReceiptSent } from "@/server/data/receipts";

export async function POST(
  _request: Request,
  context: { params: Promise<{ giftId: string }> }
) {
  const session = await getSessionWithCapability("gifts:write");

  if (!session) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const requestHeaders = await headers();
  const ipAddress = requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  const { giftId } = await context.params;

  await markGiftReceiptSent({
    giftId,
    actorUserId: session.userId,
    ipAddress
  });

  return NextResponse.json({ ok: true });
}
