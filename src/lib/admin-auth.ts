import { createHmac, timingSafeEqual } from "node:crypto";

/** Constant-time comparison; false on length mismatch. */
export function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}

/** Compare a submitted password to the configured one. */
export function checkPassword(input: string, expected: string): boolean {
  if (!expected) return false;
  return safeEqual(input, expected);
}

/** Deterministic session token = HMAC-SHA256(secret, "admin"). */
export function sessionToken(secret: string): string {
  return createHmac("sha256", secret).update("admin").digest("hex");
}

/** Constant-time check that a cookie value is a valid session token. */
export function verifySession(
  cookieValue: string | undefined,
  secret: string,
): boolean {
  if (!cookieValue || !secret) return false;
  return safeEqual(cookieValue, sessionToken(secret));
}
