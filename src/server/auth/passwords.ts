import { randomBytes, scryptSync, timingSafeEqual } from "crypto";

export function verifyPassword(password: string, storedHash: string) {
  const [salt, key] = storedHash.split(":");
  if (!salt || !key) {
    return false;
  }

  const incoming = scryptSync(password, salt, 64);
  const saved = Buffer.from(key, "hex");

  if (incoming.length !== saved.length) {
    return false;
  }

  return timingSafeEqual(incoming, saved);
}

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}
