import { NextResponse } from "next/server";

import { getSessionWithCapability } from "@/server/auth/permissions";
import { searchDonorLookupRows, type DonorConnectionRow } from "@/server/data/donors";

export async function GET(request: Request) {
  const session = await getSessionWithCapability("donors:read");

  if (!session) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim() ?? "";

  if (query.length < 2) {
    return NextResponse.json({ donors: [] });
  }

  const donors = await searchDonorLookupRows(query);

  return NextResponse.json({
    donors: donors.map((donor: DonorConnectionRow) => ({
      id: donor.id,
      donorNumber: donor.donor_number,
      donorType: donor.donor_type,
      fullName: donor.display_name,
      email: donor.primary_email,
      title: donor.title,
      firstName: donor.first_name,
      middleName: donor.middle_name,
      lastName: donor.last_name,
      primaryPhone: donor.primary_phone
    }))
  });
}
