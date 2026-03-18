import { NextResponse } from "next/server";

import { getSessionWithCapability } from "@/server/auth/permissions";
import { listPledgeOptions, type PledgeOptionRow } from "@/server/data/gifts";

export async function GET(request: Request) {
  const session = await getSessionWithCapability("gifts:read");

  if (!session) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const donorId = searchParams.get("donorId")?.trim();

  if (!donorId) {
    return NextResponse.json({ pledges: [] });
  }

  const pledges = await listPledgeOptions(donorId);

  return NextResponse.json({
    pledges: pledges.map((pledge: PledgeOptionRow) => ({
      id: pledge.id,
      giftNumber: pledge.gift_number,
      donorId: pledge.donor_id,
      donorName: pledge.donor_name,
      giftType: pledge.gift_type,
      balanceRemainingCents: pledge.balance_remaining_cents
    }))
  });
}
