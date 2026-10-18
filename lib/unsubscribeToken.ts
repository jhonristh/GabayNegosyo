import { createHmac, timingSafeEqual } from "node:crypto";

/** Signed, stateless unsubscribe tokens: HMAC-SHA256 of the user id. Server-only. */
function secret(): string | null {
  return process.env.REMINDER_SECRET || process.env.CRON_SECRET || null;
}

export function signUnsubscribe(userId: string): string | null {
  const s = secret();
  return s ? createHmac("sha256", s).update(`unsub:${userId}`).digest("hex") : null;
}

export function verifyUnsubscribe(userId: string, token: string): boolean {
  const expected = signUnsubscribe(userId);
  if (!expected || !token || token.length !== expected.length) return false;
  try {
    return timingSafeEqual(Buffer.from(expected), Buffer.from(token));
  } catch {
    return false;
  }
}
