import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { AUTH_COOKIE } from "@/server/auth/constants";
import { verifySessionToken } from "@/server/auth/session";

const protectedPrefixes = ["/dashboard", "/donors", "/gifts", "/reports", "/imports", "/users", "/audit-log"];

export async function middleware(request: NextRequest) {
  const response = NextResponse.next();
  response.headers.set("x-middleware-cache", "no-cache");

  if (!protectedPrefixes.some((prefix) => request.nextUrl.pathname.startsWith(prefix))) {
    return response;
  }

  const sessionToken = request.cookies.get(AUTH_COOKIE)?.value;
  if (!sessionToken) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const session = await verifySessionToken(sessionToken);
  if (!session) {
    const redirect = NextResponse.redirect(new URL("/login", request.url));
    redirect.cookies.delete(AUTH_COOKIE);
    return redirect;
  }

  return response;
}

export const config = {
  matcher: ["/dashboard/:path*", "/donors/:path*", "/gifts/:path*", "/reports/:path*", "/imports/:path*", "/users/:path*", "/audit-log/:path*"]
};
