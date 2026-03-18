import { NextResponse } from "next/server";

import { query } from "@/server/db";

export async function GET() {
  try {
    const result = await query<{ server_time: string }>("select now()::text as server_time");
    return NextResponse.json({ ok: true, serverTime: result.rows[0].server_time });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
