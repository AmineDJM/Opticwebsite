import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

/**
 * Session tokens. The raw token is a 256-bit random string sent to the client in an
 * httpOnly cookie; only its SHA-256 hash is stored, so a database leak yields no
 * usable sessions. Lookups hash the presented token and compare.
 */

export const SESSION_COOKIE = "optic_session";
export const CUSTOMER_COOKIE = "optic_customer";
export const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30; // 30 days
export const SESSION_REFRESH_MS = 1000 * 60 * 60 * 24; // rotate lastSeen at most daily

export interface IssuedSession {
  token: string; // give to the client
  tokenHash: string; // store in the database
  expiresAt: Date;
}

export function issueSession(ttlMs: number = SESSION_TTL_MS, now: Date = new Date()): IssuedSession {
  const token = randomBytes(32).toString("base64url");
  return {
    token,
    tokenHash: hashToken(token),
    expiresAt: new Date(now.getTime() + ttlMs),
  };
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function tokensMatch(presentedToken: string, storedHash: string): boolean {
  const a = Buffer.from(hashToken(presentedToken), "hex");
  const b = Buffer.from(storedHash, "hex");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function isExpired(expiresAt: Date, now: Date = new Date()): boolean {
  return expiresAt.getTime() <= now.getTime();
}

export function shouldRefresh(lastSeenAt: Date, now: Date = new Date()): boolean {
  return now.getTime() - lastSeenAt.getTime() > SESSION_REFRESH_MS;
}

/** Cookie options for a secure session cookie. `secure` is disabled in dev over http. */
export function sessionCookieOptions(expiresAt: Date, secure = process.env.NODE_ENV === "production") {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure,
    path: "/",
    expires: expiresAt,
  };
}
