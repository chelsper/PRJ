import { cookies } from "next/headers";

import { AUTH_COOKIE } from "@/src/server/auth/constants";
import { verifySessionToken } from "@/src/server/auth/session";

export async function getCurrentSession() {
  const store = await cookies();
  const token = store.get(AUTH_COOKIE)?.value;

  if (!token) {
    return null;
  }

  return verifySessionToken(token);
}
